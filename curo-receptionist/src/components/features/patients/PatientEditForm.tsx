"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  patientRegistrationSchema,
  type PatientRegistrationInput,
} from "@/lib/validations/patient";
import { updatePatientDemographics } from "@/lib/actions/patient-actions";
import { ROUTES, MARITAL_STATUS } from "@/lib/constants";
import { Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronDown } from "lucide-react";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface PatientEditFormProps {
  patient: Patient;
}

export function PatientEditForm({ patient }: PatientEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(!!patient.insurance);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PatientRegistrationInput>({
    resolver: zodResolver(patientRegistrationSchema) as any,
    defaultValues: {
      nic: patient.nic,
      firstName: patient.name.first,
      lastName: patient.name.last,
      dob: patient.dob,
      sex: patient.sex,
      bloodType: patient.bloodType || "",
      nationality: patient.nationality || "Sri Lankan",
      maritalStatus: patient.maritalStatus || "single",
      occupation: patient.occupation || "",
      phone: patient.phone,
      email: patient.email || "",
      addressLine1: patient.address.line1,
      addressLine2: patient.address.line2 || "",
      city: patient.address.city,
      district: patient.address.district || "",
      postalCode: patient.address.postalCode || "",
      country: patient.address.country || "Sri Lanka",
      emergencyContactName: patient.emergencyContact?.name || "",
      emergencyContactRelationship:
        patient.emergencyContact?.relationship || "",
      emergencyContactPhone: patient.emergencyContact?.phone || "",
      insuranceProvider: patient.insurance?.provider || "",
      insurancePolicyNumber: patient.insurance?.policyNumber || "",
      insuranceGroupNumber: patient.insurance?.groupNumber || "",
      insuranceExpiryDate: patient.insurance?.expiryDate || "",
      insuranceHolderName: patient.insurance?.holderName || "",
      insuranceRelationship: patient.insurance?.relationship || "self",
      tags: patient.tags.join(", "),
    },
  });

  const onSubmit = async (data: PatientRegistrationInput) => {
    setIsSubmitting(true);
    try {
      const result = await updatePatientDemographics(patient.id, data);
      if (result.success) {
        toast.success("Patient demographics updated successfully");
        router.push(ROUTES.PATIENT(patient.id));
      } else {
        toast.error("Failed to update patient. Please check the form.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nic">NIC / Passport *</Label>
              <Input id="nic" {...register("nic")} />
              {errors.nic && (
                <p className="text-xs text-status-error-text">{errors.nic.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-status-error-text">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-status-error-text">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input id="dob" type="date" {...register("dob")} />
              {errors.dob && (
                <p className="text-xs text-status-error-text">{errors.dob.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Sex *</Label>
              <Select
                value={watch("sex") || ""}
                onValueChange={(val) =>
                  setValue("sex", val as "male" | "female" | "other", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.sex && (
                <p className="text-xs text-status-error-text">{errors.sex.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Blood Type</Label>
              <Select
                value={watch("bloodType") || ""}
                onValueChange={(val) => setValue("bloodType", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>

            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select
                value={watch("maritalStatus") || "single"}
                onValueChange={(val) =>
                  setValue(
                    "maritalStatus",
                    val as (typeof MARITAL_STATUS)[number],
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS.map((ms) => (
                    <SelectItem key={ms} value={ms}>
                      {ms.charAt(0).toUpperCase() + ms.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" {...register("occupation")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-status-error-text">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-status-error-text">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input id="addressLine1" {...register("addressLine1")} />
              {errors.addressLine1 && (
                <p className="text-xs text-status-error-text">
                  {errors.addressLine1.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input id="addressLine2" {...register("addressLine2")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register("city")} />
              {errors.city && (
                <p className="text-xs text-status-error-text">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input id="district" {...register("district")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register("postalCode")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName">Name *</Label>
              <Input
                id="emergencyContactName"
                {...register("emergencyContactName")}
              />
              {errors.emergencyContactName && (
                <p className="text-xs text-status-error-text">
                  {errors.emergencyContactName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactRelationship">
                Relationship *
              </Label>
              <Input
                id="emergencyContactRelationship"
                {...register("emergencyContactRelationship")}
              />
              {errors.emergencyContactRelationship && (
                <p className="text-xs text-status-error-text">
                  {errors.emergencyContactRelationship.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactPhone">Phone *</Label>
              <Input
                id="emergencyContactPhone"
                {...register("emergencyContactPhone")}
              />
              {errors.emergencyContactPhone && (
                <p className="text-xs text-status-error-text">
                  {errors.emergencyContactPhone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance (Collapsible) */}
      <Card className="shadow-sm border">
        <CardHeader
          className="bg-muted/50 border-b border pb-3 cursor-pointer"
          onClick={() => setInsuranceOpen(!insuranceOpen)}
        >
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-base">Insurance (Optional)</CardTitle>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                insuranceOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </CardHeader>
        {insuranceOpen && (
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="insuranceProvider">Provider</Label>
                <Input
                  id="insuranceProvider"
                  {...register("insuranceProvider")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  {...register("insurancePolicyNumber")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                <Input
                  id="insuranceGroupNumber"
                  {...register("insuranceGroupNumber")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceExpiryDate">Expiry Date</Label>
                <Input
                  id="insuranceExpiryDate"
                  type="date"
                  {...register("insuranceExpiryDate")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insuranceHolderName">Holder Name</Label>
                <Input
                  id="insuranceHolderName"
                  {...register("insuranceHolderName")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Select
                  value={watch("insuranceRelationship") || "self"}
                  onValueChange={(val) =>
                    setValue(
                      "insuranceRelationship",
                      val as "self" | "spouse" | "child" | "other"
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tags */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="e.g. VIP, Diabetic, Wheelchair"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href={ROUTES.PATIENT(patient.id)}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
