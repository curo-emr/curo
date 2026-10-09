import { z } from "zod";
import { VISIT_TYPE_CODES } from "@curo/web/appointments";

export const bookAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time slot is required"),
  /** The slot's length, from the doctor's session. */
  minutes: z.number().int().positive(),
  visitType: z.enum(VISIT_TYPE_CODES, { message: "Visit type is required" }),
  reason: z.string().min(1, "Reason for visit is required"),
  notes: z.string().optional().default(""),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
