'use client';

import React, { useState } from 'react';
import { ErrorToast } from '@/components/ui/errorToast';
import { useProject } from '@/contexts/projectContext';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FolderOpen, 
  Folder
} from 'lucide-react';

import { ArboristTreeView } from '@/components/tree/arboristTreeView';
import { ThumbnailGrid } from '@/components/document/thumbnailGrid';
import { InfoPanel } from '@/components/info/infoPanel';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export default function Home() {
  const { 
    isProjectLoaded, 
    openDirectory, 
    isLoading, 
    metadata, 
    reorderDocuments,
    moveDocuments,
    selectedDocIds,
  } = useProject();
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId || !metadata) return;

    // ArboristTreeView handles its own DND via onMove, 
    // and ThumbnailGrid now handles its own local DND.
    // Persistent reordering from the root context is no longer needed.
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground selection:bg-primary/10">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-8 shrink-0 z-50">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground font-black text-lg transition-all hover:scale-105 hover:rotate-3 shadow-sm">N</div>
            <h1 className="text-2xl font-black tracking-tightest hidden md:block uppercase selection:bg-primary selection:text-white">NDMS</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary" 
              onClick={openDirectory}
              disabled={isLoading}
            >
              <FolderOpen className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden h-0">
          <aside className="w-72 h-full border-r border-border flex flex-col shrink-0 bg-background overflow-hidden">
            <Separator className="opacity-50" />
            <div className="flex-1 min-h-0">
               <ArboristTreeView />
            </div>
          </aside>

          <div className="flex-1 h-full flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1 h-full overflow-hidden">
              <ThumbnailGrid />
              <ScrollBar />
            </ScrollArea>
          </div>

          <InfoPanel />
        </main>
        <ErrorToast />

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
          {activeId ? (() => {
            if (activeId.startsWith('grid-doc:')) {
              const docId = activeId.replace('grid-doc:', '');
              const doc = metadata?.documents.find(d => d.id === docId);
              return (
                <div className="flex items-center gap-2 px-2 py-1 bg-background border border-border rounded shadow-lg opacity-90 scale-105 transition-transform">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-[11px] font-medium">{doc?.documentName || doc?.fileName}</span>
                </div>
              );
            }
            return null;
          })() : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
