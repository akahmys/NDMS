'use client';

import React from 'react';
import { History } from 'lucide-react';

export function TabHistory() {
  return (
    <div className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40 space-y-3">
          <History className="h-8 w-8" />
          <p className="text-[10px] font-bold uppercase tracking-widest">近日公開予定</p>
       </div>
    </div>
  );
}
