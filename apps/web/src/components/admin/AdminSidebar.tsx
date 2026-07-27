'use client';

import { useState } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import {
  LayoutDashboard, Calendar, UserCheck, Users, ShoppingBag, Lock, Database,
  Settings, Armchair, LogOut, Menu, X, Link2, Check, Sparkles, Stethoscope,
} from 'lucide-react';
import { useTenant } from '@/lib/tenant-context';
import { buildTenantPublicUrl } from '@/lib/tenant-url';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { requierePaciente } from '@/lib/industrias';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { terminologiaEmpleado, terminologiaServicio, industria } = useTenant();
  const mostrarHistorialClinico = requierePaciente(industria);
  const currentUser = useAdminStore((state) => state.user);
  const logoutStore = useAdminStore((state) => state.logout);
  const isImpersonating = useAdminStore((state) => state.impersonation?.active ?? false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isAdmin = currentUser?.rol === 'admin';
  const isEmpleado = currentUser?.rol === 'empleado';

  const navItems: NavItem[] = [
    ...(isAdmin ? [{ label: 'Dashboard', href: `/${tenantSlug}/admin/dashboard`, icon: LayoutDashboard }] : []),
    { label: 'Agenda', href: `/${tenantSlug}/admin/agenda`, icon: Calendar },
    ...(isEmpleado ? [{ label: 'Mi Silla', href: `/${tenantSlug}/admin/mi-silla`, icon: Armchair }] : []),
    ...(mostrarHistorialClinico ? [{ label: 'Historial Clínico', href: `/${tenantSlug}/admin/historial-clinico`, icon: Stethoscope }] : []),
    ...(isAdmin ? [
      { label: 'Clientes', href: `/${tenantSlug}/admin/clientes`, icon: UserCheck },
      { label: `${terminologiaEmpleado}s`, href: `/${tenantSlug}/admin/empleados`, icon: Users },
      { label: `${terminologiaServicio}s`, href: `/${tenantSlug}/admin/servicios`, icon: Sparkles },
      { label: 'Productos', href: `/${tenantSlug}/admin/productos`, icon: ShoppingBag },
      { label: 'Caja', href: `/${tenantSlug}/admin/caja`, icon: Lock },
      { label: 'Datos', href: `/${tenantSlug}/admin/datos`, icon: Database },
      { label: 'Configuración', href: `/${tenantSlug}/admin/configuracion`, icon: Settings },
    ] : []),
  ];

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar: igual limpiamos la sesión local y redirigimos.
    } finally {
      logoutStore();
      router.push(`/${tenantSlug}/admin/login`);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = buildTenantPublicUrl(tenantSlug, '/reservar');
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const navList = (onNavigate?: () => void) => (
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => {
              router.push(item.href);
              onNavigate?.();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const footer = (onNavigate?: () => void) => (
    <div className="px-3 pt-3 border-t border-border space-y-1">
      <button
        onClick={() => {
          handleCopyLink();
          onNavigate?.();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {copiedLink ? <Check size={18} className="shrink-0 text-emerald-500" /> : <Link2 size={18} className="shrink-0" />}
        <span className="truncate">{copiedLink ? '¡Copiado!' : 'Copiar Link de Reservas'}</span>
      </button>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
      >
        <LogOut size={18} className="shrink-0" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );

  const brand = (
    <div className="px-5 py-5 flex items-center gap-2.5">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
          {tenantSlug}
        </span>
        <h1 className="text-base font-extrabold tracking-tight text-foreground truncate">Volumetrix</h1>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar fijo — desktop (md+). Offset condicional cuando el banner de
          impersonación (fixed, min-h-10) está visible, para que nunca lo tape. */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 w-64 bg-card border-r border-border z-40 ${
          isImpersonating ? 'top-10 h-[calc(100vh-2.5rem)]' : 'top-0 h-screen'
        }`}
      >
        {brand}
        {currentUser && (
          <div className="mx-3 mb-3 flex items-center gap-2 bg-secondary/80 px-3 py-2 rounded-xl border border-border">
            <UserCheck size={14} className="text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{currentUser.nombreCompleto}</span>
          </div>
        )}
        {navList()}
        {footer()}
      </aside>

      {/* Barra superior — mobile/tablet (<md), dispara el drawer. Offset condicional
          para no quedar tapada por el banner de impersonación (ver aside arriba). */}
      <div
        className={`flex md:hidden items-center justify-between h-14 px-4 sticky z-40 bg-card/95 backdrop-blur-md border-b border-border ${
          isImpersonating ? 'top-10' : 'top-0'
        }`}
      >
        <span className="text-base font-extrabold tracking-tight text-foreground">Volumetrix</span>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground bg-secondary rounded-xl border border-border"
          title="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Drawer mobile/tablet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col h-screen w-72 bg-card border-r border-border animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-2">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                className="mr-3 p-2 text-muted-foreground hover:text-foreground bg-secondary rounded-xl border border-border shrink-0"
                title="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
            {currentUser && (
              <div className="mx-3 mb-3 flex items-center gap-2 bg-secondary/80 px-3 py-2 rounded-xl border border-border">
                <UserCheck size={14} className="text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">{currentUser.nombreCompleto}</span>
              </div>
            )}
            {navList(() => setMobileOpen(false))}
            {footer(() => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
