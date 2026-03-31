import { PDFDocument } from 'pdf-lib';

/**
 * PdfService - PDF ファイルの操作（サムネイル生成、結合）
 */
export class PdfService {
  private static pdfjs: any = null;

  /**
   * pdf.js を動的に初期化する（Client-side only）。
   */
  private static async initPdfjs() {
    if (this.pdfjs) return this.pdfjs;
    if (typeof window === 'undefined') return null;
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    this.pdfjs = pdfjs;
    return pdfjs;
  }

  /**
   * PDF の第1ページをサムネイル (dataURL) として生成する。
   */
  static async generateThumbnail(url: string, scale: number = 0.5): Promise<string | null> {
    const pdfjs = await this.initPdfjs();
    if (!pdfjs) return null;
    
    try {
      const loadingTask = pdfjs.getDocument(url);

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error('[PdfService] generateThumbnail failed', e);
      return null;
    }
  }

  /**
   * 複数の PDF ファイルを結合する。
   */
  static async mergePdfs(pdfUrls: string[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    
    for (const url of pdfUrls) {
      const resp = await fetch(url);
      const bytes = await resp.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    return await mergedPdf.save();
  }
}
