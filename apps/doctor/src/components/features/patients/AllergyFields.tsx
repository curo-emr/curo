"use client";

import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { ALLERGY_SEVERITIES, type AllergySeverity } from "@curo/web/fhir";
import { formatStatus } from "@curo/web/format";
import { Button } from "@curo/web/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import type { PatientRegistrationFormValues, PatientRegistrationInput } from "@/lib/validations/patient";

type PatientForm = UseFormReturn<PatientRegistrationFormValues, unknown, PatientRegistrationInput>;

/** The patient forms' allergy list. A recorded allergy removed here is retired when the form is saved. */
export function AllergyFields({ form }: { form: PatientForm }) {
  const { control, register, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "allergies" });
  const allergies = useWatch({ control, name: "allergies" }) ?? [];
  const hasRecorded = allergies.some((a) => a.id);

  return (
    <Card className="gap-0">
      <CardHeader className="px-5 pt-4 pb-1">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-sm font-semibold">Allergies</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ substance: "", reaction: "", severity: "mild", notes: "" })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Allergy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allergies recorded. Click &apos;Add Allergy&apos; to add one.</p>
        ) : (
          <div className="space-y-3">
            {hasRecorded && (
              <p className="text-xs text-muted-foreground">
                Removing a recorded allergy marks it inactive. It stays on the patient&apos;s record.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-md p-3 bg-muted/20 relative">
                <button
                  type="button"
                  aria-label="Remove allergy"
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                  <div className="space-y-1.5">
                    <Label>Substance *</Label>
                    <Input {...register(`allergies.${index}.substance`)} placeholder="e.g. Penicillin" />
                    {errors.allergies?.[index]?.substance && (
                      <p className="text-xs text-status-error-text">{errors.allergies[index].substance?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reaction</Label>
                    <Input {...register(`allergies.${index}.reaction`)} placeholder="e.g. Rash, Anaphylaxis" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select
                      value={allergies[index]?.severity || "mild"}
                      onValueChange={(val) => setValue(`allergies.${index}.severity`, val as AllergySeverity)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLERGY_SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Input {...register(`allergies.${index}.notes`)} placeholder="Additional notes (optional)" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
