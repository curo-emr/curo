import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(
    ["DOCTOR", "RECEPTIONIST", "PHARMACIST", "LAB_STAFF", "PATIENT", "SUPER_ADMIN"],
    { error: "Role is required" },
  ),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
