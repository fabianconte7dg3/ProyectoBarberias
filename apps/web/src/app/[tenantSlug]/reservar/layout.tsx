'use client';

import { ReactNode, Suspense } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useTenant } from '@/lib/tenant-context';
import { PauseCircle } from 'lucide-react';
import { BookingStepper } from '@/components/booking/BookingStepper';

const PASOS = ['Servicio y Profesional', 'Fecha y Hora', 'Confirmación'];

function ReservarLayoutContent({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const tenant = useTenant();
  const nombreBarberia = tenant.nombreComercial || tenantSlug.replace('-', ' ');

  const isConfirmar = pathname.endsWith('/confirmar');
  const isSuccess = isConfirmar && searchParams.get('status') === 'success';
  const currentStep = isConfirmar ? 2 : pathname.endsWith('/fecha') ? 1 : 0;

  return (
    <div className="min-h-screen bg-muted flex justify-center items-start sm:py-6 md:py-10 px-0 sm:px-4 w-full">

      {/* Contenedor Responsivo Móvil / Desktop (Adapta de 100% móvil a tarjeta elegante en PC) */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl bg-background min-h-screen sm:min-h-0 sm:rounded-3xl shadow-2xl relative overflow-x-hidden flex flex-col border-0 sm:border border-border transition-all">

        {/* Header público responsivo del tenant */}
        <header className="flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 bg-primary text-primary-foreground shadow-sm gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-2xl sm:text-3xl font-extrabold border-2 border-primary-foreground/30 uppercase shrink-0">
              {nombreBarberia.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight capitalize">{nombreBarberia}</h1>
              <p className="text-xs sm:text-sm text-primary-foreground/80 font-medium">Reserva de cita en línea</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/15 text-xs font-semibold text-primary-foreground border border-primary-foreground/20">
            {tenant.killSwitchActivo ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Reserva Pausada</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Agenda Abierta</span>
              </>
            )}
          </div>
        </header>

        {/* Stepper del wizard — oculto en la pausa de auto-servicio y en la vista de éxito */}
        {!tenant.killSwitchActivo && !isSuccess && (
          <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-1 border-b border-border/60 bg-card/40">
            <BookingStepper steps={PASOS} currentStep={currentStep} />
          </div>
        )}

        {/* Contenido Dinámico de Reserva — bloqueado por completo mientras la Pausa de
            Auto-Servicio esté activa (ver matriz-permisos-y-bloqueos.md §2). El backend
            ya rechaza cualquier POST público con 503 en este estado (KillSwitchGuard);
            este banner evita que el cliente recorra todo el wizard solo para toparse
            con ese error al final. */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-28 sm:pb-8">
          {tenant.killSwitchActivo ? (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <PauseCircle className="w-9 h-9 text-amber-500" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-lg font-extrabold text-foreground">Reservas pausadas temporalmente</h2>
                <p className="text-sm text-muted-foreground">
                  {nombreBarberia} no está aceptando reservas en línea en este momento. Por favor
                  contáctanos directamente o intenta de nuevo más tarde.
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

    </div>
  );
}

export default function ReservarLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-bold text-muted-foreground">Cargando...</div>}>
      <ReservarLayoutContent>{children}</ReservarLayoutContent>
    </Suspense>
  );
}
