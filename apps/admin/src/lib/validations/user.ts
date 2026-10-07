import { z } from "zod";
import { USER_ROLES, WORKPLACE_REQUIRED } from "@/lib/constants";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(USER_ROLES, { error: "Role is required" }),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
  organizationId: z.string().optional(),
}).refine((u) => u.organizationId || !WORKPLACE_REQUIRED.includes(u.role), {
  message: "Choose where they work",
  path: ["organizationId"],
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
