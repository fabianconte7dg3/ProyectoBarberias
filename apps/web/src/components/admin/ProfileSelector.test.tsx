import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProfileSelector } from './ProfileSelector';
import { TenantProvider, type TenantPublica } from '@/lib/tenant-context';

// Regresión del fix de Fase 3 (docs/plan.md): el badge de rol mostraba el valor crudo del enum
// ("empleado") en vez de leer la terminología dinámica del tenant (ver CLAUDE.md — "Dynamic
// terminology"). Un tenant de veterinaria de prueba prueba justamente el caso que expuso el bug.
const tenantVeterinaria: TenantPublica = {
  nombreComercial: 'Veterinaria de Test',
  slug: 'vet-test',
  colorPrimario: null,
  logoUrl: null,
  industria: 'veterinaria',
  terminologiaEmpleado: 'Veterinario',
  terminologiaServicio: 'Consulta',
  terminologiaCliente: 'Dueño de mascota',
  configCamposPersonalizados: [],
  configWidgetsDestacados: [],
  killSwitchActivo: false,
};

describe('ProfileSelector', () => {
  afterEach(() => cleanup());

  it('muestra la terminología dinámica del tenant en vez del rol crudo', () => {
    render(
      <TenantProvider tenant={tenantVeterinaria}>
        <ProfileSelector
          staff={[{ id: '1', nombreCompleto: 'Ana Pérez', rol: 'empleado' }]}
          onSelect={() => {}}
        />
      </TenantProvider>,
    );

    expect(screen.queryByText('Veterinario')).not.toBeNull();
    expect(screen.queryByText('empleado')).toBeNull();
  });

  it('admin y recepción muestran una etiqueta genérica, no la terminología del vertical', () => {
    render(
      <TenantProvider tenant={tenantVeterinaria}>
        <ProfileSelector
          staff={[
            { id: '2', nombreCompleto: 'Carla Admin', rol: 'admin' },
            { id: '3', nombreCompleto: 'Roberto Recep', rol: 'recepcion' },
          ]}
          onSelect={() => {}}
        />
      </TenantProvider>,
    );

    expect(screen.queryByText('Administrador')).not.toBeNull();
    expect(screen.queryByText('Recepción')).not.toBeNull();
  });
});
