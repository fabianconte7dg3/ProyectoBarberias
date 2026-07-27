'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isImpersonating = useAdminStore((state) => state.impersonation?.active ?? false);
  const isAuthScreen = pathname?.endsWith('/admin/login');

  if (isAuthScreen) {
    return <div className="min-h-screen w-full bg-background text-foreground font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      <ImpersonationBanner />
      <AdminSidebar />
      <div
        className={`md:ml-64 min-w-0 flex flex-col min-h-screen ${isImpersonating ? 'pt-10' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
