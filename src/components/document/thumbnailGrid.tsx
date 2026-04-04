'use client';

import React from 'react';
import { useProject } from '@/contexts/projectContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText as FileIcon, Move as MoveIcon, Combine, FolderOpen,
  Edit, ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { DocumentMetadata } from '@/types/project';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const SortableThumbnailItem = ({ doc, isSelected, onSelect, onPreview }: {
  doc: DocumentMetadata;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onPreview: (doc: DocumentMetadata) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `grid-doc:${doc.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "aspect-[3/4] bg-secondary/50 rounded-lg border border-border overflow-hidden flex flex-col group relative transition-all cursor-pointer shadow-sm hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary/10 shadow-lg bg-primary/5",
        isDragging && "opacity-50 scale-95 shadow-xl"
      )}
      onClick={onSelect}
      onDoubleClick={() => onPreview(doc)}
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
         <Checkbox 
           checked={isSelected} 
           className="border-border data-[state=checked]:bg-primary" 
           onCheckedChange={() => {}} // Controlled by div click for now
         />
      </div>

      <div className="flex-1 flex items-center justify-center relative bg-secondary/30 pointer-events-none">
        <FileIcon className={cn("h-16 w-16 transition-all duration-300 group-hover:scale-110", isSelected ? "text-primary" : "text-muted-foreground/30")} />
        {doc.fileName.endsWith('.pdf') && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-background/80 transition-all">
             <Button variant="outline" size="sm" className="bg-primary text-primary-foreground border-none font-bold text-[10px] h-7 px-4 rounded-full shadow-md">
               PREVIEW
             </Button>
          </div>
        )}
      </div>
      <div className="p-3 bg-background border-t border-border">
        <p className="text-[11px] font-bold truncate text-foreground leading-tight mb-1">{doc.documentName || doc.fileName}</p>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground/60 font-mono tracking-tighter">{doc.date || '---'}</span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 hover:bg-secondary rounded-sm transition-colors">
                  <Edit className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] py-1 px-2">名前変更</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 hover:bg-secondary rounded-sm transition-colors">
                  <ExternalLinkIcon className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] py-1 px-2">プレビュー</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ThumbnailGrid() {
  const { 
    metadata, 
    selectedDocIds: treeSelectedDocIds, 
    selectedCategoryId,
    unclassifiedFiles,
    moveDocuments,
    mergeDocuments,
    refreshProject
  } = useProject();
  
  const [localSelectedDocIds, setLocalSelectedDocIds] = React.useState<string[]>([]);
  const [displayDocs, setDisplayDocs] = React.useState<DocumentMetadata[]>([]);
  const [previewDoc, setPreviewDoc] = React.useState<DocumentMetadata | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = React.useState(false);
  const [targetCategory, setTargetCategory] = React.useState<string | null>(null);
  const [isMerging, setIsMerging] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ツリーの選択状態に基づいて表示するドキュメントを初期化
  React.useEffect(() => {
    if (!metadata) return;

    let docs: DocumentMetadata[] = [];

    // 1. ツリーでファイルが選択されている場合（単一または複数）
    if (treeSelectedDocIds.length > 0) {
      docs = metadata.documents.filter((d: DocumentMetadata) => treeSelectedDocIds.includes(d.id));
      // 未分類ファイルも考慮
      if (docs.length === 0 && selectedCategoryId === 'unclassified') {
        docs = unclassifiedFiles
          .filter((name: string) => treeSelectedDocIds.includes(name))
          .map((name: string) => ({
            id: name,
            fileName: name,
            documentName: name,
            categoryId: 'unclassified',
            sortOrder: 0,
            date: ''
          }));
      }
    } 
    // 2. ツリーでフォルダが選択されている場合
    else if (selectedCategoryId) {
      if (selectedCategoryId === 'unclassified') {
        docs = unclassifiedFiles.map((name: string) => ({
          id: name,
          fileName: name,
          documentName: name,
          categoryId: 'unclassified',
          sortOrder: 0,
          date: ''
        }));
      } else {
        docs = metadata.documents
          .filter((d: DocumentMetadata) => d.categoryId === selectedCategoryId)
          .sort((a: DocumentMetadata, b: DocumentMetadata) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }

    setDisplayDocs(docs);
    setLocalSelectedDocIds([]); // 表示対象が変わったらグリッド内の選択もリセット
  }, [selectedCategoryId, treeSelectedDocIds, metadata, unclassifiedFiles]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = displayDocs.findIndex((d: DocumentMetadata) => `grid-doc:${d.id}` === active.id);
      const newIndex = displayDocs.findIndex((d: DocumentMetadata) => `grid-doc:${d.id}` === over.id);
      setDisplayDocs(arrayMove(displayDocs, oldIndex, newIndex));
    }
  };

  const onSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let next: string[];
    if (e.shiftKey && localSelectedDocIds.length > 0) {
      // 範囲選択（簡易実装）
      const lastId = localSelectedDocIds[localSelectedDocIds.length - 1];
      const lastIdx = displayDocs.findIndex((d: DocumentMetadata) => d.id === lastId);
      const currentIdx = displayDocs.findIndex((d: DocumentMetadata) => d.id === id);
      const start = Math.min(lastIdx, currentIdx);
      const end = Math.max(lastIdx, currentIdx);
      const selectedRange = displayDocs.slice(start, end + 1).map((d: DocumentMetadata) => d.id);
      next = Array.from(new Set([...localSelectedDocIds, ...selectedRange]));
    } else if (e.metaKey || e.ctrlKey) {
      // 個別追加
      next = localSelectedDocIds.includes(id) 
        ? localSelectedDocIds.filter((i: string) => i !== id) 
        : [...localSelectedDocIds, id];
    } else {
      // 単一選択
      next = [id];
    }
    setLocalSelectedDocIds(next);
  };

  const handleMerge = async () => {
    if (localSelectedDocIds.length < 2) return;
    setIsMerging(true);
    const fileName = `merged_${Date.now()}.pdf`;
    try {
      // 並び順は displayDocs に従う
      const sortedSelectedIds = displayDocs
        .filter((d: DocumentMetadata) => localSelectedDocIds.includes(d.id))
        .map((d: DocumentMetadata) => d.id);
        
      await mergeDocuments(sortedSelectedIds, fileName);
      setLocalSelectedDocIds([]);
    } finally {
      setIsMerging(false);
    }
  };

  const handleMove = async () => {
    if (targetCategory && localSelectedDocIds.length > 0) {
      await moveDocuments(localSelectedDocIds, targetCategory);
      setIsMoveDialogOpen(false);
      setLocalSelectedDocIds([]);
    }
  };

  if (!metadata) return null;

  return (
    <div className="p-6 space-y-6 min-h-full bg-background flex flex-col">
      {/* ツールバー：移動と結合のみを残す。日本語化。 */}
      <div className="flex items-center justify-between gap-4 bg-background p-4 rounded-xl border border-border shadow-sm shrink-0">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            {selectedCategoryId === 'unclassified' ? '未分類' : (metadata.categories.find(c => c.id === selectedCategoryId)?.name || '選択中')}
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium opacity-50">{displayDocs.length} 件の書類</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 bg-background border-border text-foreground hover:bg-secondary font-bold text-[11px] rounded-md px-4"
                      disabled={localSelectedDocIds.length === 0}
                    />
                  }
                >
                  <MoveIcon className="mr-2 h-3.5 w-3.5" /> 移動
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>書類の移動</DialogTitle>
                    <DialogDescription>{localSelectedDocIds.length} 件の書類を移動します。</DialogDescription>
                  </DialogHeader>
                  <div className="py-6">
                    <Select onValueChange={setTargetCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="移動先フォルダを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {metadata.categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleMove}>移動を実行</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TooltipTrigger>
            <TooltipContent side="top">選択した書類を別フォルダへ移動</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 bg-background border-border text-foreground hover:bg-secondary font-bold text-[11px] rounded-md px-4" 
                disabled={localSelectedDocIds.length < 2 || isMerging} 
                onClick={handleMerge}
              >
                <Combine className="h-3.5 w-3.5 mr-2" /> {isMerging ? '結合中...' : '結合'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">選択したPDFを一つに統合</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <div className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-1",
          displayDocs.length === 0 && "flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-xl"
        )}>
          {displayDocs.length === 0 ? (
            <div className="text-center space-y-2 opacity-30">
              <FolderOpen className="h-10 w-10 mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">表示する書類がありません</p>
            </div>
          ) : (
            <SortableContext items={displayDocs.map(d => `grid-doc:${d.id}`)} strategy={rectSortingStrategy}>
              {displayDocs.map((doc) => (
                <SortableThumbnailItem 
                  key={doc.id} 
                  doc={doc} 
                  isSelected={localSelectedDocIds.includes(doc.id)}
                  onSelect={(e) => onSelect(doc.id, e)}
                  onPreview={setPreviewDoc}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </DndContext>

      {previewDoc && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex flex-col p-8 animate-in fade-in" onClick={() => setPreviewDoc(null)}>
          <div className="max-w-4xl w-full mx-auto flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center bg-background p-6 rounded-xl border border-border shadow-2xl">
              <h3 className="text-xl font-black tracking-tight text-primary">{previewDoc.documentName || previewDoc.fileName}</h3>
              <Button variant="ghost" className="text-primary hover:bg-secondary rounded-full h-10 w-10 p-0" onClick={() => setPreviewDoc(null)}>✕</Button>
            </div>
            <div className="flex-1 bg-secondary/20 rounded-xl border border-border border-dashed flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-background rounded-2xl flex items-center justify-center shadow-inner border border-border mx-auto">
                   <FileIcon className="h-10 w-10 text-primary opacity-20" />
                </div>
                <p className="text-[10px] text-muted-foreground font-black uppercase opacity-40">プレビュー準備中</p>
                <Button className="bg-primary text-primary-foreground font-bold px-12 rounded-full h-12 shadow-xl hover:-translate-y-1 transition-all">PDF を開く</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
