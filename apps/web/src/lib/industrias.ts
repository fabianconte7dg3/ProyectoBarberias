// Multi-industria (Fase 2.1): industrias cuyo sujeto de servicio es un
// paciente/mascota propio, distinto del cliente que agenda. Ver
// docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md.
const INDUSTRIAS_CON_PACIENTES = new Set(['veterinaria', 'clinica_medica']);

export function requierePaciente(industria: string): boolean {
  return INDUSTRIAS_CON_PACIENTES.has(industria);
}
