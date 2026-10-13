"use client";

import { useWatch } from "react-hook-form";
import { ALLERGY_SEVERITIES, formatAllergySeverity, type AllergySeverity } from "../fhir/allergy";
import type { PatientForm } from "../patients/schema";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/** The severity of one allergy in a patient form's list, "Severity unknown" until someone chooses. */
export function AllergySeverityField({ form, index }: { form: PatientForm; index: number }) {
  const name = `allergies.${index}.severity` as const;
  const severity = useWatch({ control: form.control, name }) ?? "unknown";

  return (
    <div className="space-y-1.5">
      <Label>Severity</Label>
      <Select value={severity} onValueChange={(value) => form.setValue(name, value as AllergySeverity)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALLERGY_SEVERITIES.map((s) => (
            <SelectItem key={s} value={s}>{formatAllergySeverity(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
