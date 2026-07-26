'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Estado del flujo 2-Pasos
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetchApi<{ necesitaSetup: boolean }>('/super-admin/setup/status');
        if (res.necesitaSetup) {
          router.push('/super-admin/setup');
        }
      } catch (err) {
        console.error('Error verificando status de setup:', err);
      }
    }
    checkSetup();
  }, [router]);

  // Paso 1: Email + Contraseña
  const handlePaso1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ tempToken: string; mfaRequired: boolean }>('/super-admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setTempToken(res.tempToken);
      setStep(2);
    } catch (err: any) {
      console.error('Error en Paso 1 SuperAdmin:', err);
      setError(err.message || 'Credenciales de superadmin inválidas.');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Código TOTP / PIN 2FA de 6 dígitos
  const handlePaso2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoTotp.length !== 6) {
      setError('El código 2FA debe tener exactamente 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ accessToken: string }>('/super-admin/login/verificar-totp', {
        method: 'POST',
        body: JSON.stringify({ tempToken, codigoTotp }),
      });

      if (res?.accessToken) {
        localStorage.setItem('super_jwt', res.accessToken);
      }

      // Éxito: Redirigir a la Consola Super Admin
      router.push('/super-admin');
    } catch (err: any) {
      console.error('Error en Paso 2 TOTP:', err);
      setError(err.message || 'Código 2FA incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#091426] text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Fondo ambiental — navy con resplandor pink, ver Executive System */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1e293b] via-[#091426] to-[#091426]" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#de2264] rounded-full mix-blend-screen filter blur-[128px] opacity-10 z-0 pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Branding SuperAdmin */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white/10 border border-white/15 text-white rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-4">Volumetrix</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#bcc7de] mt-1.5">
            {step === 1 ? 'Consola Super Admin — Paso 1 de 2' : 'Verificación 2FA — Paso 2 de 2'}
          </p>
        </div>

        {/* Tarjeta de formulario */}
        <div className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-medium flex items-center gap-3 animate-in fade-in">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PASO 1: Email + Contraseña */}
            {step === 1 && (
              <form onSubmit={handlePaso1} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Correo de Propietario
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                      placeholder="admin@volumetrix.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Contraseña Maestro
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-3.5 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs font-extrabold rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Verificando...' : 'Continuar a 2FA'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* PASO 2: Código TOTP de 6 dígitos */}
            {step === 2 && (
              <form onSubmit={handlePaso2} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Credenciales correctas. Ingresa tu código TOTP de 6 dígitos.</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 text-center">
                    Código de Autenticación 2FA
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={codigoTotp}
                    onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.8em] py-3.5 bg-background border border-border rounded-lg text-2xl font-mono font-extrabold text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 bg-secondary hover:opacity-90 text-secondary-foreground text-xs font-bold rounded-lg transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={loading || codigoTotp.length !== 6}
                    className="w-2/3 py-3 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs font-extrabold rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Validando 2FA...' : 'Ingresar a Consola'}</span>
                    <ShieldCheck size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer de confianza */}
          <div className="bg-muted/60 border-t border-border p-4 flex flex-col items-center justify-center text-center gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wide">Seguridad de Nivel Empresarial</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Protegido por la arquitectura Zero-Trust de Volumetrix.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
