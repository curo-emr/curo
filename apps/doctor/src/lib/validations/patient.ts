import { z } from "zod";

const allergyEntrySchema = z.object({
  substance: z.string().min(1, "Substance is required"),
  reaction: z.string().min(1, "Reaction is required"),
  severity: z.enum(["mild", "moderate", "severe"]).default("mild"),
  notes: z.string().optional().default(""),
});

export type AllergyEntryInput = z.infer<typeof allergyEntrySchema>;

export const patientRegistrationSchema = z.object({
  nic: z.string().min(1, "NIC/Passport number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["male", "female", "other"], { error: "Sex is required" }),
  bloodType: z.string().optional().default(""),
  nationality: z.string().optional().default("Sri Lankan"),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"]).optional().default("single"),
  occupation: z.string().optional().default(""),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  district: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("Sri Lanka"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  insuranceProvider: z.string().optional().default(""),
  insurancePolicyNumber: z.string().optional().default(""),
  insuranceGroupNumber: z.string().optional().default(""),
  insuranceExpiryDate: z.string().optional().default(""),
  insuranceHolderName: z.string().optional().default(""),
  insuranceRelationship: z.enum(["self", "spouse", "child", "other"]).optional().default("self"),
  tags: z.string().optional().default(""),
  allergies: z.array(allergyEntrySchema).optional().default([]),
});

// What the form holds (defaults not yet applied) vs. what a valid submit produces.
export type PatientRegistrationFormValues = z.input<typeof patientRegistrationSchema>;
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;
