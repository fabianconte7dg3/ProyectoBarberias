import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans">
      {children}
    </div>
  );
}
