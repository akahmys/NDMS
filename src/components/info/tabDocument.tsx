'use client';

import React from 'react';
import { useProject } from '@/contexts/projectContext';
import { DocumentMetadata } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TabDocument() {
  const { metadata, updateDocument, selectedDocIds, unclassifiedFiles } = useProject();

  if (!metadata) return null;

  const selectedDocs = [
    ...metadata.documents.filter(d => selectedDocIds.includes(d.id)),
    ...unclassifiedFiles.filter(name => selectedDocIds.includes(name)).map(name => ({ id: name, fileName: name, documentName: name, categoryId: null }))
  ];

  const isSingleSelection = selectedDocs.length === 1;
  const isMultiSelection = selectedDocs.length > 1;
  const doc = isSingleSelection ? selectedDocs[0] : null;

  if (isMultiSelection) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center px-4 space-y-4 animate-in fade-in zoom-in duration-300">
         <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center ring-1 ring-inset ring-primary/20">
            <FileText className="h-8 w-8 text-primary" />
         </div>
         <div className="space-y-1">
            <p className="text-[13px] font-bold">{selectedDocs.length} 個の書類を選択中</p>
            <p className="text-[10px] text-muted-foreground">複数選択時は一括編集のみ可能です（将来対応）</p>
         </div>
      </div>
    );
  }

  if (!isSingleSelection || !doc) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center px-4 space-y-4">
         <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground/30" />
         </div>
         <div className="space-y-1">
            <p className="text-[11px] font-bold">書類が選択されていません</p>
            <p className="text-[10px] text-muted-foreground leading-snug">ナビゲーターまたはグリッドから選択してください</p>
         </div>
      </div>
    );
  }

  return (
    <div key={doc.id} className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-3 rounded-lg border border-border bg-muted space-y-2">
         <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[9px] font-bold h-4 px-1.5 border-primary text-primary bg-primary/10 uppercase">Draft</Badge>
            <span className="text-[9px] font-mono text-muted-foreground">ID: {doc.id.slice(0, 8)}</span>
         </div>
         <h4 className="text-[11px] font-bold truncate leading-tight mt-1">{doc.documentName || doc.fileName}</h4>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground ml-1">書類名</Label>
          <Input 
            defaultValue={doc.documentName} 
            className="h-8 text-[11px] font-medium focus-visible:ring-primary/20"
            onBlur={(e) => {
              if (doc.categoryId !== null) {
                updateDocument(doc.id, { documentName: e.target.value });
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground ml-1">書類番号</Label>
          <Input 
            defaultValue={(doc as DocumentMetadata).number || ''} 
            placeholder="DOC-000"
            className="h-8 text-[11px] font-mono focus-visible:ring-primary/20"
            onBlur={(e) => {
              if (doc.categoryId !== null) {
                updateDocument(doc.id, { number: e.target.value } as Partial<DocumentMetadata>);
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground ml-1">物理ファイル名</Label>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted border border-border">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground truncate">{doc.fileName}</span>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="flex flex-col gap-2">
         <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold w-full justify-start border-border">
            <ExternalLink className="h-3.5 w-3.5 mr-2" /> 外部ビューアで開く
         </Button>
         <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> 削除
         </Button>
      </div>
    </div>
  );
}
