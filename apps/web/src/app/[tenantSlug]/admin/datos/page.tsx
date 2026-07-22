'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { fetchApi } from '@/lib/api';
import { 
  ArrowLeft, Download, Upload, ShieldCheck, AlertTriangle, FileSpreadsheet, 
  Users, Package, DollarSign, CheckCircle2, RefreshCw, Info, Lock
} from 'lucide-react';

interface ReporteImportacion {
  totalFilas: number;
  creados: number;
  actualizados: number;
  rechazados: number;
  errores: Array<{ fila: number; identificador: string; motivo: string }>;
}

export default function AdminDatosPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const currentUser = useAdminStore((state) => state.user);

  // Estados de Formulario de Importación
  const [tipoImportacion, setTipoImportacion] = useState<'clientes' | 'productos'>('clientes');
  const [csvText, setCsvText] = useState('');
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [reporteResult, setReporteResult] = useState<ReporteImportacion | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados de Exportación
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push(`/${tenantSlug}/admin/login`);
      return;
    }
    if (currentUser.rol !== 'admin') {
      router.push(`/${tenantSlug}/admin/agenda`);
      return;
    }
  }, [currentUser, tenantSlug, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setErrorMessage('Por favor selecciona un archivo CSV o escribe el contenido.');
      return;
    }

    setImporting(true);
    setErrorMessage('');
    setReporteResult(null);

    try {
      const endpoint = tipoImportacion === 'clientes' 
        ? '/datos/importar/clientes' 
        : '/datos/importar/productos';

      const res = await fetchApi<ReporteImportacion>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawCsv: csvText }),
      });

      setReporteResult(res);
    } catch (err: any) {
      console.error('Error en importación:', err);
      setErrorMessage(err.message || 'Error procesando la importación.');
    } finally {
      setImporting(false);
    }
  };

  const descargarPlantilla = (tipo: 'clientes' | 'productos') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/datos/plantilla?tipo=${tipo}`, '_blank');
  };

  const descargarExportacion = (tipo: 'transacciones' | 'clientes-marketing' | 'nomina') => {
    setExporting(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/datos/exportar/${tipo}`, '_blank');
    setTimeout(() => setExporting(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header Admin */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/agenda`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-primary" />
              <span>Centro de Gestión de Datos & Migración</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Importación masiva con Merge Seguro y Exportación Sanitizada anti-inyección CSV
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <ShieldCheck size={16} />
          <span>Protección Ley 81 & OWASP Activa</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-8">
        
        {/* SECCIÓN 1: PLANTILLAS OFICIALES */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Download size={18} className="text-primary" />
                <span>1. Plantillas Oficiales de Migración (CSV / Excel)</span>
              </h2>
              <p className="text-xs text-muted-foreground pt-0.5">
                Descarga las plantillas con el formato exacto para llenar tus datos desde Excel sin errores de estructura.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => descargarPlantilla('clientes')}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Users size={14} className="text-primary" />
                <span>Plantilla Clientes</span>
              </button>
              <button
                onClick={() => descargarPlantilla('productos')}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Package size={14} className="text-emerald-500" />
                <span>Plantilla Productos</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: IMPORTACIÓN MASIVA CON MERGE SEGURO */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Upload size={18} className="text-indigo-500" />
              <span>2. Importación Masiva & Merge Seguro</span>
            </h2>
            <p className="text-xs text-muted-foreground pt-0.5">
              Si un cliente ya existe por número de WhatsApp, se actualizan sus datos de contacto sin sobreescribir su historial ni sus métricas de sistema.
            </p>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Selector de Tipo */}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Tipo de Datos a Importar
                </label>
                <select
                  value={tipoImportacion}
                  onChange={(e) => setTipoImportacion(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs font-bold text-foreground"
                >
                  <option value="clientes">Base de Clientes & Contactos</option>
                  <option value="productos">Catálogo de Productos Retail</option>
                </select>
              </div>

              {/* Selector de Archivo */}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                  Seleccionar Archivo CSV (.csv)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
              </div>

            </div>

            {/* Vista Previa / Editor de Texto CSV */}
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground block mb-1.5">
                Contenido CSV (Editar o Pegar directamente)
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="NombreCompleto,TelefonoWhatsApp,EmailFacturacion,NotasPreferencia,AceptaMarketing&#10;Juan Perez,+50766001122,juan@email.com,Prefiere degradado,SI"
                className="w-full p-3 bg-secondary/30 border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={importing || !csvText.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Procesando Importación Segura...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Iniciar Importación de {tipoImportacion === 'clientes' ? 'Clientes' : 'Productos'}</span>
                </>
              )}
            </button>
          </form>

          {/* REPORTE DE RESULTADOS DE IMPORTACIÓN */}
          {reporteResult && (
            <div className="p-5 bg-secondary/30 border border-border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>Resultado del Procesamiento</span>
                </h3>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {reporteResult.totalFilas} filas evaluadas
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Nuevos Creados</span>
                  <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{reporteResult.creados}</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Actualizados (Merge)</span>
                  <span className="text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400">{reporteResult.actualizados}</span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Rechazados / Errores</span>
                  <span className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">{reporteResult.rechazados}</span>
                </div>
              </div>

              {/* LISTA DE ERRORES POR FILA SI LOS HAY */}
              {reporteResult.errores.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block">
                    Detalle de Filas Rechazadas ({reporteResult.errores.length})
                  </span>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-card">
                    {reporteResult.errores.map((err, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 font-mono font-bold rounded text-[10px]">
                            Fila {err.fila}
                          </span>
                          <span className="font-semibold">{err.identificador}</span>
                        </div>
                        <span className="text-muted-foreground text-[11px]">{err.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </section>

        {/* SECCIÓN 3: CENTRO DE EXPORTACIÓN SEGURA (SANITIZACIÓN ANTI-FÓRMULAS & LEY 81) */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Download size={18} className="text-emerald-500" />
              <span>3. Exportación Segura de Datos & Cumplimiento Normativo</span>
            </h2>
            <p className="text-xs text-muted-foreground pt-0.5">
              Todos los archivos exportados incluyen sanitización anti-inyección de fórmulas en Excel (`OWASP CSV Injection`) y filtrado estricto para cumplimiento legal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Exportar Transacciones Financieras */}
            <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-foreground">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span>Transacciones de Caja</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Detalle completo de cobros, métodos de pago, propinas y facturación para contabilidad.
                </p>
              </div>

              <button
                onClick={() => descargarExportacion('transacciones')}
                disabled={exporting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Exportar Transacciones CSV</span>
              </button>
            </div>

            {/* Exportar Clientes Marketing Ley 81 */}
            <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-foreground">
                    <Users size={16} className="text-primary" />
                    <span>Clientes (Ley 81)</span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Opt-In Solo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Filtra estrictamente a los clientes que autorizaron recibir comunicaciones comerciales (`aceptaMarketing`).
                </p>
              </div>

              <button
                onClick={() => descargarExportacion('clientes-marketing')}
                disabled={exporting}
                className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Exportar Clientes Ley 81</span>
              </button>
            </div>

            {/* Exportar Reporte de Nómina Congelada */}
            <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-foreground">
                  <Lock size={16} className="text-indigo-500" />
                  <span>Nómina con Comisión Congelada</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calcula el pago del staff usando la comisión histórica congelada en cada transacción cobrada.
                </p>
              </div>

              <button
                onClick={() => descargarExportacion('nomina')}
                disabled={exporting}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Exportar Nómina CSV</span>
              </button>
            </div>

          </div>

          {/* Banner Informativo Ley 81 */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-1 flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground block">Nota sobre Protección de Datos Personales (Ley 81 de Panamá):</span>
              <p>
                Al exportar la base de clientes para campañas comerciales, BarberOS filtra automáticamente únicamente a aquellos usuarios que han dado su consentimiento explícito. Como responsable del tratamiento de datos, asegúrate de mantener tus comunicaciones alineadas a la normativa vigente.
              </p>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
