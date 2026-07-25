// Multi-industria (Fase 2.1): industrias cuyo sujeto de servicio es un
// paciente/mascota propio, distinto del cliente que agenda. Ver
// docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase3_DatosPorVertical.md.
const INDUSTRIAS_CON_PACIENTES = new Set(['veterinaria', 'clinica_medica']);

export function requierePaciente(industria: string): boolean {
  return INDUSTRIAS_CON_PACIENTES.has(industria);
}

// Fase 2.3: mismas industrias hoy, pero es un concepto distinto (motivo de la
// visita vs. sujeto del servicio) — ver CitasService.INDUSTRIAS_QUE_EXIGEN_MOTIVO
// en el backend y Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §6.
const INDUSTRIAS_QUE_EXIGEN_MOTIVO = new Set(['veterinaria', 'clinica_medica']);

export function requiereMotivo(industria: string): boolean {
  return INDUSTRIAS_QUE_EXIGEN_MOTIVO.has(industria);
}
