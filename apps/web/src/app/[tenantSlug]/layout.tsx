import { ReactNode } from 'react';
import { notFound } from 'next/navigation';

async function getTenantConfig(slug: string) {
  if (slug === 'barberia-carlos') {
    return {
      id: 'tenant-123',
      name: 'Barbería Carlos',
      color: '#ef4444', 
    };
  }
  return {
    id: slug,
    name: slug,
    color: '#ef4444',
  };
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
      style={{ '--primary': tenant.color } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
