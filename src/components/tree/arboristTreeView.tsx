import React, { useMemo, useRef, useCallback } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import useMeasure from 'react-use-measure';
import { useProject } from '@/contexts/projectContext';
import { convertMetadataToTreeData } from '@/lib/treeUtils';
import { TreeNodeRenderer } from './treeNodeRenderer';
import { TreeData } from '@/types/tree';
import { PROJECT_CONSTANTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderPlus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function ArboristTreeView() {
  const {
    metadata,
    unclassifiedFiles,
    selectedDocIds,
    selectedCategoryId,
    setSelectedDocIds,
    setSelectedCategoryId,
    createCategory,
    renameCategory,
    renameDocument,
    reorderMixed,
    expandedIds,
    toggleExpanded
  } = useProject();

  const [containerRef, { width, height }] = useMeasure();
  const treeRef = useRef<TreeApi<TreeData>>(null);

  // データを Arborist 用に変換
  const treeData = useMemo(() => {
    if (!metadata) return [];
    return convertMetadataToTreeData(metadata, unclassifiedFiles);
  }, [metadata, unclassifiedFiles]);

  // 外部（プロジェクトコンテキスト）からの選択状態の同期
  React.useEffect(() => {
    if (!treeRef.current) return;
    const tree = treeRef.current;
    
    const targetIds = selectedCategoryId ? [selectedCategoryId] : selectedDocIds;
    const currentSelectedIds = tree.selectedNodes.map(n => n.id);
    
    if (JSON.stringify(targetIds.sort()) !== JSON.stringify(currentSelectedIds.sort())) {
        tree.deselectAll();
        targetIds.forEach(id => {
            const node = tree.get(id);
            if (node) node.selectMulti();
        });
    }
  }, [selectedDocIds, selectedCategoryId]);

  // ハンドラ：移動・並び替え
  const handleMove = async (args: {
    dragIds: string[];
    parentId: string | null;
    index: number;
  }) => {
    const { dragIds, parentId, index } = args;
    if (!metadata) return;

    for (let i = 0; i < dragIds.length; i++) {
        await reorderMixed(dragIds[i], parentId, index + i);
    }
  };

  // ハンドラ：リネーム
  const handleRename = async ({ id, name, node }: { id: string; name: string; node: any }) => {
    if (node.data.type === 'category') {
        await renameCategory(id, name);
    } else if (node.data.type === 'document') {
        await renameDocument(id, name);
    }
  };

  // ハンドラ：選択変更（同一階層制限の実装）
  const handleSelect = (nodes: any[]) => {
    if (nodes.length === 0) {
      if (selectedDocIds.length > 0) setSelectedDocIds([]);
      if (selectedCategoryId !== null) setSelectedCategoryId(null);
      return;
    }

    // 複数選択された場合、最初のノードの親を基準にする
    const firstNode = nodes[0];
    const parentId = firstNode.parent?.id;

    // 同一階層のノードのみを抽出
    const validNodes = nodes.filter(n => n.parent?.id === parentId);

    // 制限に抵触する場合、Arborist の内部選択状態を補正
    if (validNodes.length !== nodes.length && treeRef.current) {
        const tree = treeRef.current;
        nodes.forEach(n => {
            if (n.parent?.id !== parentId) n.deselect();
        });
    }

    const docIds = validNodes.filter(n => n.data.type === 'document').map(n => n.data.id);
    const catIds = validNodes.filter(n => n.data.type === 'category').map(n => n.data.id);

    if (catIds.length > 0) {
        if (selectedCategoryId !== catIds[0]) {
            setSelectedCategoryId(catIds[0]);
            setSelectedDocIds([]);
        }
    } else {
        if (JSON.stringify(docIds.sort()) !== JSON.stringify([...selectedDocIds].sort())) {
            setSelectedDocIds(docIds);
            setSelectedCategoryId(null);
        }
    }
  };

  // ハンドラ：新規作成
  const handleCreate = async ({ parentId }: { parentId: string | null }) => {
    const actualParentId = parentId === 'unclassified-root' ? null : parentId;
    const newId = await createCategory("新規フォルダ", actualParentId);
    return newId ? { id: newId } : null;
  };

  // カスタムドロップインジケーター（基本色に合わせる）
  const renderCursor = useCallback((props: any) => (
    <div
      style={{
        position: 'absolute',
        top: props.top - 2,
        left: props.left,
        right: 0,
        height: 2,
        backgroundColor: 'var(--primary)',
        borderRadius: 1,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  ), []);

  if (!metadata) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      <ContextMenu>
        <ContextMenuTrigger className="flex-1 min-h-0">
          <div ref={containerRef} className="h-full outline-none p-1">
            <Tree
              ref={treeRef}
              data={treeData}
              width={width ? width - 8 : 300}
              height={height || 600}
              indent={16}
              rowHeight={28}
              paddingTop={4}
              onMove={handleMove}
              onRename={handleRename}
              onSelect={handleSelect}
              onCreate={handleCreate}
              renderCursor={renderCursor}
              initialOpenState={expandedIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})}
              onToggle={(id) => {
                  toggleExpanded(id);
              }}
            >
              {TreeNodeRenderer}
            </Tree>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => createCategory("新規フォルダ", null)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>新規フォルダを作成</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
