"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabOrder, Patient, LabTestCatalogItem } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FlaskConical, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ResultsEntryFormProps {
  order: LabOrder;
  patient: Patient;
  testCatalog: LabTestCatalogItem[];
}

export function ResultsEntryForm({ order, patient, testCatalog }: ResultsEntryFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateValue = (componentId: string, value: string) => {
    setValues(prev => ({ ...prev, [componentId]: value }));
  };

  const updateNote = (componentId: string, note: string) => {
    setNotes(prev => ({ ...prev, [componentId]: note }));
  };

  const getAutoFlag = (value: string, low: number, high: number) => {
    if (!value || isNaN(Number(value))) return null;
    const num = Number(value);
    if (low === 0 && high === 0) return null;
    if (num < low) return 'low';
    if (num > high) return 'high';
    return 'normal';
  };

  const handleSave = () => {
    toast.success("Results saved successfully (demo mode)");
  };

  const handleSubmit = () => {
    toast.success("Results submitted for verification (demo mode)");
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Order ID</p>
              <p className="font-mono font-medium text-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Patient</p>
              <p className="font-medium text-foreground">{patient.name.full}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results Entry */}
      {order.tests.map(orderTest => {
        const test = testCatalog.find(t => t.id === orderTest.testId);
        if (!test) return null;
        const components = test.components ?? [];

        return (
          <Card key={orderTest.testId} className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-primary" />
                {test.name}
                <span className="text-xs font-normal text-muted-foreground">({test.code})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {components.map(component => {
                  const autoFlag = getAutoFlag(
                    values[component.id] || '',
                    component.referenceRange.low,
                    component.referenceRange.high
                  );
                  const hasRefRange = component.referenceRange.low !== 0 || component.referenceRange.high !== 0;

                  return (
                    <div key={component.id} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-3">
                          <Label className="text-sm font-medium text-foreground">{component.name}</Label>
                        </div>
                        <div className="md:col-span-3">
                          <Input
                            type="text"
                            placeholder="Enter value"
                            value={values[component.id] || ''}
                            onChange={e => updateValue(component.id, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2 text-sm text-muted-foreground">
                          {component.unit || '-'}
                        </div>
                        <div className="md:col-span-2 text-sm text-muted-foreground">
                          {hasRefRange ? `${component.referenceRange.low} - ${component.referenceRange.high}` : '-'}
                        </div>
                        <div className="md:col-span-2">
                          {autoFlag && autoFlag !== 'normal' && (
                            <Badge variant="outline" className={
                              autoFlag === 'low' ? 'text-primary border-primary/20 bg-primary/10' :
                              'text-status-warning-text border-status-warning-border bg-status-warning-bg'
                            }>
                              {autoFlag === 'low' ? 'LOW' : 'HIGH'}
                            </Badge>
                          )}
                          {autoFlag === 'normal' && (
                            <Badge variant="outline" className="text-status-success-text border-status-success-border bg-status-success-bg">
                              Normal
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 md:ml-0">
                        <Textarea
                          placeholder="Notes (optional)"
                          value={notes[component.id] || ''}
                          onChange={e => updateNote(component.id, e.target.value)}
                          className="h-8 min-h-[32px] text-xs resize-none"
                          rows={1}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Submit for Verification
        </Button>
      </div>
    </div>
  );
}
