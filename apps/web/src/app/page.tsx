import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar, CreditCard, TrendingUp, Boxes, MessageCircle, ArrowRight,
  Scissors, Sparkles, Droplets, PawPrint, Stethoscope, Wrench, Building2,
  CheckCircle2, Mail,
} from 'lucide-react';

const CONTACTO_EMAIL = 'hola@volumetrixpa.com';

const FEATURES = [
  {
    icon: Calendar,
    titulo: 'Agenda en línea 24/7',
    descripcion: 'Tus clientes reservan solos desde un link público, con disponibilidad en tiempo real — sin llamadas ni idas y vueltas.',
  },
  {
    icon: CreditCard,
    titulo: 'Caja y cobros',
    descripcion: 'Cobra en efectivo, Yappy o mixto desde el mismo panel donde cierras la cita. Arqueo de caja al final del día.',
  },
  {
    icon: TrendingUp,
    titulo: 'Comisiones automáticas',
    descripcion: 'Cada cobro calcula solo la comisión del empleado según su porcentaje configurado — sin hojas de cálculo.',
  },
  {
    icon: Boxes,
    titulo: 'Multi-industria',
    descripcion: 'Un mismo motor de reservas, terminología y flujo adaptados a barbería, spa, veterinaria, clínica y más.',
  },
  {
    icon: MessageCircle,
    titulo: 'Confirmación automática',
    descripcion: 'Recordatorios y confirmación de cita, con liberación automática del horario si el cliente no confirma.',
  },
  {
    icon: CheckCircle2,
    titulo: 'Panel con métricas reales',
    descripcion: 'Ingresos, producción por empleado y catálogo de servicios en un dashboard, no en una libreta.',
  },
];

const INDUSTRIAS = [
  { icon: Scissors, label: 'Barbería' },
  { icon: Sparkles, label: 'Salón de Belleza' },
  { icon: Droplets, label: 'Spa / Masajes' },
  { icon: PawPrint, label: 'Veterinaria' },
  { icon: Stethoscope, label: 'Clínica Médica' },
  { icon: Wrench, label: 'Taller Mecánico' },
  { icon: Building2, label: 'Alquiler de Espacios' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">

      {/* Header */}
      <header className="w-full border-b border-border/60 sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-volumetrix.png" alt="Volumetrix" width={32} height={32} className="shrink-0" priority />
            <span className="text-lg font-extrabold tracking-tight">Volumetrix</span>
          </div>
          <a
            href={`mailto:${CONTACTO_EMAIL}`}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-primary text-primary-foreground font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:opacity-90 transition-opacity"
          >
            <span>Contáctanos</span>
          </a>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Fondo decorativo (gradiente de marca, sin dependencias nuevas — ver
              docs/plan.md Fase 6.6 sobre por qué no se usó el mockup three.js) */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute top-40 -left-32 w-[24rem] h-[24rem] rounded-full bg-secondary/20 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex flex-col items-center text-center gap-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              Soluciones inteligentes pensadas para ti
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl text-balance">
              El sistema operativo para tu negocio de servicios
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
              Agenda, caja, comisiones y clientes en un solo lugar — sin importar si atiendes cortes de
              cabello, mascotas o cualquier otro servicio con cita previa.
            </p>
            <a
              href={`mailto:${CONTACTO_EMAIL}`}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-bold text-sm sm:text-base rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
            >
              <span>Solicita una demo</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Todo lo que tu negocio necesita</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Un panel operativo real, no una promesa — construido para el día a día de un negocio con citas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.titulo} className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-bold text-foreground">{f.titulo}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.descripcion}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Industrias */}
        <section className="bg-muted/60 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hecho para tu industria</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                La terminología, los campos y el flujo de reserva se adaptan solos según tu vertical.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {INDUSTRIAS.map((ind) => {
                const Icon = ind.icon;
                return (
                  <div
                    key={ind.label}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-xs text-sm font-semibold"
                  >
                    <Icon size={16} className="text-primary shrink-0" />
                    <span>{ind.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="rounded-3xl bg-primary text-primary-foreground p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="text-center sm:text-left space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">¿Listo para ordenar tu negocio?</h2>
              <p className="text-primary-foreground/85 text-sm sm:text-base">Escríbenos y te ayudamos a configurar tu cuenta.</p>
            </div>
            <a
              href={`mailto:${CONTACTO_EMAIL}`}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary-foreground text-primary font-bold text-sm sm:text-base rounded-2xl shadow-md hover:opacity-90 transition-opacity shrink-0"
            >
              <Mail size={18} />
              <span>{CONTACTO_EMAIL}</span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/logo-volumetrix.png" alt="Volumetrix" width={22} height={22} className="shrink-0" />
            <span className="text-sm font-bold">Volumetrix</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Volumetrix. Panamá.</p>
        </div>
      </footer>
    </div>
  );
}
