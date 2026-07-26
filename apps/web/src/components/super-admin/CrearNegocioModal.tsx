'use client';

import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Store, User, Mail, Link as LinkIcon, Check, Copy, AlertTriangle, X } from 'lucide-react';

interface CrearNegocioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Industria = 'barberia' | 'salon_belleza' | 'spa_masajes' | 'veterinaria' | 'clinica_medica' | 'taller_mecanico' | 'espacio_alquiler' | 'otro';

const TERMINOLOGIA_POR_INDUSTRIA: Record<Industria, { empleado: string; servicio: string; cliente: string; label: string }> = {
  barberia: { empleado: 'Barbero', servicio: 'Servicio', cliente: 'Cliente', label: 'Barbería' },
  salon_belleza: { empleado: 'Estilista', servicio: 'Servicio', cliente: 'Cliente', label: 'Salón de Belleza' },
  spa_masajes: { empleado: 'Masajista', servicio: 'Tratamiento', cliente: 'Cliente', label: 'Spa / Masajes' },
  veterinaria: { empleado: 'Veterinario', servicio: 'Consulta', cliente: 'Dueño de mascota', label: 'Veterinaria' },
  clinica_medica: { empleado: 'Doctor', servicio: 'Consulta', cliente: 'Paciente', label: 'Clínica Médica' },
  taller_mecanico: { empleado: 'Mecánico', servicio: 'Servicio', cliente: 'Cliente', label: 'Taller Mecánico' },
  espacio_alquiler: { empleado: 'Recurso', servicio: 'Alquiler', cliente: 'Cliente', label: 'Alquiler de Espacios' },
  otro: { empleado: 'Empleado', servicio: 'Servicio', cliente: 'Cliente', label: 'Otro' },
};

export default function CrearNegocioModal({ isOpen, onClose, onSuccess }: CrearNegocioModalProps) {
  const [nombreComercial, setNombreComercial] = useState('');
  const [slug, setSlug] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [planId, setPlanId] = useState<'independiente' | 'basico' | 'premium'>('independiente');
  const [industria, setIndustria] = useState<Industria>('barberia');
  const [terminologiaEmpleado, setTerminologiaEmpleado] = useState(TERMINOLOGIA_POR_INDUSTRIA.barberia.empleado);
  const [terminologiaServicio, setTerminologiaServicio] = useState(TERMINOLOGIA_POR_INDUSTRIA.barberia.servicio);
  const [terminologiaCliente, setTerminologiaCliente] = useState(TERMINOLOGIA_POR_INDUSTRIA.barberia.cliente);

  const handleIndustriaChange = (val: Industria) => {
    setIndustria(val);
    const defaults = TERMINOLOGIA_POR_INDUSTRIA[val];
    setTerminologiaEmpleado(defaults.empleado);
    setTerminologiaServicio(defaults.servicio);
    setTerminologiaCliente(defaults.cliente);
  };

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
          industria,
          terminologiaEmpleado,
          terminologiaServicio,
          terminologiaCliente,
        }),
      });

      setActivationUrl(res.activationUrl);
      onSuccess();
    } catch (err: any) {
      console.error('Error al crear negocio:', err);
      setError(err.message || 'Error al crear el negocio.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/30 text-primary rounded-xl flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Onboarding Asistido de Negocio</h2>
              <p className="text-xs text-muted-foreground">Crear tenant y generar enlace seguro de activación</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-xl">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activationUrl ? (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 text-xs space-y-2">
              <div className="font-extrabold flex items-center gap-2 text-sm text-emerald-600">
                <Check size={18} />
                <span>¡Negocio Creado Exitosamente!</span>
              </div>
              <p>
                Envía este enlace de activación al dueño del negocio para que configure su contraseña privada.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Enlace Seguro de Activación (Válido por 72 horas)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={activationUrl}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-mono text-primary focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-muted hover:bg-accent text-foreground text-xs font-bold rounded-lg transition-colors mt-2"
            >
              Cerrar y Volver a la Consola
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Nombre Comercial del Negocio
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={16} />
                <input
                  type="text"
                  required
                  value={nombreComercial}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej: Barbería El Rey"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Slug Único de URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={16} />
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="barberia-el-rey"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-xs font-mono text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Nombre del Dueño
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={16} />
                  <input
                    type="text"
                    required
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Carlos Pérez"
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Correo del Dueño
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={16} />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="carlos@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Industria del Negocio
              </label>
              <select
                value={industria}
                onChange={(e) => handleIndustriaChange(e.target.value as Industria)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(TERMINOLOGIA_POR_INDUSTRIA).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Término: Empleado
                </label>
                <input
                  type="text"
                  required
                  value={terminologiaEmpleado}
                  onChange={(e) => setTerminologiaEmpleado(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Término: Servicio
                </label>
                <input
                  type="text"
                  required
                  value={terminologiaServicio}
                  onChange={(e) => setTerminologiaServicio(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Término: Cliente
                </label>
                <input
                  type="text"
                  required
                  value={terminologiaCliente}
                  onChange={(e) => setTerminologiaCliente(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Plan Inicial
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="independiente">Plan Individual ($6/mo - Empleado Solo-preneur)</option>
                <option value="basico">Plan Básico ($29/mo - Hasta 3 Empleados)</option>
                <option value="premium">Plan Premium ($79/mo - Hasta 10 Empleados)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 bg-muted hover:bg-accent text-foreground text-xs font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !nombreComercial || !slug || !adminEmail}
                className="w-2/3 py-2.5 bg-primary hover:opacity-90 text-primary-foreground text-xs font-extrabold rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? 'Creando Negocio...' : 'Generar Enlace de Activación'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
