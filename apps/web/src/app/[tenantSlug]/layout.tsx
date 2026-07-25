import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { TenantProvider, type TenantPublica } from '@/lib/tenant-context';

async function getTenantConfig(slug: string): Promise<TenantPublica | null> {
  const res = await fetch(`${API_URL}/tenants/publico/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantConfig(tenantSlug);

  if (!tenant) {
    notFound();
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground w-full flex flex-col font-sans"
      style={{ '--primary': tenant.colorPrimario || '#ef4444' } as React.CSSProperties}
    >
      <TenantProvider tenant={tenant}>{children}</TenantProvider>
    </div>
  );
}
