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

  return (
    <ProjectContext.Provider
      value={{
        metadata,
        isLoading,
        isProjectLoaded: !!metadata,
        selectedDocId,
        setSelectedDocId,
        unclassifiedFiles,
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
