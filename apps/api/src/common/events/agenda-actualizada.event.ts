// Evento interno (EventEmitter2, en memoria del proceso — ver limitación de escalado
// horizontal documentada en Plan_Sistema_Agenda_AntiAbuso_Confirmacion.md §1) emitido
// cada vez que cambia la disponibilidad de un empleado en una fecha dada: crear/cancelar
// una cita, o crear un bloqueo temporal. Consumido por el endpoint SSE de horarios.

export const AGENDA_ACTUALIZADA = 'agenda.actualizada';

export interface AgendaActualizadaPayload {
  tenantId: string;
  empleadoId: string;
  fecha: string; // YYYY-MM-DD, mismo formato que horarios.service.ts:getDisponibilidad
}
