import { useState, useCallback } from 'react';
import { FileSystemService } from '@/services/fileSystemService';

export function useFileSystem() {
  const [fs] = useState(() => new FileSystemService());
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectDirectory = useCallback(async () => {
    setIsLoading(true);
    try {
      const handle = await fs.selectDirectory();
      if (handle) {
        setIsProjectLoaded(true);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fs]);

  return {
    fs,
    isProjectLoaded,
    setIsProjectLoaded,
    isLoading,
    setIsLoading,
    selectDirectory,
  };
}
