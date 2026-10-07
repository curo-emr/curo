import { z } from "zod";
import { ORGANIZATION_TYPES } from "@/lib/constants";

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(ORGANIZATION_TYPES, { error: "Type is required" }),
  city: z.string().optional(),
  addressLine1: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Enter a valid email")]).optional(),
  licenseNumber: z.string().optional(),
});

export type OrganizationFormInput = z.infer<typeof organizationSchema>;
