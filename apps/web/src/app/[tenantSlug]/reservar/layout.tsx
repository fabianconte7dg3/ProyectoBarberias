import { ReactNode } from 'react';

export default async function ReservarLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const nombreBarberia = tenantSlug.replace('-', ' ');

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex justify-center w-full">
      {/* Contenedor móvil restringido para la experiencia del cliente final */}
      <div className="w-full max-w-md bg-background min-h-screen shadow-2xl relative overflow-x-hidden flex flex-col border-x border-border">
        
        {/* Header público del tenant */}
        <header className="flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground shadow-sm">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center text-4xl font-extrabold mb-3 border-2 border-primary-foreground/30 uppercase">
            {tenantSlug.charAt(0)}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight capitalize text-center">{nombreBarberia}</h1>
        </header>

        {/* Contenido Dinámico de Reserva */}
        <main className="flex-1 p-4 pb-28">
          {children}
        </main>
      </div>
    </div>
  );
}
