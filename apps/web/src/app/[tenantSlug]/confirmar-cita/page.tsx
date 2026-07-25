'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchPublic } from '@/lib/api';
import { useTenant } from '@/lib/tenant-context';

type Status = 'loading' | 'success' | 'error';

// Página de respaldo web para el link de confirmación de cita enviado por
// WhatsApp — ver Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §2. El propio
// mensaje de WhatsApp trae este link con citaId+token; esta página solo hace
// el POST y muestra el resultado, no requiere que el cliente escriba nada.
function ConfirmarCitaContent() {
  const searchParams = useSearchParams();
  const tenant = useTenant();
  const citaId = searchParams.get('citaId') || '';
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!citaId || !token) {
      setStatus('error');
      setErrorMessage('El enlace de confirmación no es válido.');
      return;
    }

    fetchPublic(`/citas/publica/${citaId}/confirmar?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    })
      .then(() => setStatus('success'))
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err.message || 'El enlace de confirmación es inválido o ya expiró.');
      });
  }, [citaId, token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-4 py-12">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Confirmando tu cita...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
            <h1 className="text-xl font-extrabold">¡Cita confirmada!</h1>
            <p className="text-sm text-muted-foreground">
              Gracias por confirmar. Te esperamos en {tenant.nombreComercial}.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="w-14 h-14 mx-auto text-destructive" />
            <h1 className="text-xl font-extrabold">No se pudo confirmar</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarCitaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-bold text-muted-foreground">Cargando...</div>}>
      <ConfirmarCitaContent />
    </Suspense>
  );
}
