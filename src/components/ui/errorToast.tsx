'use client';

import React, { useEffect } from 'react';
import { XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/projectContext';

export function ErrorToast() {
  const { errorMessage, setErrorMessage } = useProject();

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, setErrorMessage]);

  if (!errorMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md border border-white/10">
        <XCircle className="h-5 w-5 shrink-0" />
        <p className="text-[11px] font-bold flex-1 leading-tight tracking-tight">
          {errorMessage}
        </p>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded hover:bg-white/20 transition-colors shrink-0"
          onClick={() => setErrorMessage(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
