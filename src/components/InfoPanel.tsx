'use client';

import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function InfoPanel() {
  const { metadata, saveProject } = useProject();
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);

  if (!metadata) return null;

  const doc = metadata.documents.find(d => d.id === selectedDocId);

  return (
    <div className="w-80 border-l border-ink/10 flex flex-col shrink-0 bg-paper/50 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Project Settings */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-tiny font-black text-ink/40 uppercase tracking-widest">Project Info</h3>
              <ChevronDown className="h-4 w-4 text-ink/20" />
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">案件名</Label>
                <Input 
                  defaultValue={metadata.config.projectName} 
                  className="bg-transparent border-ink/10 focus:border-accent/40"
                  onBlur={(e) => {
                    metadata.config.projectName = e.target.value;
                    saveProject();
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">受注番号</Label>
                <Input 
                  defaultValue={metadata.config.orderNumber} 
                  className="bg-transparent border-ink/10"
                  onBlur={(e) => {
                    metadata.config.orderNumber = e.target.value;
                    saveProject();
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">WBS</Label>
                <Input 
                  defaultValue={metadata.config.wbs} 
                  className="bg-transparent border-ink/10"
                  onBlur={(e) => {
                    metadata.config.wbs = e.target.value;
                    saveProject();
                  }}
                />
              </div>
              {/* Custom fields would go here */}
              <Button variant="ghost" className="w-full text-tiny font-black text-ink/20 border border-dashed border-ink/10 hover:border-ink/20 hover:bg-transparent">
                <Plus className="h-3 w-3 mr-2" /> カスタム項目を追加
              </Button>
            </div>
          </section>

          <Separator className="bg-ink/5" />

          {/* Document Settings */}
          <section className="space-y-4">
            <h3 className="text-tiny font-black text-ink/40 uppercase tracking-widest">Document Info</h3>
            {doc ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">書類番号</Label>
                  <Input 
                    defaultValue={doc.number} 
                    className="bg-transparent border-ink/10"
                    onBlur={(e) => {
                      doc.number = e.target.value;
                      saveProject();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">書類名</Label>
                  <Input 
                    defaultValue={doc.documentName} 
                    className="bg-transparent border-ink/10"
                    onBlur={(e) => {
                      doc.documentName = e.target.value;
                      saveProject();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-ink/30 px-1">ファイル名</Label>
                  <Input 
                    defaultValue={doc.fileName} 
                    disabled
                    className="bg-transparent border-ink/5 opacity-50"
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 opacity-40">
                <div className="flex justify-center"><ChevronDown className="h-8 w-8 text-ink/10" /></div>
                <p className="text-[10px] font-bold uppercase tracking-widest">書類を選択して詳細を表示</p>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
