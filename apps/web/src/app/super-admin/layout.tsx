import { ReactNode } from 'react';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="executive" className="min-h-screen bg-background text-foreground font-sans">
      {children}
    </div>
  );
}
