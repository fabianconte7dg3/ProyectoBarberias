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
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex justify-center items-start sm:py-6 md:py-10 px-0 sm:px-4 w-full">
      
      {/* Contenedor Responsivo Móvil / Desktop (Adapta de 100% móvil a tarjeta elegante en PC) */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl bg-background min-h-screen sm:min-h-0 sm:rounded-3xl shadow-2xl relative overflow-x-hidden flex flex-col border-0 sm:border border-border transition-all">
        
        {/* Header público responsivo del tenant */}
        <header className="flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 bg-primary text-primary-foreground shadow-sm gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold border-2 border-primary-foreground/30 uppercase shrink-0">
              {tenantSlug.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight capitalize">{nombreBarberia}</h1>
              <p className="text-xs sm:text-sm text-primary-foreground/80 font-medium">Reserva de cita en línea</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/15 text-xs font-semibold text-primary-foreground border border-primary-foreground/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Agenda Abierta</span>
          </div>
        </header>

        {/* Contenido Dinámico de Reserva */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-28 sm:pb-8">
          {children}
        </main>
      </div>

    </div>
  );
}
