import { useState, useCallback, useRef } from 'react';
import { ProjectMetadata, DocumentMetadata } from '@/types/project';
import { ProjectService } from '@/services/projectService';
import { FileSystemService } from '@/services/fileSystemService';
import { useCategoryActions } from './useCategoryActions';
import { useDocumentActions } from './useDocumentActions';
import { PROJECT_CONSTANTS } from '@/lib/constants';
import { Utils } from '@/lib/utils';

export function useMetadata(fs: FileSystemService, onError?: (msg: string) => void) {
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const metadataRef = useRef<ProjectMetadata | null>(null);
  const [unclassifiedFiles, setUnclassifiedFiles] = useState<string[]>([]);

  // 同期用ヘルパー: ref と state を同時に更新
  const syncMetadata = useCallback((next: ProjectMetadata | null) => {
    metadataRef.current = next;
    setMetadata(next);
  }, []);

  const refreshProject = useCallback(async () => {
    if (!fs.directoryHandle) return;
    try {
      const projectService = new ProjectService(fs);
      await projectService.init();
      
      // 案A: 物理構造との自動同期・インポート
      const { metadata: syncedMetadata } = await projectService.syncWithPhysical();
      syncMetadata(syncedMetadata);

      // 未分類ファイルの取得 (念のため残すが、基本的には syncWithPhysical で登録されるはず)
      const entries = await fs.listEntries();
      const pdfs = entries
        .filter(e => e.kind === 'file' && e.name.toLowerCase().endsWith(PROJECT_CONSTANTS.PDF_EXTENSION))
        .map(e => e.name);
      
      const managedFiles = new Set(syncedMetadata.documents.map(d => d.fileName));
      const unclassified = pdfs.filter(name => !managedFiles.has(name) && name !== PROJECT_CONSTANTS.METADATA_FILENAME);
      setUnclassifiedFiles(unclassified);
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : 'プロジェクトの読み込みに失敗しました。');
    }
  }, [fs, syncMetadata, onError]);

  const saveProject = useCallback(async () => {
    if (!metadata) return;
    const projectService = new ProjectService(fs, metadata);
    await projectService.saveMetadata();
  }, [metadata, fs]);

  const updateConfig = useCallback(async (updates: Partial<ProjectMetadata['config']>) => {
    const currentMetadata = metadataRef.current;
    if (!currentMetadata) return;
    
    const nextMetadata: ProjectMetadata = { 
      ...currentMetadata, 
      config: { ...currentMetadata.config, ...updates } 
    };
    syncMetadata(nextMetadata);
    
    const svc = new ProjectService(fs, nextMetadata);
    await svc.saveMetadata();
  }, [fs, syncMetadata]);

  const reorderMixed = useCallback(async (activeId: string, targetParentId: string | null, index: number) => {
    const curr = metadataRef.current;
    if (!curr) return;
    
    try {
      const snap = { 
        ...curr, 
        categories: curr.categories.map(c => ({...c})),
        documents: curr.documents.map(d => ({...d}))
      };

      // 1. 移動対象の特定
      const activeCat = snap.categories.find(c => c.id === activeId);
      let activeDoc = snap.documents.find(d => d.id === activeId);
      let isNewImport = false;
      
      if (!activeCat && !activeDoc) {
        // 未分類（メタデータ未登録）からのドラッグ＆ドロップ対応
        if (activeId.startsWith('raw:')) {
          const fileName = activeId.replace('raw:', '');
          activeDoc = {
            id: Utils.id(),
            categoryId: 'unclassified', // 一時的なプレースホルダ、後で更新される
            fileName,
            documentName: fileName,
            number: '',
            date: new Date().toISOString().split('T')[0],
            sortOrder: 0,
          };
          snap.documents.push(activeDoc);
          isNewImport = true;
        } else {
          return;
        }
      }

      // 2. ターゲットの親における現在の兄弟を取得
      const actualParentId = targetParentId === 'unclassified-root' ? null : targetParentId;
      
      const siblingCats = snap.categories.filter(c => c.parentId === actualParentId);
      const siblingDocs = snap.documents.filter(d => (d.categoryId || 'unclassified') === (actualParentId || 'unclassified'));
      
      // 3. 混在リストを作成し、現在の順序でソート
      const combined = [
        ...siblingCats.map(c => ({ id: c.id, type: 'category' as const, order: c.displayOrder })),
        ...siblingDocs.map(d => ({ id: d.id, type: 'document' as const, order: d.sortOrder || 0 }))
      ].sort((a, b) => a.order - b.order);

      // 4. 移動対象を古い位置から削除（同じ親の中での移動の場合）
      const oldIdx = combined.findIndex(item => item.id === activeId);
      if (oldIdx !== -1) {
        combined.splice(oldIdx, 1);
      }

      // 5. 新しい位置に挿入
      const newItem = activeCat 
        ? { id: activeCat.id, type: 'category' as const, order: 0 }
        : { id: activeDoc!.id, type: 'document' as const, order: 0 };
      
      combined.splice(index, 0, newItem);

      // 6. 全ての順序を再割り当て
      combined.forEach((item, idx) => {
        if (item.type === 'category') {
          const cat = snap.categories.find(c => c.id === item.id);
          if (cat) {
            cat.displayOrder = idx;
            cat.parentId = actualParentId;
          }
        } else {
          const doc = snap.documents.find(d => d.id === item.id);
          if (doc) {
            doc.sortOrder = idx;
            doc.categoryId = actualParentId;
          }
        }
      });

      // 7. 物理的なフォルダ移動が必要な場合
      if (activeCat && activeCat.parentId !== actualParentId) {
          const svc = new ProjectService(fs, curr);
          await svc.moveCategory(activeCat.id, actualParentId);
      } else if (activeDoc) {
          // 書類の物理移動（新規インポート時、またはカテゴリ変更時）
          const oldCatId = isNewImport ? 'unclassified' : (curr.documents.find(d => d.id === activeDoc!.id)?.categoryId || 'unclassified');
          
          if (isNewImport || oldCatId !== actualParentId) {
              const oldCat = curr.categories.find(c => c.id === oldCatId);
              const newCat = snap.categories.find(c => c.id === actualParentId);
              
              const oldPath = oldCat ? `${oldCat.path}/${activeDoc.fileName}` : activeDoc.fileName;
              const newParentPath = newCat ? newCat.path : '.';
              
              await fs.moveAndRenameFile(oldPath, newParentPath, activeDoc.fileName);
              
              if (isNewImport) {
                  setUnclassifiedFiles(prev => prev.filter(f => f !== activeDoc!.fileName));
              }
          }
      }

      syncMetadata(snap);
      const finalSvc = new ProjectService(fs, snap);
      await finalSvc.saveMetadata();
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '並び替えに失敗しました。');
    }
  }, [fs, syncMetadata, onError]);

  // 分割したフックへの委譲 (syncMetadata を渡す)
  const categoryActions = useCategoryActions(fs, metadataRef, syncMetadata, onError);
  const documentActions = useDocumentActions(fs, metadataRef, syncMetadata, setUnclassifiedFiles, onError);

  return {
    metadata,
    unclassifiedFiles,
    setUnclassifiedFiles,
    refreshProject,
    saveProject,
    updateConfig,
    reorderMixed,
    ...categoryActions,
    ...documentActions,
    syncMetadata,
  };
}
