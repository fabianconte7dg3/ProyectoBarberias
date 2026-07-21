import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, QrCode, HeartHandshake, Package, Plus, Minus, ShoppingBag } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { CitaAgenda } from './CitaCard';

interface CobrarCitaModalProps {
  cita: CitaAgenda | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductoCatalog {
  id: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  activo: boolean;
}

interface ItemProductoSeleccionado {
  productoId: string;
  nombre: string;
  precioVenta: number;
  cantidad: number;
  stockActual: number;
}

type MetodoPago = 'efectivo' | 'yappy' | 'mixto';

export function CobrarCitaModal({ cita, isOpen, onClose, onSuccess }: CobrarCitaModalProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState<string>('');
  const [propinaBarbero, setPropinaBarbero] = useState<string>('0');
  const [rucCliente, setRucCliente] = useState('');
  const [nombreFiscalCliente, setNombreFiscalCliente] = useState('');
  
  // Productos catálogo e ítems seleccionados
  const [catalogProductos, setCatalogProductos] = useState<ProductoCatalog[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<ItemProductoSeleccionado[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProductos();
    }
  }, [isOpen]);

  const loadProductos = async () => {
    try {
      const res = await fetchApi<ProductoCatalog[]>('/productos');
      setCatalogProductos(res.filter(p => p.activo && p.stockActual > 0));
    } catch (err) {
      console.error('Error cargando catálogo de productos:', err);
    }
  };

  if (!isOpen || !cita) return null;

  const totalServicio = Number(cita.servicioPrecio || 0);
  const totalProductos = productosSeleccionados.reduce((acc, p) => acc + (p.precioVenta * p.cantidad), 0);
  const totalCobro = totalServicio + totalProductos;

  // Cálculo exacto de vuelto en centavos enteros para evitar imprecisiones de coma flotante
  const efectivoCentavos = Math.round((parseFloat(montoEfectivo) || 0) * 100);
  const totalCentavos = Math.round(totalCobro * 100);
  const vueltoCentavos = Math.max(0, efectivoCentavos - totalCentavos);
  const vuelto = (vueltoCentavos / 100).toFixed(2);

  const handleAddProducto = (prodId: string) => {
    const p = catalogProductos.find(item => item.id === prodId);
    if (!p) return;

    setProductosSeleccionados(prev => {
      const exist = prev.find(item => item.productoId === prodId);
      if (exist) {
        if (exist.cantidad >= p.stockActual) return prev;
        return prev.map(item => item.productoId === prodId ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { productoId: p.id, nombre: p.nombre, precioVenta: p.precioVenta, cantidad: 1, stockActual: p.stockActual }];
    });
  };

  const handleRemoveProducto = (prodId: string) => {
    setProductosSeleccionados(prev => {
      const exist = prev.find(item => item.productoId === prodId);
      if (exist && exist.cantidad > 1) {
        return prev.map(item => item.productoId === prodId ? { ...item, cantidad: item.cantidad - 1 } : item);
      }
      return prev.filter(item => item.productoId !== prodId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (metodoPago === 'efectivo' && efectivoCentavos < totalCentavos) {
      setError('El efectivo ingresado es menor al total del cobro');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // IdempotencyKey generado en el cliente
      const idempotencyKey = `tx_cita_${cita.id}_${crypto.randomUUID()}`;

      await fetchApi(`/citas/${cita.id}/cobrar`, {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          metodoPago,
          montoEfectivoIngresado: metodoPago === 'efectivo' ? parseFloat(montoEfectivo) : undefined,
          propinaBarbero: parseFloat(propinaBarbero) || 0,
          rucCliente: rucCliente.trim() || undefined,
          nombreFiscalCliente: nombreFiscalCliente.trim() || undefined,
          productosAdicionales: productosSeleccionados.map(p => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
          })),
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
      <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <DollarSign size={20} className="text-emerald-500" />
            <span>Cobrar Cita & Productos</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Formulario scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              <span className="font-semibold text-foreground">{cita.servicioNombre} (${totalServicio.toFixed(2)})</span>
            </div>
          </div>

          {/* Productos Adicionales (Ceras, Aceites, Pomadas) */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-primary" />
                <span>Productos Adicionales</span>
              </label>

              {catalogProductos.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddProducto(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-2.5 py-1 bg-secondary border border-border rounded-lg text-xs font-semibold"
                >
                  <option value="">+ Añadir producto...</option>
                  {catalogProductos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (${p.precioVenta.toFixed(2)}) - Stock: {p.stockActual}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Listado de Productos Seleccionados */}
            {productosSeleccionados.length > 0 ? (
              <div className="space-y-1.5 bg-secondary/20 p-3 rounded-xl border border-border">
                {productosSeleccionados.map(p => (
                  <div key={p.productoId} className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-foreground">{p.nombre} (${p.precioVenta.toFixed(2)})</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveProducto(p.productoId)}
                        className="p-1 bg-secondary hover:bg-secondary/80 rounded"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono font-bold">{p.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => handleAddProducto(p.productoId)}
                        className="p-1 bg-secondary hover:bg-secondary/80 rounded"
                      >
                        <Plus size={12} />
                      </button>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 w-14 text-right">
                        ${(p.precioVenta * p.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No se han añadido productos adicionales al cobro.</p>
            )}
          </div>

          {/* Gran Total */}
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center font-extrabold text-base">
            <span>Total Combinado a Cobrar:</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-xl font-mono">${totalCobro.toFixed(2)}</span>
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
                  min={totalCobro}
                  placeholder={totalCobro.toString()}
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

          {/* Datos Fiscales Opcionales DGI */}
          <div className="border-t border-border pt-3 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Datos para Factura Electrónica DGI (Opcional)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="RUC / Cédula"
                  value={rucCliente}
                  onChange={(e) => setRucCliente(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Nombre Fiscal Razón Social"
                  value={nombreFiscalCliente}
                  onChange={(e) => setNombreFiscalCliente(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Procesando...</span>
              ) : (
                <span>Confirmar Cobro (${totalCobro.toFixed(2)})</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
