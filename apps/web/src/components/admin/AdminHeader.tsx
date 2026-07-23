import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, LogOut, Plus, 
  UserCheck, Lock, TrendingUp, Settings, Menu, X, Calendar, ShoppingBag, Users, Award, Database, Link2, Check, Share2
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';
import { es } from 'date-fns/locale';

interface AdminHeaderProps {
  tenantSlug: string;
  userName: string;
  userRole: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onLogout: () => void;
  onNewCitaClick: () => void;
  onMiDesempenoClick?: () => void;
  onVentaMostradorClick?: () => void;
}

export function AdminHeader({
  tenantSlug,
  userName,
  userRole,
  selectedDate,
  onDateChange,
  onLogout,
  onNewCitaClick,
  onMiDesempenoClick,
  onVentaMostradorClick,
}: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isSelectedToday = isToday(selectedDate);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/${tenantSlug}/reservar`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isAdmin = userRole === 'admin';

  const navLinks = [
    { label: 'Agenda', href: `/${tenantSlug}/admin/agenda`, icon: Calendar },
    ...(isAdmin ? [
      { label: 'Barberos', href: `/${tenantSlug}/admin/barberos`, icon: Users },
      { label: 'Clientes', href: `/${tenantSlug}/admin/clientes`, icon: UserCheck },
      { label: 'Métricas', href: `/${tenantSlug}/admin/dashboard`, icon: TrendingUp },
      { label: 'Productos', href: `/${tenantSlug}/admin/productos`, icon: ShoppingBag },
      { label: 'Datos', href: `/${tenantSlug}/admin/datos`, icon: Database },
      { label: 'Caja', href: `/${tenantSlug}/admin/caja`, icon: Lock },
      { label: 'Configuración', href: `/${tenantSlug}/admin/configuracion`, icon: Settings },
    ] : []),
  ];

  return (
    <header className="w-full bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs">
      
      {/* Container Principal Desktop / Mobile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* 1. Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {tenantSlug}
            </span>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
              <span>BarberOS</span>
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-full border border-border">
            <UserCheck size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">{userName}</span>
            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {userRole}
            </span>
          </div>
        </div>

        {/* 2. Navegador de Fechas (Centrado en Pantallas Medianas / Grandes) */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner text-xs sm:text-sm">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Día anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-2 sm:px-3">
            <CalendarIcon size={14} className="text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-bold capitalize whitespace-nowrap">
              {format(selectedDate, "EEE d 'de' MMM", { locale: es })}
            </span>
          </div>

          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Día siguiente"
          >
            <ChevronRight size={16} />
          </button>

          {!isSelectedToday && (
            <button
              onClick={() => onDateChange(new Date())}
              className="text-[11px] font-bold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-0.5"
            >
              Hoy
            </button>
          )}
        </div>

        {/* 3. Menú Navegación Desktop & Acciones */}
        <div className="hidden md:flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-card text-foreground font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <Icon size={15} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Botón Copiar Link de Reservas */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl border transition-all shadow-xs ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
            }`}
            title="Copiar link público de reservas para compartir en redes"
          >
            {copiedLink ? <Check size={16} /> : <Link2 size={16} />}
            <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Link'}</span>
          </button>

          {/* Botón Mi Desempeño (Para Barbero / Recepción) */}
          {onMiDesempenoClick && (
            <button
              onClick={onMiDesempenoClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-extrabold rounded-xl transition-colors shadow-xs"
              title="Ver mis comisiones e ingresos"
            >
              <Award size={16} />
              <span>Mi Desempeño</span>
            </button>
          )}

          {/* Botón Venta Mostrador (Productos POS) */}
          {onVentaMostradorClick && (
            <button
              onClick={onVentaMostradorClick}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              title="Venta rápida de productos de mostrador"
            >
              <ShoppingBag size={16} />
              <span>Venta Mostrador</span>
            </button>
          )}

          <button
            onClick={onNewCitaClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            <span>Cita</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-xl transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* 4. Botón Menú Móvil */}
        <div className="flex md:hidden items-center gap-2">
          {onMiDesempenoClick && (
            <button
              onClick={onMiDesempenoClick}
              className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl"
              title="Mi Desempeño"
            >
              <Award size={18} />
            </button>
          )}

          <button
            onClick={onNewCitaClick}
            className="p-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-xs"
            title="Nueva Cita"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground bg-secondary rounded-xl border border-border"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Menú Desplegable en Móviles */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          
          <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-primary" />
              <span className="text-xs font-bold">{userName}</span>
            </div>
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-primary/10 text-primary">
              {userRole}
            </span>
          </div>

          <button
            onClick={() => {
              handleCopyLink();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-extrabold text-xs rounded-xl"
          >
            {copiedLink ? <Check size={16} /> : <Link2 size={16} />}
            <span>{copiedLink ? '¡Enlace Copiado al Portapapeles!' : 'Copiar Link Público de Reservas'}</span>
          </button>

          {onMiDesempenoClick && (
            <button
              onClick={() => {
                onMiDesempenoClick();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-xl"
            >
              <Award size={16} />
              <span>Ver Mi Desempeño & Comisiones</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

    </header>
  );
}
