'use client';

import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ChevronRight, ChevronDown, Folder, File, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function TreeView() {
  const { 
    metadata, 
    fs, 
    refreshProject, 
    reorderCategories, 
    reorderDocuments, 
    moveDocument, 
    importFileHandle,
    unclassifiedFiles, 
    setSelectedDocId, 
    selectedDocId 
  } = useProject();
  
  const [isUnclassifiedCollapsed, setIsUnclassifiedCollapsed] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!metadata) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    if (activeId.startsWith('cat:') && overId.startsWith('cat:')) {
      reorderCategories(activeId.replace('cat:', ''), overId.replace('cat:', ''));
    } else if (activeId.startsWith('doc:') && overId.startsWith('doc:')) {
      reorderDocuments(activeId.replace('doc:', ''), overId.replace('doc:', ''));
    } else if (activeId.startsWith('doc:') && overId.startsWith('cat:')) {
      moveDocument(activeId.replace('doc:', ''), overId.replace('cat:', ''));
    }
  };

  const handleNativeDrop = async (e: React.DragEvent, targetCatId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      if (item.kind === 'file') {
        const handle = await (item as any).getAsFileSystemHandle();
        if (handle && handle.kind === 'file') {
          await importFileHandle(handle, targetCatId);
        }
      }
    }
  };

  const rootCategories = metadata.categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-1">
        {/* 未分類セクション */}
        <div 
          className="group"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleNativeDrop(e, null)}
        >
          <div 
            className="flex items-center gap-2 px-4 py-2 hover:bg-ink/5 cursor-pointer rounded-lg transition-colors border border-transparent"
            onClick={() => setIsUnclassifiedCollapsed(!isUnclassifiedCollapsed)}
          >
            {isUnclassifiedCollapsed ? <ChevronRight className="h-4 w-4 text-ink/20 group-hover:text-ink/60" /> : <ChevronDown className="h-4 w-4 text-ink/20 group-hover:text-ink/60" />}
            <Folder className="h-4 w-4 text-accent/60" />
            <span className="text-sm font-bold truncate">未分類</span>
            <span className="text-[9px] bg-accent/5 px-1.5 rounded-full text-accent/60 font-mono border border-accent/10">
              {unclassifiedFiles.length}
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); refreshProject(); }} 
                className="p-1 hover:bg-ink/10 rounded" title="再スキャン"
              >
                <RefreshCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
          {!isUnclassifiedCollapsed && (
            <div className="ml-6 border-l border-ink/5 pl-2 py-1 space-y-0.5">
              {unclassifiedFiles.map((fileName) => (
                <div
                  key={fileName}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 hover:bg-ink/5 rounded-md cursor-pointer transition-colors text-sm",
                    selectedDocId === fileName ? "bg-accent/10 text-accent font-bold" : "text-ink/70"
                  )}
                  onClick={() => setSelectedDocId(fileName)}
                >
                  <File className="h-3.5 w-3.5 shrink-0 text-ink/20" />
                  <span className="truncate">{fileName}</span>
                </div>
              ))}
              {unclassifiedFiles.length === 0 && (
                <p className="text-[10px] text-ink/20 italic px-2">ファイルはありません</p>
              )}
            </div>
          )}
        </div>

        {/* カテゴリセクション */}
        <SortableContext items={rootCategories.map(c => `cat:${c.id}`)} strategy={verticalListSortingStrategy}>
          {rootCategories.map((cat) => (
            <CategoryItem key={cat.id} category={cat} onNativeDrop={handleNativeDrop} />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}

function CategoryItem({ category, onNativeDrop }: { category: any, onNativeDrop: (e: React.DragEvent, id: string) => void }) {
  const { metadata, setSelectedDocId, selectedDocId } = useProject();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `cat:${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const childCategories = metadata?.categories
    .filter((c) => c.parentId === category.id)
    .sort((a, b) => a.displayOrder - b.displayOrder) || [];
  const docs = metadata?.documents
    .filter((d) => d.categoryId === category.id)
    .sort((a, b) => a.sortOrder - b.sortOrder) || [];

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 hover:bg-ink/5 cursor-pointer rounded-lg transition-colors border border-transparent",
          isDragging && "bg-ink/5 shadow-sm",
          isOver && !isDragging && "border-accent/40 bg-accent/5"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => onNativeDrop(e, category.id)}
        {...attributes}
        {...listeners}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-ink/20" /> : <ChevronDown className="h-4 w-4 text-ink/20" />}
        <Folder className="h-4 w-4 text-ink/40" />
        <span className="text-sm font-bold truncate">{category.name}</span>
        <span className="text-[9px] bg-ink/5 px-1.5 rounded-full text-ink/30 font-mono border border-ink/5">
          {docs.length}
        </span>
      </div>

      {!isCollapsed && (
        <div className="ml-6 border-l border-ink/5 pl-2 py-1 space-y-0.5">
          <SortableContext items={childCategories.map(c => `cat:${c.id}`)} strategy={verticalListSortingStrategy}>
            {childCategories.map((child) => (
              <CategoryItem key={child.id} category={child} onNativeDrop={onNativeDrop} />
            ))}
          </SortableContext>

          <SortableContext items={docs.map(d => `doc:${d.id}`)} strategy={verticalListSortingStrategy}>
            {docs.map((doc) => (
              <DocumentItem key={doc.id} doc={doc} isSelected={selectedDocId === doc.id} onSelect={() => setSelectedDocId(doc.id)} />
            ))}
          </SortableContext>
          
          {docs.length === 0 && childCategories.length === 0 && (
            <p className="text-[10px] text-ink/20 italic px-2">空のフォルダ</p>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentItem({ doc, isSelected, onSelect }: { doc: any; isSelected: boolean; onSelect: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `doc:${doc.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 hover:bg-ink/5 rounded-md cursor-pointer transition-colors text-sm",
        isSelected ? "bg-accent/10 text-accent font-bold" : "text-ink/70",
        isDragging && "bg-paper shadow-lg border border-ink/10"
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-ink/20" />
      <span className="truncate">{doc.documentName || doc.fileName}</span>
    </div>
  );
}
