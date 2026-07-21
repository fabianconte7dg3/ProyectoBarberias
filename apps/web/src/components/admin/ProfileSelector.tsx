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
    <div className="w-full max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-semibold text-center mb-8 text-foreground">¿Quién está ingresando?</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="group flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-300"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserCircle2 size={48} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="font-medium text-lg text-card-foreground group-hover:text-primary">
              {member.nombreCompleto}
            </span>
            <span className="text-sm text-muted-foreground capitalize mt-1">
              {member.rol}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
