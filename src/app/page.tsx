'use client';

import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, Share, LayoutGrid, FileText, Plus } from 'lucide-react';

import { TreeView } from '@/components/TreeView';
import { ThumbnailGrid } from '@/components/ThumbnailGrid';
import { InfoPanel } from '@/components/InfoPanel';

export default function Home() {
  const { isProjectLoaded, openDirectory, isLoading, metadata } = useProject();

  if (!isProjectLoaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-paper text-ink p-8">
        <div className="text-center max-w-md space-y-6">
          <h1 className="text-6xl font-black tracking-tighter text-ink">NDMS</h1>
          <p className="text-ink/40 text-sm font-bold">図書フォルダを選択して開始してください。</p>
          <Button 
            onClick={openDirectory} 
            disabled={isLoading}
            className="bg-ink text-paper hover:bg-ink/80 px-8 py-6 text-lg font-bold rounded-2xl"
          >
            <FolderOpen className="mr-2 h-5 w-5" />
            図書フォルダを選択
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper text-ink font-sans">
      {/* Header */}
      <header className="h-16 border-b border-ink/10 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tighter leading-none">NDMS</h1>
          <Separator orientation="vertical" className="h-6 bg-ink/10" />
          <p className="text-[10px] font-mono font-bold text-ink/40 truncate max-w-xs tracking-wider">{metadata?.config.projectName || '未設定のプロジェクト'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-ink/10 hover:bg-ink/5" onClick={openDirectory}>
            <FolderOpen className="h-4 w-4 mr-2" />
            フォルダ変更
          </Button>
          <Button className="bg-ink text-paper hover:bg-ink/90">
            <Share className="h-4 w-4 mr-2" />
            成果物生成
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Tree View */}
        <aside className="w-72 border-r border-ink/10 flex flex-col shrink-0 bg-paper/50">
          <div className="p-4 space-y-2">
            <Button variant="secondary" className="w-full justify-start text-xs font-bold bg-ink/5 hover:bg-ink/10 border-none">
              <Plus className="mr-2 h-3 w-3" /> 新規フォルダ作成
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 pt-0">
               <TreeView />
            </div>
          </ScrollArea>
        </aside>

        {/* Center Pane: Thumbnail Grid */}
        <ThumbnailGrid />

        {/* Right Pane: Info Panel */}
        <InfoPanel />

      </main>
    </div>
  );
}

