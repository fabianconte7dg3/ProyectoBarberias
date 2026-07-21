'use client';
import { ReactNode } from 'react';

interface Props {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function BottomAction({ disabled, onClick, children }: Props) {
  return (
    <div className="fixed bottom-0 left-0 w-full flex justify-center p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none z-50">
      <div className="w-full max-w-md pointer-events-auto">
        <button
          onClick={onClick}
          disabled={disabled}
          className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex justify-center items-center ${
            disabled 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-80' 
              : 'bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {children}
        </button>
      </div>
    </div>
  );
}
