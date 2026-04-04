import { useCallback } from 'react';
import { ProjectMetadata } from '@/types/project';
import { ProjectService } from '@/services/projectService';
import { FileSystemService } from '@/services/fileSystemService';

export function useCategoryActions(
  fs: FileSystemService,
  metadataRef: React.MutableRefObject<ProjectMetadata | null>,
  syncMetadata: (metadata: ProjectMetadata | null) => void,
  onError?: (msg: string) => void
) {
  const reorderCategories = useCallback(async (activeId: string, overId: string, newParentId?: string | null, position: 'before' | 'after' = 'before') => {
    const curr = metadataRef.current;
    if (!curr) return;

    try {
      let snap = { ...curr, categories: [...curr.categories] };
      const activeIdx = snap.categories.findIndex(c => c.id === activeId);
      const overIdx = snap.categories.findIndex(c => c.id === overId);
      
      if (activeIdx === -1 || overIdx === -1) return;

      const activeCat = snap.categories[activeIdx];
      const overCat = snap.categories[overIdx];
      const resolvedParentId = newParentId !== undefined ? newParentId : overCat.parentId;

      // 親が変わる場合は物理移動が必要
      if (activeCat.parentId !== resolvedParentId) {
        const svc = new ProjectService(fs, curr);
        const nextMetadata = await svc.moveCategory(activeId, resolvedParentId);
        snap = { ...nextMetadata, categories: [...nextMetadata.categories] };
      }

      // 並び替えの実行
      const currentActiveIdx = snap.categories.findIndex(c => c.id === activeId);
      const [moved] = snap.categories.splice(currentActiveIdx, 1);
      const currentOverIdx = snap.categories.findIndex(c => c.id === overId);
      const targetIdx = position === 'before' ? currentOverIdx : currentOverIdx + 1;
      
      snap.categories.splice(targetIdx, 0, moved);
      snap.categories.forEach((cat, index) => { cat.displayOrder = index; });
      
      syncMetadata(snap);
      const finalSvc = new ProjectService(fs, snap);
      await finalSvc.saveMetadata();
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'フォルダの移動に失敗しました。');
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const moveCategory = useCallback(async (catId: string, targetParentId: string | null) => {
    const curr = metadataRef.current;
    if (!curr) return false;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.moveCategory(catId, targetParentId);
      syncMetadata(nextMetadata);
      return true;
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'フォルダの移動に失敗しました。');
      return false;
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const createCategory = useCallback(async (name: string, parentId: string | null = null) => {
    const curr = metadataRef.current;
    if (!curr) return null;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.createCategory(name, parentId);
      syncMetadata(nextMetadata);
      
      // 作成された ID を特定（最後に追加されたもの）
      return nextMetadata.categories[nextMetadata.categories.length - 1].id;
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'フォルダの作成に失敗しました。');
      return null;
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const renameCategory = useCallback(async (catId: string, newName: string) => {
    const curr = metadataRef.current;
    if (!curr) return false;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.renameCategory(catId, newName);
      syncMetadata(nextMetadata);
      return true;
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'フォルダ名の変更に失敗しました。');
      return false;
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const deleteCategory = useCallback(async (catId: string) => {
    const curr = metadataRef.current;
    if (!curr) return false;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.deleteCategory(catId);
      syncMetadata(nextMetadata);
      return true;
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'フォルダの削除に失敗しました。');
      return false;
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  return {
    reorderCategories,
    moveCategory,
    createCategory,
    renameCategory,
    deleteCategory,
  };
}
