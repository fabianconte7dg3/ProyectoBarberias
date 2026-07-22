'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { ShieldCheck, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Estado del flujo 2-Pasos
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('superadmin@barberos.app');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await fetchApi('/super-admin/login/verificar-totp', {
        method: 'POST',
        body: JSON.stringify({ tempToken, codigoTotp }),
      });

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Fondo con resplandor sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Branding SuperAdmin */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BarberOS SaaS Platform</h1>
          <p className="text-xs text-slate-400 font-medium">
            {step === 1 ? 'Consola Super Admin — Paso 1 de 2' : 'Verificación 2FA Obligatoria — Paso 2 de 2'}
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium flex items-center gap-3 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PASO 1: Email + Contraseña */}
        {step === 1 && (
          <form onSubmit={handlePaso1} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Correo de Propietario
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                  placeholder="superadmin@barberos.app"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Contraseña Maestro
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Verificando...' : 'Continuar a 2FA'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* PASO 2: Código TOTP de 6 dígitos */}
        {step === 2 && (
          <form onSubmit={handlePaso2} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
              <span>Credenciales correctas. Ingresa tu código TOTP de 6 dígitos.</span>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
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
                className="w-full text-center tracking-[0.8em] py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-2xl font-mono font-extrabold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading || codigoTotp.length !== 6}
                className="w-2/3 py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Validando 2FA...' : 'Ingresar a Consola'}</span>
                <ShieldCheck size={16} />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
