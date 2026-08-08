import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ResetPinModalProps {
  isOpen: boolean;
  usuario: { id: string; nombreCompleto: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPinModal({ isOpen, usuario, onClose, onSuccess }: ResetPinModalProps) {
  const [nuevoPin, setNuevoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !usuario) return null;

  const handleClose = () => {
    setNuevoPin('');
    setConfirmarPin('');
    setError('');
    setSuccessMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoPin.length !== 4 || !/^\d{4}$/.test(nuevoPin)) {
      setError('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setError('Los PINs ingresados no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ message: string }>(`/usuarios/${usuario.id}/reset-pin`, {
        method: 'POST',
        body: JSON.stringify({ nuevoPin }),
      });
      setSuccessMsg(res.message);
    } catch (err: any) {
      console.error('Error reseteando PIN:', err);
      setError(err.message || 'Error al resetear el PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-base">
            <KeyRound size={20} className="text-primary" />
            <span>Resetear PIN de {usuario.nombreCompleto}</span>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-secondary-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {successMsg ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte el nuevo PIN de forma segura con {usuario.nombreCompleto} para que pueda volver a ingresar.
              </p>
              <button
                onClick={() => { onSuccess(); handleClose(); }}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Define un nuevo PIN de 4 dígitos para que {usuario.nombreCompleto} pueda volver a ingresar
                (útil si olvidó el suyo). Reemplaza al PIN anterior de inmediato.
              </p>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Nuevo PIN de 4 Dígitos
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full text-center tracking-[1em] py-3 bg-secondary/50 border border-border rounded-xl text-lg font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Confirmar Nuevo PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmarPin}
                  onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full text-center tracking-[1em] py-3 bg-secondary/50 border border-border rounded-xl text-lg font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || nuevoPin.length !== 4 || confirmarPin.length !== 4}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Reseteando...' : 'Resetear PIN'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
