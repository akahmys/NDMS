import React from 'react';
import { NodeRendererProps } from 'react-arborist';
import { ChevronRight, ChevronDown, Folder, File, Trash2, Wand2, HelpCircle } from 'lucide-react';
import { TreeData } from '@/types/tree';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/projectContext';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Plus, Type } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const TreeNodeRenderer = ({
  node,
  style,
  dragHandle,
}: NodeRendererProps<TreeData>) => {
  const { 
    deleteCategory, 
    deleteDocument, 
    createCategory,
    renameCategory,
    renameDocument
  } = useProject();
  
  const isCategory = node.data.type === 'category';
  const isMergedRoot = node.data.type === 'merged-root';
  const isUnclassifiedRoot = node.data.type === 'unclassified-root';
  const isFolder = node.isInternal;

  const Icon = isMergedRoot ? Wand2 : (isUnclassifiedRoot ? HelpCircle : (isFolder ? Folder : File));

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`「${node.data.name}」を削除してもよろしいですか？`);
    if (!confirmed) return;

    if (isCategory) {
      await deleteCategory(node.data.id);
    } else {
      await deleteDocument(node.data.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          style={style}
          ref={dragHandle}
          className={cn(
            "group flex items-center gap-1.5 px-2 py-0.5 cursor-pointer rounded-sm transition-all outline-none relative select-none h-7",
            node.isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/40 text-muted-foreground/90 hover:text-foreground",
            node.isFocused && "ring-1 ring-inset ring-primary/40 z-10"
          )}
          onClick={(e) => node.handleClick(e)}
          onDoubleClick={() => node.edit()}
        >
          {/* 展開/折りたたみ矢印 */}
          <div 
            className={cn(
              "p-1 -m-1 hover:bg-muted/60 rounded-sm transition-colors text-muted-foreground/60 hover:text-foreground w-5 h-5 flex items-center justify-center",
              !isFolder && "invisible"
            )}
            onClick={(e) => {
                e.stopPropagation();
                node.toggle();
            }}
          >
            {isFolder && (
              node.isOpen ? 
                <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : 
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
          </div>

          {/* アイコン */}
          <Icon className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            node.isSelected ? "text-primary" : "text-muted-foreground/70"
          )} />

          {/* テキスト / 編集入力 */}
          {node.isEditing ? (
            <input
              autoFocus
              className="flex-1 bg-background text-[11px] outline-none ring-1 ring-inset ring-primary/50 rounded-sm px-1 h-5"
              defaultValue={node.data.name}
              onFocus={(e) => e.target.select()}
              onBlur={() => node.reset()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  node.submit(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  node.reset();
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="text-[11.5px] truncate tracking-tight">
                {node.data.name}
              </span>
              {isFolder && node.data.children && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors cursor-help",
                      node.isSelected 
                        ? "bg-primary-foreground/20 text-accent-foreground" 
                        : "bg-muted/60 text-muted-foreground group-hover:bg-muted/80"
                    )}>
                      {node.data.children.length}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] py-1 px-2">
                    アイテム数: {node.data.children.length}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      {!isMergedRoot && !isUnclassifiedRoot && (
        <ContextMenuContent className="w-56">
          {isCategory && (
            <>
              <ContextMenuItem onClick={() => createCategory("新規サブフォルダ", node.data.id)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>新規サブフォルダを作成</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => node.edit()}>
            <Type className="mr-2 h-4 w-4" />
            <span>名前を変更</span>
          </ContextMenuItem>
          <ContextMenuItem 
            variant="destructive" 
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>削除</span>
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
};
