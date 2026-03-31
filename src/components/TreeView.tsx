'use client';

import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ChevronRight, ChevronDown, Folder, File, Trash2, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TreeView() {
  const { metadata, fs, refreshProject } = useProject();

  if (!metadata) return null;

  return (
    <div className="space-y-1">
      {/* 未分類セクション */}
      <div className="group">
        <div className="flex items-center gap-2 px-4 py-2 hover:bg-ink/5 cursor-pointer rounded-lg transition-colors">
          <ChevronDown className="h-4 w-4 text-ink/20 group-hover:text-ink/60" />
          <Folder className="h-4 w-4 text-accent/60" />
          <span className="text-sm font-bold truncate">未分類</span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={refreshProject} className="p-1 hover:bg-ink/10 rounded" title="再スキャン">
              <RefreshCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="ml-6 border-l border-ink/5 pl-2 py-1 space-y-0.5">
          {/* Unclassified files logic here */}
          <p className="text-[10px] text-ink/40 italic px-2">読み込み中...</p>
        </div>
      </div>

      {/* カテゴリセクション */}
      {metadata.categories
        .filter(c => !c.parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(cat => (
          <CategoryItem key={cat.id} category={cat} />
        ))}
    </div>
  );
}

function CategoryItem({ category }: { category: any }) {
  const { metadata } = useProject();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const children = metadata?.categories.filter(c => c.parentId === category.id) || [];
  const docs = metadata?.documents.filter(d => d.categoryId === category.id) || [];

  return (
    <div className="group">
      <div 
        className="flex items-center gap-2 px-4 py-2 hover:bg-ink/5 cursor-pointer rounded-lg transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-ink/20" /> : <ChevronDown className="h-4 w-4 text-ink/20" />}
        <Folder className="h-4 w-4 text-ink/40" />
        <span className="text-sm font-bold truncate">{category.name}</span>
        <span className="text-[10px] bg-ink/5 px-1.5 rounded-full text-ink/30 font-mono">{docs.length}</span>
      </div>
      
      {!isCollapsed && (
        <div className="ml-6 border-l border-ink/5 pl-2 py-1 space-y-0.5">
          {children.map(child => (
            <CategoryItem key={child.id} category={child} />
          ))}
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-ink/5 rounded-md cursor-pointer transition-colors text-sm text-ink/70">
              <File className="h-3.5 w-3.5 shrink-0 text-ink/20" />
              <span className="truncate">{doc.documentName || doc.fileName}</span>
            </div>
          ))}
          {docs.length === 0 && children.length === 0 && (
             <p className="text-[10px] text-ink/20 italic px-2">空のフォルダ</p>
          )}
        </div>
      )}
    </div>
  );
}
