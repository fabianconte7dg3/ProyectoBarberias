import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface InviteBarberoModalProps {
  isOpen: boolean;
  tenantSlug: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteBarberoModal({ isOpen, tenantSlug, onClose, onSuccess }: InviteBarberoModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState<'barbero' | 'recepcion'>('barbero');
  const [porcentajeComision, setPorcentajeComision] = useState('60');
  const [porcentajeComisionProducto, setPorcentajeComisionProducto] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ message: string; activationToken: string }>('/usuarios/invite', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto,
          rol,
          porcentajeComision: rol === 'barbero' ? parseFloat(porcentajeComision) : undefined,
          porcentajeComisionProducto: rol === 'barbero' ? parseFloat(porcentajeComisionProducto) : undefined,
        }),
      });

      setActivationToken(res.activationToken);
    } catch (err: any) {
      console.error('Error invitando staff:', err);
      setError(err.message || 'Error al invitar al integrante del equipo.');
    } finally {
      setLoading(false);
    }
  };

  const activationUrl = activationToken 
    ? `${window.location.origin}/${tenantSlug}/activar?token=${activationToken}`
    : '';

  const handleCopyLink = () => {
    if (!activationUrl) return;
    navigator.clipboard.writeText(activationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-base">
            <UserPlus size={20} className="text-primary" />
            <span>Invitar Nuevo Barbero / Staff</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!activationToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Mateo Gómez"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Rol en la Barbería
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as 'barbero' | 'recepcion')}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-semibold"
                >
                  <option value="barbero">Barbero (Cortes, Servicios & Productos)</option>
                  <option value="recepcion">Recepción / Caja</option>
                </select>
              </div>

              {rol === 'barbero' && (
                <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-3 rounded-xl border border-border">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Comisión Servicios (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={porcentajeComision}
                      onChange={(e) => setPorcentajeComision(e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Comisión Productos (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={porcentajeComisionProducto}
                      onChange={(e) => setPorcentajeComisionProducto(e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-secondary text-foreground font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors"
                >
                  {loading ? 'Generando...' : 'Generar Invitación'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>¡Invitación creada con éxito para {nombreCompleto}!</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Envía este enlace de activación al barbero para que ingrese y configure su PIN de acceso de 4 dígitos:
              </p>

              <div className="p-3 bg-secondary border border-border rounded-xl font-mono text-[11px] break-all select-all">
                {activationUrl}
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? '¡Enlace Copiado al Portapapeles!' : 'Copiar Enlace de Activación'}</span>
              </button>

              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="w-full py-2 bg-secondary text-foreground text-xs font-semibold rounded-xl"
              >
                Cerrar y Actualizar Lista
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
