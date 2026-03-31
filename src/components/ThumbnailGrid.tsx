'use client';

import React, { useEffect, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { PdfService } from '@/services/PdfService';
import { LayoutGrid, FileText, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function ThumbnailGrid() {
  const { metadata, fs } = useProject();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'unclassified' | null>(null);
  
  const docs = metadata?.documents.filter(d => d.categoryId === selectedCategoryId) || [];

  if (!metadata) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#FDFCF8]">
      <div className="h-12 border-b border-ink/5 flex items-center justify-between px-6 shrink-0 bg-paper/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2 text-sm font-bold opacity-40">
           <LayoutGrid className="h-4 w-4 text-ink" />
           <span>{selectedCategoryId === 'unclassified' ? '未分類' : (metadata.categories.find(c => c.id === selectedCategoryId)?.name || 'すべての書類')}</span>
           <span className="text-tiny font-mono text-ink/30 bg-ink/5 px-1.5 rounded-full border border-ink/5 tracking-normal ml-2">{docs.length}</span>
        </div>
      </div>
      
      <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {docs.map(doc => (
          <ThumbnailCard key={doc.id} doc={doc} />
        ))}
        {docs.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20">
             <LayoutGrid className="h-16 w-16 mb-4" />
             <p className="text-sm font-bold uppercase tracking-widest">書類がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThumbnailCard({ doc }: { doc: any }) {
  const { fs } = useProject();
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    const loadThumb = async () => {
      url = await fs.readFileAsUrl(`${doc.categoryId}/${doc.fileName}`);
      if (url) {
        const dataUrl = await PdfService.generateThumbnail(url);
        setThumb(dataUrl);
      }
    };
    loadThumb();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, fs]);

  return (
    <div className="group cursor-pointer space-y-3">
      <div className="aspect-[3/4] bg-white rounded-2xl flex items-center justify-center border border-ink/10 overflow-hidden relative shadow-sm group-hover:border-accent/40 transition-all group-hover:-translate-y-1">
        {thumb ? (
          <Image src={thumb} alt={doc.fileName} fill className="object-cover transition-opacity duration-700" />
        ) : (
          <FileText className="h-12 w-12 text-ink/10" />
        )}
        <div className="absolute inset-0 bg-ink/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="bg-ink/80 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black text-white flex items-center gap-1.5 shadow-xl scale-90 group-hover:scale-100 transition-transform">
              <Maximize2 className="h-3 w-3" />
              PREVIEW
           </div>
        </div>
      </div>
      <p className="text-[10px] font-bold text-ink truncate px-1 group-hover:text-accent transition-colors" title={doc.documentName || doc.fileName}>
        {doc.documentName || doc.fileName}
      </p>
    </div>
  );
}
