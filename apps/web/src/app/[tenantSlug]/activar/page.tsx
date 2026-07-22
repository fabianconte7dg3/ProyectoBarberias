'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { KeyRound, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Scissors } from 'lucide-react';

function ActivarContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const token = searchParams.get('token') || '';

  const [pinAcceso, setPinAcceso] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activated, setActivated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Enlace de activación inválido o faltante.');
      return;
    }
    if (pinAcceso.length !== 4 || !/^\d{4}$/.test(pinAcceso)) {
      setError('El PIN de acceso debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    if (pinAcceso !== pinConfirm) {
      setError('Los PINs ingresados no coinciden.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await fetchApi('/usuarios/activar', {
        method: 'POST',
        body: JSON.stringify({
          token,
          pinAcceso,
        }),
      });

      setActivated(true);
    } catch (err: any) {
      console.error('Error al activar cuenta:', err);
      setError(err.message || 'El enlace de activación ha expirado o es inválido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (activated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight">¡Cuenta Activada!</h1>
            <p className="text-xs text-muted-foreground">
              Tu PIN de acceso de 4 dígitos ha sido configurado correctamente.
            </p>
          </div>

          <button
            onClick={() => router.push(`/${tenantSlug}/admin/login`)}
            className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Ir a Iniciar Sesión en la Barbería</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <Scissors size={24} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Activación de Cuenta de Staff</h1>
          <p className="text-xs text-muted-foreground">
            Crea tu PIN de acceso de 4 dígitos para ingresar a la agenda operativa
          </p>
        </div>

        {!token ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>Enlace de invitación no válido o sin token de seguridad.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                Crea tu PIN de 4 Dígitos
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={pinAcceso}
                onChange={(e) => setPinAcceso(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full text-center tracking-[1em] py-3 bg-secondary/50 border border-border rounded-xl text-lg font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                Confirma tu PIN de 4 Dígitos
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full text-center tracking-[1em] py-3 bg-secondary/50 border border-border rounded-xl text-lg font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || pinAcceso.length !== 4 || pinConfirm.length !== 4}
              className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Activando Cuenta...' : 'Activar mi Cuenta'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function ActivarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-semibold text-muted-foreground">Cargando enlace...</div>}>
      <ActivarContent />
    </Suspense>
  );
}
