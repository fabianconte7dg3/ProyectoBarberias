import React from 'react';
import { Award, Scissors, PawPrint, CalendarClock, ShieldAlert, Package } from 'lucide-react';

/**
 * Motor de widgets destacados del dashboard (Fase 2.2 — ver
 * docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §1).
 * `barberias.configWidgetsDestacados` (array de claves) decide cuáles se muestran y en
 * qué orden — el tenant lo trae pre-configurado según su industria, editable a futuro.
 * Lo que se prioriza en esta fase es el registro/motor, no cada widget individual.
 */

export interface WidgetData {
  rendimientoEmpleados: { empleadoId: string; nombreCompleto: string; totalFacturado: number }[];
  topServicios: { servicioId: string; nombre: string; totalRecaudado: number }[];
  pacientesActivosCount?: number;
  proximasRevisionesCount?: number;
  clientesStrikes: { id: string }[];
  productosStockBajoCount?: number;
}

interface WidgetProps {
  data: WidgetData;
  terminologiaEmpleado: string;
  terminologiaServicio: string;
}

function WidgetCard({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function ProduccionEmpleadoWidget({ data, terminologiaEmpleado }: WidgetProps) {
  const top = [...data.rendimientoEmpleados].sort((a, b) => b.totalFacturado - a.totalFacturado).slice(0, 3);
  return (
    <WidgetCard icon={<Award size={14} className="text-amber-500" />} titulo={`Top ${terminologiaEmpleado}s`}>
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin datos en este período.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((e) => (
            <div key={e.empleadoId} className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground truncate">{e.nombreCompleto}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">${e.totalFacturado.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function TopServiciosWidget({ data, terminologiaServicio }: WidgetProps) {
  const top = [...data.topServicios].slice(0, 3);
  return (
    <WidgetCard icon={<Scissors size={14} className="text-primary" />} titulo={`Top ${terminologiaServicio}s`}>
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin datos en este período.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((s) => (
            <div key={s.servicioId} className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground truncate">{s.nombre}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">${s.totalRecaudado.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function PacientesActivosWidget({ data }: WidgetProps) {
  return (
    <WidgetCard icon={<PawPrint size={14} className="text-indigo-500" />} titulo="Pacientes Activos">
      <p className="text-3xl font-extrabold text-foreground">{data.pacientesActivosCount ?? 0}</p>
    </WidgetCard>
  );
}

function RevisionesProximasWidget({ data }: WidgetProps) {
  const count = data.proximasRevisionesCount ?? 0;
  return (
    <WidgetCard icon={<CalendarClock size={14} className="text-rose-500" />} titulo="Próximas Revisiones (7 días)">
      <p className={`text-3xl font-extrabold ${count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{count}</p>
    </WidgetCard>
  );
}

function ClientesEnRiesgoWidget({ data }: WidgetProps) {
  return (
    <WidgetCard icon={<ShieldAlert size={14} className="text-amber-500" />} titulo="Clientes en Riesgo">
      <p className="text-3xl font-extrabold text-foreground">{data.clientesStrikes.length}</p>
    </WidgetCard>
  );
}

function StockBajoWidget({ data }: WidgetProps) {
  const count = data.productosStockBajoCount ?? 0;
  return (
    <WidgetCard icon={<Package size={14} className="text-amber-500" />} titulo="Productos con Stock Bajo">
      <p className={`text-3xl font-extrabold ${count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{count}</p>
    </WidgetCard>
  );
}

export const WIDGET_REGISTRY: Record<string, React.ComponentType<WidgetProps>> = {
  produccion_empleado: ProduccionEmpleadoWidget,
  top_servicios: TopServiciosWidget,
  pacientes_activos: PacientesActivosWidget,
  revisiones_proximas: RevisionesProximasWidget,
  clientes_en_riesgo: ClientesEnRiesgoWidget,
  stock_bajo: StockBajoWidget,
};
