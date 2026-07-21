import React from 'react';
import { UserCircle2 } from 'lucide-react';

interface StaffMember {
  id: string;
  nombreCompleto: string;
  rol: 'admin' | 'barbero' | 'recepcion';
}

interface ProfileSelectorProps {
  staff: StaffMember[];
  onSelect: (user: StaffMember) => void;
}

export function ProfileSelector({ staff, onSelect }: ProfileSelectorProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          ¿Quién está ingresando?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Selecciona tu usuario de turno para ingresar con tu PIN de 4 dígitos
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="group flex flex-col items-center p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-300 shadow-xs hover:shadow-md"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UserCircle2 size={36} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="font-bold text-sm sm:text-base text-card-foreground group-hover:text-primary text-center line-clamp-1">
              {member.nombreCompleto}
            </span>
            <span className="text-[11px] uppercase font-bold text-muted-foreground mt-1 px-2 py-0.5 rounded bg-secondary">
              {member.rol}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
