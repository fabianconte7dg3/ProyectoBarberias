'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, LogOut, BarChart3 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Negocios', icon: Store },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthScreen = pathname === '/super-admin/login' || pathname === '/super-admin/setup';

  if (isAuthScreen) {
    return (
      <div data-surface="executive" className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar: igual limpiamos la sesión local y redirigimos.
    }
    localStorage.removeItem('super_jwt');
    router.push('/super-admin/login');
  };

  return (
    <div data-surface="executive" className="bg-background text-foreground font-sans">
      <nav className="hidden md:flex flex-col h-screen w-[260px] fixed left-0 top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border py-6 z-40">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Volumetrix</h1>
            <p className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        <div className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-3 pt-4 border-t border-sidebar-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </nav>

      <main className="md:pl-[260px] min-h-screen">{children}</main>
    </div>
  );
}
