'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  ArrowLeft, DollarSign, Lock, AlertTriangle, CheckCircle2, 
  HelpCircle, Receipt, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

interface BalanceState {
  fecha: string;
  efectivoEsperado: number;
  cantidadTransaccionesEfectivo: number;
}

export default function AdminCajaPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const logout = useAdminStore((state) => state.logout);

  const [balance, setBalance] = useState<BalanceState | null>(null);
  const [efectivoDeclarado, setEfectivoDeclarado] = useState<string>('');
  const [notasAdmin, setNotasAdmin] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  // Cargar datos al montar
  useEffect(() => {
    fetchBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchBalance = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<BalanceState>('/caja/balance');
      setBalance(data);
    } catch (err: any) {
      console.error('Error al cargar balance de caja:', err);
      setError(err.message || 'Error al conectar con la caja');
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de diferencia en centavos
  const esperadoCentavos = Math.round((balance?.efectivoEsperado || 0) * 100);
  const declaradoCentavos = Math.round((parseFloat(efectivoDeclarado) || 0) * 100);
  const diferenciaCentavos = declaradoCentavos - esperadoCentavos;
  const diferencia = (diferenciaCentavos / 100).toFixed(2);

  let estadoCaja: 'cuadrado' | 'sobrante' | 'faltante' = 'cuadrado';
  if (diferenciaCentavos > 0) estadoCaja = 'sobrante';
  if (diferenciaCentavos < 0) estadoCaja = 'faltante';

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !balance) return;

    if (efectivoDeclarado === '') {
      setError('Por favor ingrese el monto de efectivo contado en caja.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await fetchApi('/caja/cerrar', {
        method: 'POST',
        body: JSON.stringify({
          efectivoDeclarado: parseFloat(efectivoDeclarado),
          notasAdmin: notasAdmin.trim() || undefined,
        }),
      });

      setSuccessMsg('¡Arqueo de caja guardado con éxito! Registro auditado generado.');
      setTimeout(() => {
        router.push(`/${tenantSlug}/admin/agenda`);
      }, 2000);
    } catch (err: any) {
      console.error('Error al cerrar caja:', err);
      setError(err.message || 'Error al ejecutar cierre de caja');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-semibold text-sm">Cargando balance de caja en tiempo real...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Lock size={18} className="text-emerald-500" />
              <span>Arqueo y Cierre de Caja</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Auditoría financiera diaria · Exclusivo Administración
            </p>
          </div>
        </div>

        <button
          onClick={fetchBalance}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tarjetas de Balance Generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Efectivo Esperado (Sistema)
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ${(balance?.efectivoEsperado || 0).toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Sumatoria de cobros en efectivo y mixto del día
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Transacciones en Efectivo
            </span>
            <div className="text-3xl font-extrabold text-foreground font-mono">
              {balance?.cantidadTransaccionesEfectivo || 0}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Operaciones registradas hoy
            </span>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Estado de Cuadre
            </span>
            <div className="flex items-center gap-2">
              {estadoCaja === 'cuadrado' && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>CUADRADO</span>
                </span>
              )}
              {estadoCaja === 'faltante' && (
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>FALTANTE (-${Math.abs(Number(diferencia)).toFixed(2)})</span>
                </span>
              )}
              {estadoCaja === 'sobrante' && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>SOBRANTE (+${Math.abs(Number(diferencia)).toFixed(2)})</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground block pt-1">
              Diferencia: ${diferencia}
            </span>
          </div>

        </div>

        {/* Formulario de Arqueo Físico */}
        <form onSubmit={handleCerrarCaja} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Receipt size={18} className="text-emerald-500" />
              <span>Conteo de Efectivo Físico en Gaveta</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingrese el monto total en billetes y monedas contado al momento del cierre.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Efectivo Declarado */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                Efectivo Contado Declarado ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={efectivoDeclarado}
                onChange={(e) => setEfectivoDeclarado(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-xl font-bold font-mono focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Visualizador de Comparación en Vivo */}
            <div className="bg-secondary/40 p-4 rounded-xl border border-border flex flex-col justify-center space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Esperado según Sistema:</span>
                <span className="font-mono font-bold">${(balance?.efectivoEsperado || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Declarado Físicamente:</span>
                <span className="font-mono font-bold">${(parseFloat(efectivoDeclarado) || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center text-sm font-bold">
                <span>Diferencia de Arqueo:</span>
                <span className={`font-mono text-base ${
                  diferenciaCentavos === 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : diferenciaCentavos < 0 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {diferenciaCentavos > 0 ? `+$${diferencia}` : `$${diferencia}`}
                </span>
              </div>
            </div>

          </div>

          {/* Advertencia de Auditoría ante Descuadre */}
          {diferenciaCentavos !== 0 && efectivoDeclarado !== '' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Alerta de Descuadre Financiero</span>
                Se registrará una entrada inmutable de auditoría (con IP y navegador) notificando la discrepancia de <strong className="font-mono">${diferencia}</strong> al sistema.
              </div>
            </div>
          )}

          {/* Notas de Admin */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Notas o Justificación de la Administración (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ej. Faltante de $0.50 en monedas por falta de cambio durante el turno..."
              value={notasAdmin}
              onChange={(e) => setNotasAdmin(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
              className="px-5 py-2.5 text-sm font-medium hover:bg-secondary rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Lock size={16} />
              <span>{submitting ? 'Guardando Arqueo Inmutable...' : 'Realizar Arqueo y Cerrar Caja'}</span>
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
