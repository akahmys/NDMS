'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FileSystemService } from '@/services/FileSystemService';
import { ProjectService, ProjectMetadata } from '@/services/ProjectService';

interface ProjectContextType {
  metadata: ProjectMetadata | null;
  isLoading: boolean;
  isProjectLoaded: boolean;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;
  unclassifiedFiles: string[];
  reorderCategories: (activeId: string, overId: string) => Promise<void>;
  reorderDocuments: (activeId: string, overId: string) => Promise<void>;
  moveDocument: (docId: string, targetCatId: string) => Promise<void>;
  importFileHandle: (handle: FileSystemFileHandle, targetCatId: string | null) => Promise<void>;
  openDirectory: () => Promise<void>;
  saveProject: () => Promise<void>;
  refreshProject: () => Promise<void>;
  fs: FileSystemService;
}

const fs = new FileSystemService();
const project = new ProjectService(fs);

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [unclassifiedFiles, setUnclassifiedFiles] = useState<string[]>([]);

  const fetchUnclassifiedFiles = useCallback(async () => {
    if (!fs.directoryHandle) return;
    const entries = await fs.listEntries(null);
    const files = entries
      .filter(e => e.kind === 'file' && e.name.toLowerCase().endsWith('.pdf') && e.name !== 'project.json')
      .map(e => e.name);
    setUnclassifiedFiles(files);
  }, []);

  const openDirectory = useCallback(async () => {
    setIsLoading(true);
    try {
      const handle = await fs.selectDirectory();
      if (handle) {
        await project.init();
        setMetadata({ ...project.metadata! });
        await fetchUnclassifiedFiles();
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnclassifiedFiles]);

  const saveProject = useCallback(async () => {
    if (project.metadata) {
      await project.save();
      setMetadata({ ...project.metadata! });
    }
  }, []);

  const refreshProject = useCallback(async () => {
    if (fs.directoryHandle) {
      await project.init();
      setMetadata({ ...project.metadata! });
      await fetchUnclassifiedFiles();
    }
  }, [fetchUnclassifiedFiles]);

  const reorderCategories = useCallback(async (activeId: string, overId: string) => {
    if (!metadata) return;
    const items = [...metadata.categories];
    const oldIndex = items.findIndex((i) => i.id === activeId);
    const newIndex = items.findIndex((i) => i.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const [movedItem] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, movedItem);
      // Update displayOrder
      items.forEach((item, index) => {
        item.displayOrder = index;
      });
      metadata.categories = items;
      setMetadata({ ...metadata });
      await saveProject();
    }
  }, [metadata, saveProject]);

  const reorderDocuments = useCallback(async (activeId: string, overId: string) => {
    if (!metadata) return;
    const items = [...metadata.documents];
    const oldIndex = items.findIndex((i) => i.id === activeId);
    const newIndex = items.findIndex((i) => i.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const [movedItem] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, movedItem);
      // Update sortOrder within the same category
      const catId = movedItem.categoryId;
      const catDocs = items.filter(d => d.categoryId === catId);
      catDocs.forEach((doc, index) => {
        doc.sortOrder = index;
      });
      metadata.documents = items;
      setMetadata({ ...metadata });
      await saveProject();
    }
  }, [metadata, saveProject]);

  const moveDocument = useCallback(async (docId: string, targetCatId: string) => {
    if (!metadata) return;
    const doc = metadata.documents.find(d => d.id === docId);
    if (!doc || doc.categoryId === targetCatId) return;

    const oldCat = metadata.categories.find(c => c.id === doc.categoryId);
    const newCat = metadata.categories.find(c => c.id === targetCatId);
    if (!newCat) return;

    const oldPath = oldCat ? `${oldCat.path}/${doc.fileName}` : doc.fileName;
    const newPath = newCat.path;

    const success = await fs.moveAndRenameFile(oldPath, newPath, doc.fileName);
    if (success) {
      doc.categoryId = targetCatId;
      doc.sortOrder = metadata.documents.filter(d => d.categoryId === targetCatId).length;
      setMetadata({ ...metadata });
      await saveProject();
    }
  }, [metadata, saveProject, fs]);

  const importFileHandle = useCallback(async (handle: FileSystemFileHandle, targetCatId: string | null) => {
    if (!fs.directoryHandle) return;

    // プロジェクト内にあるかチェック
    const relativePath = await fs.directoryHandle.resolve(handle);
    const fileName = handle.name;

    if (relativePath) {
      // プロジェクト内にある場合：移動処理
      const sourcePath = relativePath.join('/');
      
      if (targetCatId) {
        // 特定カテゴリへのドロップ
        const targetCat = metadata?.categories.find(c => c.id === targetCatId);
        if (targetCat) {
          const success = await fs.moveAndRenameFile(sourcePath, targetCat.path, fileName);
          if (success) {
            // 既存のドキュメントメタデータがあれば更新、なければ新規作成
            const existingDoc = metadata?.documents.find(d => d.fileName === fileName);
            if (existingDoc) {
              existingDoc.categoryId = targetCatId;
            } else {
              await project.addDocument({ fileName, categoryId: targetCatId });
            }
          }
        }
      }
      // もし targetCatId が null なら「未分類」への移動（物理的にはルートへ）
      // ... (実装略。基本はルート、かつメタデータから削除)
    } else {
      // プロジェクト外の場合：コピー処理
      if (targetCatId) {
        const targetCat = metadata?.categories.find(c => c.id === targetCatId);
        if (targetCat) {
          const file = await handle.getFile();
          const arrayBuffer = await file.arrayBuffer();
          const success = await fs.writeFile(`${targetCat.path}/${fileName}`, arrayBuffer);
          if (success) {
            await project.addDocument({ fileName, categoryId: targetCatId });
          }
        }
      }
    }

    setMetadata({ ...project.metadata! });
    await fetchUnclassifiedFiles();
    await saveProject();
  }, [metadata, fs, project, saveProject, fetchUnclassifiedFiles]);

  return (
    <ProjectContext.Provider
      value={{
        metadata,
        isLoading,
        isProjectLoaded: !!metadata,
        selectedDocId,
        setSelectedDocId,
        unclassifiedFiles,
        reorderCategories,
        reorderDocuments,
        moveDocument,
        importFileHandle,
        openDirectory,
        saveProject,
        refreshProject,
        fs,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}





export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
