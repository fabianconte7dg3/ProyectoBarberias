import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, LogOut, Plus, UserCheck, Lock } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useRouter } from 'next/navigation';
import { es } from 'date-fns/locale';

interface AdminHeaderProps {
  tenantSlug: string;
  userName: string;
  userRole: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onLogout: () => void;
  onNewCitaClick: () => void;
}

export function AdminHeader({
  tenantSlug,
  userName,
  userRole,
  selectedDate,
  onDateChange,
  onLogout,
  onNewCitaClick,
}: AdminHeaderProps) {
  const router = useRouter();
  const isSelectedToday = isToday(selectedDate);

  return (
    <header className="w-full bg-card border-b border-border px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
      {/* 1. Branding & Usuario */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {tenantSlug}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Agenda Operativa
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-full border border-border">
          <UserCheck size={16} className="text-primary" />
          <span className="text-xs font-medium text-foreground">{userName}</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {userRole}
          </span>
        </div>
      </div>

      {/* 2. Navegador de Fechas */}
      <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-1 shadow-inner">
        <button
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Día anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2 px-3">
          <CalendarIcon size={16} className="text-primary" />
          <span className="text-sm font-semibold capitalize min-w-[140px] text-center">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
        </div>

        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Día siguiente"
        >
          <ChevronRight size={18} />
        </button>

        {!isSelectedToday && (
          <button
            onClick={() => onDateChange(new Date())}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-1"
          >
            Hoy
          </button>
        )}
      </div>

      {/* 3. Acciones (Cierre de Caja + Nueva Cita + Logout) */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        {userRole === 'admin' && (
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/caja`)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 font-semibold rounded-xl transition-all border border-emerald-500/20 text-xs"
          >
            <Lock size={16} />
            <span>Arqueo de Caja</span>
          </button>
        )}

        <button
          onClick={onNewCitaClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md text-sm"
        >
          <Plus size={18} />
          <span>Nueva Cita (Walk-in)</span>
        </button>

        <button
          onClick={onLogout}
          className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
