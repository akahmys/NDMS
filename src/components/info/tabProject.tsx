'use client';

import React from 'react';
import { useProject } from '@/contexts/projectContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';

export function TabProject() {
  const { metadata, updateConfig } = useProject();

  if (!metadata) return null;

  return (
    <div key={metadata.config.projectName} className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground ml-1">案件名</Label>
            <Input 
              defaultValue={metadata.config.projectName} 
              className="h-8 text-[11px] font-medium"
              onBlur={(e) => {
                updateConfig({ projectName: e.target.value });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground ml-1">受注番号</Label>
              <Input 
                defaultValue={metadata.config.orderNumber} 
                className="h-8 text-[11px] font-mono"
                onBlur={(e) => {
                  updateConfig({ orderNumber: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground ml-1">WBS コード</Label>
              <Input 
                defaultValue={metadata.config.wbs} 
                className="h-8 text-[11px] font-mono"
                onBlur={(e) => {
                  updateConfig({ wbs: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground ml-1">注文主</Label>
            <Input 
              defaultValue={metadata.config.customer} 
              className="h-8 text-[11px] font-medium"
              onBlur={(e) => {
                updateConfig({ customer: e.target.value });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground ml-1">使用先</Label>
            <Input 
              defaultValue={metadata.config.user} 
              className="h-8 text-[11px] font-medium"
              onBlur={(e) => {
                updateConfig({ user: e.target.value });
              }}
            />
          </div>
       </div>
       
       <Separator />
       
       <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground flex items-center gap-2">
             <Settings2 className="h-3 w-3" /> 各種設定
          </h4>
          <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8 border-border">
             プロジェクト設定のエクスポート
          </Button>
       </div>
    </div>
  );
}
