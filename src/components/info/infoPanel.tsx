'use client';

import React from 'react';
import { useProject } from '@/contexts/projectContext';
import { AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TabDocument } from './tabDocument';
import { TabProject } from './tabProject';
import { TabHistory } from './tabHistory';

export function InfoPanel() {
  const { metadata } = useProject();

  if (!metadata) return null;

  return (
    <aside className="w-80 h-full border-l border-border flex flex-col shrink-0 bg-background overflow-hidden z-20">
      
      <Tabs defaultValue="document" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-background">
           <TabsList className="w-full h-9 bg-secondary/50 p-1 rounded-md border border-transparent">
             <TabsTrigger value="document" className="flex-1 text-[10px] h-7 rounded-[4px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">書類</TabsTrigger>
             <TabsTrigger value="project" className="flex-1 text-[10px] h-7 rounded-[4px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">プロジェクト</TabsTrigger>
             <TabsTrigger value="history" className="flex-1 text-[10px] h-7 rounded-[4px] font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">履歴</TabsTrigger>
           </TabsList>
        </div>

        <ScrollArea className="flex-1 h-0 overflow-hidden">
          <div className="p-4">
            <TabsContent value="document" className="mt-0">
              <TabDocument />
            </TabsContent>

            <TabsContent value="project" className="mt-0">
               <TabProject />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
               <TabHistory />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
      
      <div className="p-4 bg-background border-t border-border flex items-center justify-between">
         <p className="text-[9px] text-muted-foreground flex items-center gap-2 font-medium">
            <AlertCircle className="h-3 w-3 opacity-50" /> Auto-save enabled
         </p>
         <Badge variant="outline" className="text-[9px] h-5 px-2 rounded-full border-border font-bold">v0.1.0</Badge>
      </div>
    </aside>
  );
}
