import { useState, useCallback } from 'react';

export function useSelection() {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const selectRange = useCallback((ids: string[], currentId: string) => {
    if (!lastSelectedId || !ids.includes(lastSelectedId)) {
      setSelectedDocIds([currentId]);
      setLastSelectedId(currentId);
      return;
    }
    const startIndex = ids.indexOf(lastSelectedId);
    const endIndex = ids.indexOf(currentId);
    const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const range = ids.slice(start, end + 1);
    
    setSelectedDocIds(range);
    setLastSelectedId(currentId);
  }, [lastSelectedId]);

  const handleSelection = useCallback((id: string, allIdsInContext: string[], e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(allIdsInContext, id);
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedDocIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      setLastSelectedId(id);
    } else {
      setSelectedDocIds([id]);
      setLastSelectedId(id);
    }
  }, [selectRange]);

  return {
    selectedDocIds,
    setSelectedDocIds,
    selectedCategoryId,
    setSelectedCategoryId,
    lastSelectedId,
    setLastSelectedId,
    handleSelection,
    selectRange,
  };
}
