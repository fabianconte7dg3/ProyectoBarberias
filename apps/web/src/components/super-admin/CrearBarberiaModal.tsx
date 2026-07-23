'use client';

import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Store, User, Mail, Link as LinkIcon, Check, Copy, AlertTriangle, X } from 'lucide-react';

interface CrearBarberiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CrearBarberiaModal({ isOpen, onClose, onSuccess }: CrearBarberiaModalProps) {
  const [nombreComercial, setNombreComercial] = useState('');
  const [slug, setSlug] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [planId, setPlanId] = useState<'basico' | 'premium'>('basico');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationUrl, setActivationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleNombreChange = (val: string) => {
    setNombreComercial(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ activationUrl: string }>('/super-admin/tenants', {
        method: 'POST',
        body: JSON.stringify({
          nombreComercial,
          slug,
          adminNombre,
          adminEmail,
          planId,
        }),
      });

      setActivationUrl(res.activationUrl);
      onSuccess();
    } catch (err: any) {
      console.error('Error al crear barbería:', err);
      setError(err.message || 'Error al crear la barbería.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Onboarding Asistido de Barbería</h2>
              <p className="text-xs text-slate-400">Crear tenant y generar enlace seguro de activación</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activationUrl ? (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs space-y-2">
              <div className="font-extrabold flex items-center gap-2 text-sm text-emerald-400">
                <Check size={18} />
                <span>¡Barbería Creada Exitosamente!</span>
              </div>
              <p>
                Envía este enlace de activación al dueño de la barbería para que configure su contraseña privada.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Enlace Seguro de Activación (Válido por 72 horas)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={activationUrl}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-blue-400 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors mt-2"
            >
              Cerrar y Volver a la Consola
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nombre Comercial del Negocio
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  value={nombreComercial}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej: Barbería El Rey"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Slug Único de URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="barberia-el-rey"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nombre del Dueño
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Carlos Pérez"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Correo del Dueño
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="carlos@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Plan Inicial
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basico">Plan Básico ($29/mo - Hasta 3 Barberos)</option>
                <option value="premium">Plan Premium ($79/mo - Hasta 10 Barberos)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !nombreComercial || !slug || !adminEmail}
                className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? 'Creando Barbería...' : 'Generar Enlace de Activación'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
