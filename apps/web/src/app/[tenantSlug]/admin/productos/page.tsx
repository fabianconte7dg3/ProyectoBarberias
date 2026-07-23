'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  ArrowLeft, ShoppingBag, Plus, RefreshCw, AlertTriangle, Edit, Check, X, Package
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  costoCompra?: number;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
}

export default function AdminProductosPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Crear/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecioVenta, setFormPrecioVenta] = useState('');
  const [formCostoCompra, setFormCostoCompra] = useState('');
  const [formStockActual, setFormStockActual] = useState('');
  const [formStockMinimo, setFormStockMinimo] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  useAdminAuth({ tenantSlug, requiredRole: 'admin' });

  // Cargar datos al montar
  useEffect(() => {
    loadProductos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadProductos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<Producto[]>('/productos');
      setProductos(res);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'Error al conectar con la API de productos.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (prod?: Producto) => {
    if (prod) {
      setEditingId(prod.id);
      setFormNombre(prod.nombre);
      setFormDescripcion(prod.descripcion || '');
      setFormPrecioVenta(prod.precioVenta.toString());
      setFormCostoCompra(prod.costoCompra !== undefined ? prod.costoCompra.toString() : '');
      setFormStockActual(prod.stockActual.toString());
      setFormStockMinimo(prod.stockMinimo.toString());
    } else {
      setEditingId(null);
      setFormNombre('');
      setFormDescripcion('');
      setFormPrecioVenta('');
      setFormCostoCompra('');
      setFormStockActual('10');
      setFormStockMinimo('2');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await fetchApi(`/productos/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            nombre: formNombre,
            descripcion: formDescripcion || undefined,
            precioVenta: parseFloat(formPrecioVenta),
            costoCompra: formCostoCompra ? parseFloat(formCostoCompra) : undefined,
            stockActual: parseInt(formStockActual, 10),
            stockMinimo: parseInt(formStockMinimo, 10),
          }),
        });
      } else {
        await fetchApi('/productos', {
          method: 'POST',
          body: JSON.stringify({
            nombre: formNombre,
            descripcion: formDescripcion || undefined,
            precioVenta: parseFloat(formPrecioVenta),
            costoCompra: parseFloat(formCostoCompra) || 0,
            stockActual: parseInt(formStockActual, 10),
            stockMinimo: parseInt(formStockMinimo, 10),
          }),
        });
      }

      setIsModalOpen(false);
      loadProductos();
    } catch (err: any) {
      alert(err.message || 'Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (prod: Producto) => {
    try {
      await fetchApi(`/productos/${prod.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !prod.activo }),
      });
      loadProductos();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
              <ShoppingBag size={20} className="text-primary" />
              <span>Gestión de Productos & Inventario Retail</span>
            </h1>
            <p className="text-xs text-muted-foreground">Catálogo de ceras, pomadas, aceites y control de stock</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-xs hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-medium flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla de Productos */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Package size={18} className="text-primary" />
              <span>Inventario Disponible ({productos.length})</span>
            </h2>
            <button onClick={loadProductos} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta</th>
                  <th className="py-2.5 px-3 text-right text-muted-foreground">Costo Compra</th>
                  <th className="py-2.5 px-3 text-center">Stock Actual</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productos.map((p) => {
                  const isLowStock = p.stockActual <= p.stockMinimo;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground">{p.nombre}</div>
                        {p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${p.precioVenta.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground text-xs">
                        {p.costoCompra !== undefined ? `$${p.costoCompra.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${
                          isLowStock 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                            : 'bg-secondary text-foreground border-border'
                        }`}>
                          {p.stockActual} unidades {isLowStock && '(Stock Bajo)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.activo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(p)}
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            p.activo ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'
                          }`}
                        >
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {productos.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      No hay productos registrados en el catálogo. ¡Añade ceras o pomadas para vender en mostrador!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-bold text-base">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Cera Matte Pomade 100g"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Descripción Opcional</label>
                <input
                  type="text"
                  placeholder="Fijación fuerte, acabado mate"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="12.00"
                    value={formPrecioVenta}
                    onChange={(e) => setFormPrecioVenta(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Costo Compra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="6.00"
                    value={formCostoCompra}
                    onChange={(e) => setFormCostoCompra(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Stock Actual</label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={formStockActual}
                    onChange={(e) => setFormStockActual(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    required
                    placeholder="2"
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-foreground text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  {submitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
