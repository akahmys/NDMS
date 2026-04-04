import { useCallback } from 'react';
import { ProjectMetadata, DocumentMetadata } from '@/types/project';
import { ProjectService } from '@/services/projectService';
import { FileSystemService } from '@/services/fileSystemService';

export function useDocumentActions(
  fs: FileSystemService,
  metadataRef: React.MutableRefObject<ProjectMetadata | null>,
  syncMetadata: (metadata: ProjectMetadata | null) => void,
  setUnclassifiedFiles: React.Dispatch<React.SetStateAction<string[]>>,
  onError?: (msg: string) => void
) {
  const moveDocument = useCallback(async (docId: string, targetCategoryId: string) => {
    const curr = metadataRef.current;
    if (!curr) return false;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.moveDocument(docId, targetCategoryId);
      syncMetadata(nextMetadata);
      return true;
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '書類の移動に失敗しました。');
      return false;
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const importFileHandle = useCallback(async (handle: FileSystemFileHandle, targetCategoryId: string) => {
    const curr = metadataRef.current;
    if (!curr) return;
    try {
      const svc = new ProjectService(fs, curr);
      const nextMetadata = await svc.importDocument(handle, targetCategoryId);
      syncMetadata(nextMetadata);
      setUnclassifiedFiles(prev => prev.filter(f => f !== handle.name));
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '書類のインポートに失敗しました。');
    }
  }, [fs, metadataRef, syncMetadata, setUnclassifiedFiles, onError]);

  const moveDocuments = useCallback(async (docIds: string[], targetCategoryId: string) => {
    const curr = metadataRef.current;
    if (!curr || !fs.directoryHandle) return;

    let currentMetadata = curr;
    const newlyManagedFiles: string[] = [];
    let anySuccess = false;

    try {
      // ループ内ではローカルの metadata を更新し続け、最後に一括で sync する
      for (const id of docIds) {
        const svc = new ProjectService(fs, currentMetadata);
        if (id.startsWith('raw:')) {
          const fileName = id.replace('raw:', '');
          const handle = await fs.directoryHandle.getFileHandle(fileName);
          currentMetadata = await svc.importDocument(handle, targetCategoryId);
          newlyManagedFiles.push(fileName);
          anySuccess = true;
        } else {
          currentMetadata = await svc.moveDocument(id, targetCategoryId);
          anySuccess = true;
        }
      }

      if (anySuccess) {
        syncMetadata(currentMetadata);
        if (newlyManagedFiles.length > 0) {
          setUnclassifiedFiles(prev => prev.filter(f => !newlyManagedFiles.includes(f)));
        }
      }
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '一部の書類の移動に失敗しました。');
      if (anySuccess) syncMetadata(currentMetadata);
    }
  }, [fs, metadataRef, syncMetadata, setUnclassifiedFiles, onError]);

  const reorderDocuments = useCallback(async (activeId: string, overId: string) => {
    const curr = metadataRef.current;
    if (!curr) return;
    try {
      const snap = { ...curr, documents: [...curr.documents] };
      const activeIdx = snap.documents.findIndex(d => d.id === activeId);
      const overIdx = snap.documents.findIndex(d => d.id === overId);
      
      if (activeIdx === -1 || overIdx === -1) return;

      const [moved] = snap.documents.splice(activeIdx, 1);
      snap.documents.splice(overIdx, 0, moved);
      
      const categoryId = moved.categoryId;
      snap.documents
        .filter(d => d.categoryId === categoryId)
        .forEach((doc, index) => { doc.sortOrder = index; });
      
      syncMetadata(snap);
      const svc = new ProjectService(fs, snap);
      await svc.saveMetadata();
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '並び替えに失敗しました。');
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  const updateDocument = useCallback(async (docId: string, updates: Partial<DocumentMetadata>) => {
    const curr = metadataRef.current;
    if (!curr) return;
    try {
      const nextMetadata = {
        ...curr,
        documents: curr.documents.map(d => d.id === docId ? { ...d, ...updates } : d)
      };
      syncMetadata(nextMetadata);
      const svc = new ProjectService(fs, nextMetadata);
      await svc.saveMetadata();
    } catch (e) {
      if (onError) onError(e instanceof Error ? e.message : '書類の更新に失敗しました。');
    }
  }, [fs, metadataRef, syncMetadata, onError]);

  return {
    moveDocument,
    moveDocuments,
    importFileHandle,
    reorderDocuments,
    updateDocument,
    deleteDocument: useCallback(async (docId: string) => {
      const curr = metadataRef.current;
      if (!curr) return false;
      try {
        const svc = new ProjectService(fs, curr);
        const nextMetadata = await svc.deleteDocument(docId);
        syncMetadata(nextMetadata);
        return true;
      } catch (e) {
        if (onError) onError(e instanceof Error ? e.message : '書類の削除に失敗しました。');
        return false;
      }
    }, [fs, metadataRef, syncMetadata, onError]),
    renameDocument: useCallback(async (docId: string, newName: string) => {
      const curr = metadataRef.current;
      if (!curr) return false;
      try {
        const svc = new ProjectService(fs, curr);
        const nextMetadata = await svc.renameDocument(docId, newName);
        syncMetadata(nextMetadata);
        return true;
      } catch (e) {
        if (onError) onError(e instanceof Error ? e.message : '書類のリネームに失敗しました。');
        return false;
      }
    }, [fs, metadataRef, syncMetadata, onError]),
  };
}
