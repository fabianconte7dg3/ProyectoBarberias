'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface CampoPersonalizado {
  entidad: string;
  clave: string;
  etiqueta: string;
  tipo: 'texto' | 'numero' | 'fecha';
  requerido: boolean;
}

export interface TenantPublica {
  nombreComercial: string;
  slug: string;
  colorPrimario: string | null;
  logoUrl: string | null;
  industria: string;
  terminologiaEmpleado: string;
  terminologiaServicio: string;
  terminologiaCliente: string;
  configCamposPersonalizados: CampoPersonalizado[];
  configWidgetsDestacados: string[];
  // Pausa de Auto-Servicio (ver matriz-permisos-y-bloqueos.md §2) — el portal de
  // reserva pública muestra un banner bloqueante cuando está activa.
  killSwitchActivo: boolean;
}

const TenantContext = createContext<TenantPublica | null>(null);

export function TenantProvider({ tenant, children }: { tenant: TenantPublica; children: ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantPublica {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useTenant() debe usarse dentro de un <TenantProvider>. ¿Falta envolver el árbol en [tenantSlug]/layout.tsx?');
  }
  return tenant;
}
