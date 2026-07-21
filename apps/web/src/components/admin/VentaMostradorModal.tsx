import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, QrCode, ShoppingBag, Plus, Minus, Package } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface VentaMostradorModalProps {
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

export function VentaMostradorModal({ isOpen, onClose, onSuccess }: VentaMostradorModalProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState<string>('');
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

  if (!isOpen) return null;

  const totalVenta = productosSeleccionados.reduce((acc, p) => acc + (p.precioVenta * p.cantidad), 0);

  const efectivoCentavos = Math.round((parseFloat(montoEfectivo) || 0) * 100);
  const totalCentavos = Math.round(totalVenta * 100);
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

    if (productosSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un producto para vender');
      return;
    }

    if (metodoPago === 'efectivo' && efectivoCentavos < totalCentavos) {
      setError('El efectivo ingresado es menor al total de la venta');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const idempotencyKey = `tx_mostrador_${crypto.randomUUID()}`;

      await fetchApi('/transacciones/mostrador', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          metodoPago,
          montoEfectivoIngresado: metodoPago === 'efectivo' ? parseFloat(montoEfectivo) : undefined,
          productosAdicionales: productosSeleccionados.map(p => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
          })),
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error procesando venta de mostrador:', err);
      setError(err.message || 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShoppingBag size={20} className="text-primary" />
            <span>Venta Directa de Mostrador</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          {/* Selector de Producto */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Seleccionar Productos a Vender
            </label>

            {catalogProductos.length > 0 ? (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProducto(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-semibold"
              >
                <option value="">+ Seleccionar producto del catálogo...</option>
                {catalogProductos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (${p.precioVenta.toFixed(2)}) - Disponibles: {p.stockActual}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground italic">No hay productos en inventario.</p>
            )}
          </div>

          {/* Carrito de Productos Seleccionados */}
          {productosSeleccionados.length > 0 && (
            <div className="space-y-1.5 bg-secondary/20 p-3 rounded-xl border border-border">
              {productosSeleccionados.map(p => (
                <div key={p.productoId} className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-foreground">{p.nombre}</span>
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
          )}

          {/* Gran Total Venta */}
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center font-extrabold text-base">
            <span>Total Venta:</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-xl font-mono">${totalVenta.toFixed(2)}</span>
          </div>

          {/* Selección de Método de Pago */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  metodoPago === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                <QrCode size={20} />
                <span>Yappy</span>
              </button>
            </div>
          </div>

          {/* Pago en Efectivo */}
          {metodoPago === 'efectivo' && (
            <div className="grid grid-cols-2 gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Efectivo Recibido</label>
                <input
                  type="number"
                  step="0.01"
                  min={totalVenta}
                  placeholder={totalVenta.toString()}
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Vuelto / Cambio</label>
                <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ${vuelto}
                </div>
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
              disabled={isLoading || productosSeleccionados.length === 0}
              className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors"
            >
              {isLoading ? 'Procesando...' : `Cobrar ($${totalVenta.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
