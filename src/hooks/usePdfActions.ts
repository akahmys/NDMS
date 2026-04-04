import { useCallback } from 'react';
import { ProjectMetadata, DocumentMetadata } from '@/types/project';
import { ProjectService } from '@/services/projectService';
import { FileSystemService } from '@/services/fileSystemService';
import { PdfService } from '@/services/pdfService';
import { PROJECT_CONSTANTS } from '@/lib/constants';

export function usePdfActions(
  fs: FileSystemService,
  metadata: ProjectMetadata | null,
  refreshProject: () => Promise<void>,
  syncMetadata: (metadata: ProjectMetadata | null) => void
) {
  const mergeDocuments = useCallback(async (docIds: string[], fileName: string) => {
    if (!metadata || !fs.directoryHandle) return;
    
    const urls: string[] = [];
    const docsToMerge: (DocumentMetadata | { id: string; fileName: string; categoryId: string })[] = [];

    for (const id of docIds) {
      if (id.startsWith('unclass:')) {
        const fileName = id.replace('unclass:', '');
        const url = await fs.readFileAsUrl(fileName);
        if (url) {
          urls.push(url);
          docsToMerge.push({ id, fileName, categoryId: 'unclassified' });
        }
      } else {
        const doc = metadata.documents.find(d => d.id === id);
        if (doc) {
          const category = metadata.categories.find(c => c.id === doc.categoryId);
          const path = category ? `${category.path}/${doc.fileName}` : doc.fileName;
          const url = await fs.readFileAsUrl(path);
          if (url) {
            urls.push(url);
            docsToMerge.push(doc);
          }
        }
      }
    }

    if (urls.length === 0) return;

    try {
      const mergedBytes = await PdfService.mergePdfs(urls);
      
      // ルートディレクトリ（未分類）に保存
      await fs.writeFile(fileName, mergedBytes.buffer as ArrayBuffer);
      
      const svc = new ProjectService(fs, metadata);
      const updatedMetadata = await svc.importDocument({ name: fileName } as FileSystemFileHandle, null);
      
      syncMetadata(updatedMetadata);
      await refreshProject();

      if (confirm("結合が完了しました。元のファイルを削除しますか？")) {
        const remainingDocIds: string[] = [];
        for (const item of docsToMerge) {
          if (item.id.startsWith('unclass:')) {
            await fs.removeEntry(item.fileName);
          } else {
            const doc = item as DocumentMetadata;
            const category = metadata.categories.find(c => c.id === doc.categoryId);
            const path = category ? `${category.path}/${doc.fileName}` : doc.fileName;
            await fs.removeEntry(path);
            remainingDocIds.push(doc.id);
          }
        }
        
        if (remainingDocIds.length > 0) {
          const finalMetadata = {
            ...updatedMetadata,
            documents: updatedMetadata.documents.filter(d => !remainingDocIds.includes(d.id))
          };
          syncMetadata(finalMetadata);
          const saveSvc = new ProjectService(fs, finalMetadata);
          await saveSvc.saveMetadata();
        }
        await refreshProject();
      }
    } catch (e) {
      console.error('[usePdfActions] Merge failed:', e);
      alert(e instanceof Error ? e.message : '結合に失敗しました。');
    }
  }, [metadata, fs, refreshProject, syncMetadata]);

  return {
    mergeDocuments,
  };
}
