import { z } from 'zod';
import { parse, isPast } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { parsePhoneNumberWithError } from 'libphonenumber-js';

// MOCK: Tipos que posteriormente se autogenerarán desde OpenAPI (NestJS)
export interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioBase: string; 
}

export interface Empleado {
  id: string;
  nombre: string;
  fotoUrl?: string | null;
}

// Combo de servicios (bundle rastreado) — ver
// docs/02-arquitectura-y-db/Plan_Multi_Industria_Fase4_CombosGruposTemplates.md §2.
export interface ComboPublico {
  id: string;
  nombre: string;
  precioTotal: string;
  duracionAjustadaMinutos: number | null;
  servicios: { servicioId: string; servicio: Servicio }[];
}

// Zod Schema para validar el estado de la reserva en el Frontend
// Este schema asegura que no se pueda continuar sin datos válidos.
// Exactamente uno de servicioId/comboId debe estar presente (mismo criterio de
// aplicación, no de constraint, que usa el backend — ver create-cita.dto.ts).
export const reservaSeleccionSchema = z.object({
  servicioId: z.string().uuid().optional(),
  comboId: z.string().uuid().optional(),
  // empleadoId puede ser null para la opción "Cualquier Empleado",
  // lo que indica al backend que asigne según disponibilidad.
  empleadoId: z.string().uuid().nullable().refine(val => val !== undefined, {
    message: "Por favor selecciona un empleado.",
  }),
}).refine((data) => Boolean(data.servicioId) !== Boolean(data.comboId), {
  message: "Por favor selecciona un servicio o un combo.",
  path: ["servicioId"],
});

export type ReservaSeleccionState = z.infer<typeof reservaSeleccionSchema>;

// Zod Schema para la selección de Fecha y Hora (Paso 2)
export const reservaFechaHoraSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"), // formato HH:mm (24h internamente)
}).refine((data) => {
  // Validación de seguridad: no permitir reservar en el pasado (hidratando la zona local temporalmente)
  // TODO: Deuda técnica - Usar date-fns-tz con la zona horaria del tenant cuando se conecte al backend
  const dateTimeStr = `${data.fecha} ${data.hora}`;
  const dateObj = parse(dateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
  return !isPast(dateObj); 
}, {
  message: "La hora seleccionada ya ha pasado.",
  path: ["hora"]
});

export type ReservaFechaHoraState = z.infer<typeof reservaFechaHoraSchema>;

// Zod Schema para la validación final del cliente (Formulario Express)
export const reservaClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "Nombre muy largo"),
  telefono: z.string().min(1, "El teléfono es requerido").refine((val) => {
    try {
      // Intentamos parsear asumiendo Panamá (+507) si no proveen código de país
      const phoneNumber = parsePhoneNumberWithError(val, 'PA');
      return phoneNumber.isValid();
    } catch (e) {
      return false;
    }
  }, {
    message: "Número de WhatsApp inválido",
  }),
});

export type ReservaClienteState = z.infer<typeof reservaClienteSchema>;
