import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { ALLERGY_SEVERITIES, INSURANCE_RELATIONSHIPS, MARITAL_STATUSES } from "../fhir";

const allergyEntrySchema = z.object({
  /** Set for an allergy already on record. */
  id: z.string().optional(),
  substance: z.string().trim().min(1, "Substance is required"),
  // Optional: patients often know what they react to but not how, and older
  // records have no reaction at all.
  reaction: z.string().optional().default(""),
  severity: z.enum(ALLERGY_SEVERITIES).default("mild"),
  notes: z.string().optional().default(""),
});

/** The doctor and reception portals' patient form, shared by registration and edit. */
export const patientFormSchema = z.object({
  // NIC is optional: minors have no NIC. The Personal Health Number is the unique ID.
  nic: z.string().optional().default(""),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["male", "female", "other"], { error: "Sex is required" }),
  bloodType: z.string().optional().default(""),
  nationality: z.string().optional().default("Sri Lankan"),
  maritalStatus: z.enum(MARITAL_STATUSES).optional(),
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
  insuranceRelationship: z.enum(INSURANCE_RELATIONSHIPS).optional().default("self"),
  /** Comma-separated. */
  tags: z.string().optional().default(""),
  allergies: z.array(allergyEntrySchema).optional().default([]),
});

/** What a patient form holds while it's edited, before the schema fills in defaults. */
export type PatientFormInput = z.input<typeof patientFormSchema>;
/** What a patient form produces on a valid submit. */
export type PatientFormValues = z.infer<typeof patientFormSchema>;
/** One row of a patient form's allergy list. */
export type AllergyEntry = z.infer<typeof allergyEntrySchema>;

export type PatientForm = UseFormReturn<PatientFormInput, unknown, PatientFormValues>;
