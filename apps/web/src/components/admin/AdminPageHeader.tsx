import { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function AdminPageHeader({ title, description, children }: AdminPageHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground truncate">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </header>
  );
}
