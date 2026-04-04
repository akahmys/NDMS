'use client';

import React, { createContext, useContext } from 'react';
import { FileSystemService } from '@/services/fileSystemService';
import { ProjectMetadata, DocumentMetadata } from '@/types/project';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useSelection } from '@/hooks/useSelection';
import { useMetadata } from '@/hooks/useMetadata';
import { usePdfActions } from '@/hooks/usePdfActions';

interface ProjectContextType {
  fs: FileSystemService;
  metadata: ProjectMetadata | null;
  isProjectLoaded: boolean;
  isLoading: boolean;
  unclassifiedFiles: string[];
  selectedDocIds: string[];
  selectedCategoryId: string | null;
  setSelectedDocIds: (ids: string[]) => void;
  setSelectedCategoryId: (id: string | null) => void;
  openDirectory: () => Promise<void>;
  refreshProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  reorderCategories: (activeId: string, overId: string, newParentId?: string | null, position?: 'before' | 'after') => Promise<void>;
  reorderDocuments: (activeId: string, overId: string) => Promise<void>;
  reorderMixed: (activeId: string, targetParentId: string | null, index: number) => Promise<void>;
  moveDocument: (docId: string, targetCategoryId: string) => Promise<boolean | undefined>;
  moveDocuments: (docIds: string[], targetCategoryId: string) => Promise<void>;
  moveCategory: (catId: string, targetParentId: string | null) => Promise<boolean>;
  createCategory: (name: string, parentId?: string | null) => Promise<string | null>;
  renameCategory: (catId: string, newName: string) => Promise<boolean>;
  mergeDocuments: (docIds: string[], fileName: string) => Promise<void>;
  importFileHandle: (handle: FileSystemFileHandle, targetCategoryId: string) => Promise<void>;
  deleteCategory: (catId: string) => Promise<boolean>;
  deleteDocument: (docId: string) => Promise<boolean>;
  renameDocument: (docId: string, newName: string) => Promise<boolean>;
  // For TreeView compatibility
  lastSelectedId: string | null;
  setLastSelectedId: (id: string | null) => void;
  selectRange: (ids: string[], currentId: string) => void;
  handleSelection: (id: string, allIdsInContext: string[], e: React.MouseEvent) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  updateConfig: (updates: Partial<ProjectMetadata['config']>) => Promise<void>;
  updateDocument: (docId: string, updates: Partial<DocumentMetadata>) => Promise<void>;
  syncMetadata: (metadata: ProjectMetadata | null) => void;
  expandedIds: string[];
  setExpandedIds: (ids: string[]) => void;
  toggleExpanded: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { 
    fs, isProjectLoaded, isLoading, selectDirectory 
  } = useFileSystem();

  const {
    selectedDocIds, setSelectedDocIds, 
    selectedCategoryId, setSelectedCategoryId,
    lastSelectedId, setLastSelectedId,
    selectRange, handleSelection
  } = useSelection();

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    metadata, unclassifiedFiles,
    refreshProject, saveProject, 
    reorderCategories, reorderDocuments, reorderMixed,
    moveDocument, moveDocuments, moveCategory, createCategory, renameCategory, importFileHandle,
    deleteCategory, deleteDocument, renameDocument,
    updateConfig, updateDocument,
    syncMetadata // setMetadata の代わりに syncMetadata を取得
  } = useMetadata(fs, (msg) => setErrorMessage(msg));

  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const { mergeDocuments } = usePdfActions(fs, metadata, refreshProject, syncMetadata);

  const openDirectory = async () => {
    const success = await selectDirectory();
    if (success) {
      await refreshProject();
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      fs, 
      metadata, 
      isProjectLoaded, 
      isLoading, 
      unclassifiedFiles,
      selectedDocIds,
      selectedCategoryId,
      setSelectedDocIds,
      setSelectedCategoryId,
      openDirectory, 
      refreshProject,
      saveProject,
      reorderCategories,
      reorderDocuments,
      reorderMixed,
      moveDocument,
      moveDocuments,
      moveCategory,
      createCategory,
      renameCategory,
      mergeDocuments,
      importFileHandle,
      deleteCategory,
      deleteDocument,
      renameDocument,
      syncMetadata,
      lastSelectedId,
      setLastSelectedId,
      selectRange,
      handleSelection,
      errorMessage,
      setErrorMessage,
      updateConfig,
      updateDocument,
      expandedIds,
      setExpandedIds,
      toggleExpanded
    }}>
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
