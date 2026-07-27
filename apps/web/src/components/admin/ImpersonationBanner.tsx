'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';

export function ImpersonationBanner() {
  const router = useRouter();
  const impersonation = useAdminStore((state) => state.impersonation);
  const storeLogout = useAdminStore((state) => state.logout);

  if (!impersonation?.active) return null;

  const handleExitImpersonation = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar: igual limpiamos localmente y volvemos a SuperAdmin.
    }
    storeLogout();
    router.push('/super-admin/tenants');
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 min-h-10 bg-amber-500 text-amber-950 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
      <ShieldAlert size={16} className="shrink-0" />
      <span>Operando por impersonación de Super Admin ({impersonation.superAdminEmail})</span>
      <button
        onClick={handleExitImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/10 hover:bg-amber-950/20 rounded-lg border border-amber-950/20 transition-colors"
      >
        <LogOut size={14} />
        <span>Salir de la impersonación</span>
      </button>
    </div>
  );
}
