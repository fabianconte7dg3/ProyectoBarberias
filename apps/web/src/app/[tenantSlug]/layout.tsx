import { ReactNode } from 'react';
import { notFound } from 'next/navigation';

// MOCK: Simula la consulta a NestJS para obtener la configuración del tenant
async function getTenantConfig(slug: string) {
  if (slug === 'barberia-carlos') {
    return {
      id: 'tenant-123',
      name: 'Barbería Carlos',
      // Ejemplo de color HEX inyectado. Tailwind v4 usa color-mix internamente para las opacidades,
      // así que funcionará perfectamente aunque reemplacemos el oklch por defecto.
      color: '#ef4444', 
    };
  }
  return null;
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
    // SSR Theming: Inyectamos el color primario directamente en el HTML. Cero FOUC.
    <div
      className="min-h-screen bg-neutral-100 flex justify-center"
      style={{ '--primary': tenant.color } as React.CSSProperties}
    >
      {/* Mobile-first Layout Constraint */}
      <div className="w-full max-w-md bg-background min-h-screen shadow-2xl relative overflow-x-hidden flex flex-col">
        
        {/* Tenant Header (Logo Placeholder) */}
        <header className="flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground shadow-sm">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center text-4xl font-bold mb-4 border-2 border-primary-foreground/30">
            {tenant.name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
        </header>

        {/* Contenido Dinámico de las Pantallas */}
        <main className="flex-1 p-4 pb-28">
          {children}
        </main>
      </div>
    </div>
  );
}
