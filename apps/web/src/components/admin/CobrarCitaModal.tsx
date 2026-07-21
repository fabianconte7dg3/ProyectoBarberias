import React, { useState } from 'react';
import { X, DollarSign, CreditCard, QrCode, Receipt, CheckCircle, HeartHandshake } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { CitaAgenda } from './CitaCard';

interface CobrarCitaModalProps {
  cita: CitaAgenda | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type MetodoPago = 'efectivo' | 'yappy' | 'mixto';

export function CobrarCitaModal({ cita, isOpen, onClose, onSuccess }: CobrarCitaModalProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState<string>('');
  const [propinaBarbero, setPropinaBarbero] = useState<string>('0');
  const [rucCliente, setRucCliente] = useState('');
  const [nombreFiscalCliente, setNombreFiscalCliente] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !cita) return null;

  const totalServicio = cita.servicioPrecio || 0;
  
  // Cálculo exacto de vuelto en centavos enteros para evitar imprecisiones de coma flotante
  const efectivoCentavos = Math.round((parseFloat(montoEfectivo) || 0) * 100);
  const totalCentavos = Math.round(totalServicio * 100);
  const vueltoCentavos = Math.max(0, efectivoCentavos - totalCentavos);
  const vuelto = (vueltoCentavos / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (metodoPago === 'efectivo' && efectivoCentavos < totalCentavos) {
      setError('El efectivo ingresado es menor al total del servicio');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await fetchApi(`/citas/${cita.id}/cobrar`, {
        method: 'POST',
        body: JSON.stringify({
          metodoPago,
          montoEfectivoIngresado: metodoPago === 'efectivo' ? parseFloat(montoEfectivo) : undefined,
          propinaBarbero: parseFloat(propinaBarbero) || 0,
          rucCliente: rucCliente.trim() || undefined,
          nombreFiscalCliente: nombreFiscalCliente.trim() || undefined,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error procesando cobro:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <DollarSign size={20} className="text-emerald-500" />
            <span>Cobrar Cita</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          {/* Resumen del Servicio & Barbero */}
          <div className="bg-secondary/40 p-4 rounded-xl border border-border space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Cliente:</span>
              <span className="font-semibold text-foreground">{cita.clienteNombre}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Barbero:</span>
              <span className="font-semibold text-foreground">{cita.barberoNombre}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Servicio:</span>
              <span className="font-semibold text-foreground">{cita.servicioNombre}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center text-base font-bold">
              <span>Total a Cobrar:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-lg">${totalServicio.toFixed(2)}</span>
            </div>
          </div>

          {/* Selección de Método de Pago */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  metodoPago === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                <DollarSign size={20} />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('yappy')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  metodoPago === 'yappy'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                <QrCode size={20} />
                <span>Yappy</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('mixto')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  metodoPago === 'mixto'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                <CreditCard size={20} />
                <span>Mixto</span>
              </button>
            </div>
          </div>

          {/* Pago en Efectivo: Input de Monto e Indicador de Vuelto */}
          {(metodoPago === 'efectivo' || metodoPago === 'mixto') && (
            <div className="grid grid-cols-2 gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Efectivo Recibido ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={totalServicio}
                  placeholder={totalServicio.toString()}
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Vuelto / Cambio ($)
                </label>
                <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                  ${vuelto}
                </div>
              </div>
            </div>
          )}

          {/* Propina al Barbero */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <HeartHandshake size={14} className="text-rose-500" />
              <span>Propina para {cita.barberoNombre} ($)</span>
            </label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={propinaBarbero}
              onChange={(e) => setPropinaBarbero(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm font-mono"
            />
          </div>

          {/* Facturación DGI Opcional */}
          <div className="pt-2 border-t border-border space-y-3">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Receipt size={14} />
              <span>Factura Electrónica DGI (Opcional)</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="RUC / Cédula"
                value={rucCliente}
                onChange={(e) => setRucCliente(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Razón Social / Nombre"
                value={nombreFiscalCliente}
                onChange={(e) => setNombreFiscalCliente(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <CheckCircle size={16} />
              <span>{isLoading ? 'Procesando...' : 'Confirmar Cobro'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
