"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Beaker } from "lucide-react";

interface LabOrderFormProps {
  tests: { testId: string; name: string; status: 'ordered' }[];
  setTests: React.Dispatch<React.SetStateAction<{ testId: string; name: string; status: 'ordered' }[]>>;
  labPriority: 'routine' | 'urgent' | 'stat';
  setLabPriority: (value: 'routine' | 'urgent' | 'stat') => void;
  labNotes: string;
  setLabNotes: (value: string) => void;
  showResultsToPatient: boolean;
  setShowResultsToPatient: (value: boolean) => void;
}

export function LabOrderForm({
  tests,
  setTests,
  labPriority,
  setLabPriority,
  labNotes,
  setLabNotes,
  showResultsToPatient,
  setShowResultsToPatient,
}: LabOrderFormProps) {
  const [newTest, setNewTest] = useState({ name: "", notes: "" });

  const addLabTest = () => {
    if (!newTest.name.trim()) return;
    const label = newTest.name + (newTest.notes ? ` — ${newTest.notes}` : "");
    setTests(prev => [...prev, { testId: `custom-${Date.now()}`, name: label, status: 'ordered' }]);
    setNewTest({ name: "", notes: "" });
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Beaker className="h-5 w-5 text-status-purple-text" /> Lab Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-muted border rounded-md p-4">
          <div className="flex flex-col md:flex-row items-end gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">Test Name</Label>
              <Input value={newTest.name} onChange={e => setNewTest(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Complete Blood Count (CBC)" className="h-9 bg-white" />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">Specific Instructions</Label>
              <Input value={newTest.notes} onChange={e => setNewTest(t => ({ ...t, notes: e.target.value }))} placeholder="e.g. Fasting required" className="h-9 bg-white" />
            </div>
            <Button type="button" onClick={addLabTest} className="h-9 bg-status-purple-text hover:bg-status-purple-text/90 shrink-0 gap-1.5">
              <Plus className="h-4 w-4" /> Add Test
            </Button>
          </div>
        </div>

        {tests.length > 0 && (
          <div className="space-y-4 border rounded-md p-4 bg-muted/50">
            <div className="flex flex-wrap gap-2">
              {tests.map(test => (
                <Badge key={test.testId} variant="secondary" className="bg-white border px-3 py-1 flex items-center gap-2">
                  {test.name}
                  <button type="button" onClick={() => setTests(prev => prev.filter(t => t.testId !== test.testId))} className="text-muted-foreground hover:text-destructive ml-1">
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={labPriority} onValueChange={(value: 'routine' | 'urgent' | 'stat') => setLabPriority(value)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Clinical Notes for Lab</Label>
                <Input className="h-9" value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="e.g. Fasting sample" />
              </div>
              <div className="md:col-span-2 flex items-center space-x-2 pt-1">
                <Checkbox
                  id="showResults"
                  checked={showResultsToPatient}
                  onCheckedChange={checked => setShowResultsToPatient(checked === true)}
                />
                <label htmlFor="showResults" className="text-sm font-medium text-foreground cursor-pointer select-none">
                  Show results to patient
                </label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
