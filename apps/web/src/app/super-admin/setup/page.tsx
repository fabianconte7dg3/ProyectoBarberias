'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { ShieldCheck, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';

export default function SuperAdminSetupPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [totpSecret, setTotpSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState('');

  // 1. Verificar si realmente la plataforma requiere setup inicial
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetchApi<{ necesitaSetup: boolean }>('/super-admin/setup/status');
        if (!res.necesitaSetup) {
          router.push('/super-admin/login');
          return;
        }

        // Cargar secreto TOTP para el setup
        const setupData = await fetchApi<{ totpSecret: string; otpauthUrl: string }>('/super-admin/setup/iniciar');
        setTotpSecret(setupData.totpSecret);
        setOtpauthUrl(setupData.otpauthUrl);
      } catch (err: any) {
        console.error('Error verificando estado de setup:', err);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkStatus();
  }, [router]);

  const handlePaso1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompletarSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoTotp.length !== 6) {
      setError('El código 2FA debe tener exactamente 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ accessToken: string }>('/super-admin/setup/completar', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpSecret,
          codigoTotp,
        }),
      });

      if (res?.accessToken) {
        localStorage.setItem('super_jwt', res.accessToken);
      }

      router.push('/super-admin');
    } catch (err: any) {
      console.error('Error al completar setup de SuperAdmin:', err);
      setError(err.message || 'Error al completar la instalación del SuperAdmin.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="relative min-h-screen bg-[#091426] text-white flex items-center justify-center p-4">
        <div className="text-sm font-semibold text-[#bcc7de] flex items-center gap-2">
          <ShieldCheck className="animate-pulse" size={24} />
          <span>Verificando estado de instalación del sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#091426] text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Fondo ambiental — navy con resplandor pink, ver Executive System */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e293b] via-[#091426] to-[#091426]" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#de2264] rounded-full mix-blend-screen filter blur-[128px] opacity-10 z-0 pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Branding SuperAdmin */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white/10 border border-white/15 text-white rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-4">Instalación Inicial — Volumetrix SaaS</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#bcc7de] mt-1.5">
            Configura tu Cuenta de Propietario de Plataforma (Paso {step} de 3)
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-medium flex items-center gap-3 animate-in fade-in">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PASO 1: Email + Contraseña Privada */}
            {step === 1 && (
              <form onSubmit={handlePaso1} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Tu Correo de Propietario (SuperAdmin)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="admin@tudominio.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Crea tu Contraseña Privada de Propietario
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Confirma tu Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={18} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs font-extrabold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Continuar a Configuración 2FA</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* PASO 2: Vinculación 2FA (Clave Secreta TOTP) */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-medium space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <KeyRound size={16} />
                    <span>Vinculación de Seguridad TOTP (2FA)</span>
                  </div>
                  <p className="text-[11px] text-foreground/80">
                    Copia la clave secreta o escanéala en tu aplicación autenticadora (Google Authenticator, Authy, 1Password, etc.).
                  </p>
                </div>

                {otpauthUrl && (
                  <div className="bg-muted border border-border rounded-lg p-4 text-center space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Escanea el Código QR con tu App Autenticadora
                    </span>
                    <div className="bg-white p-3 rounded-lg inline-block shadow-sm border-2 border-primary/30">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`}
                        alt="Código QR 2FA"
                        className="w-40 h-40"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-muted border border-border rounded-lg p-4 text-center space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Clave Secreta TOTP de Plataforma
                  </span>
                  <div className="flex items-center justify-center gap-2 bg-background border border-border py-3 px-4 rounded-lg font-mono text-xl font-black text-primary tracking-widest">
                    <span>{totpSecret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar Clave Secreta"
                    >
                      {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                    </button>
                  </div>
                  {copied && <span className="text-[10px] text-emerald-600 font-bold">¡Clave copiada al portapapeles!</span>}
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
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-2/3 py-3 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-xs font-extrabold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Ya la vinculé, Continuar</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: Código de Verificación 2FA */}
            {step === 3 && (
              <form onSubmit={handleCompletarSetup} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Ingresa el código dinámico de 6 dígitos que te muestra tu app 2FA.</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 text-center">
                    Código de Verificación 2FA
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
                    onClick={() => setStep(2)}
                    className="w-1/3 py-3 bg-secondary hover:opacity-90 text-secondary-foreground text-xs font-bold rounded-lg transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={loading || codigoTotp.length !== 6}
                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-extrabold rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Finalizando...' : 'Completar Instalación'}</span>
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
