"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@curo/web/api";
import { QueryContent } from "@curo/web/query";
import { WEEKDAYS, type DoctorSession } from "@curo/web/schedule";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { SectionCard } from "@curo/web/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { setSessions, type SessionInput } from "@/lib/api/schedules";
import { scheduleQueries } from "@/lib/queries";

const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];
// Monday first, as the clinic reads its week.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

type Row = SessionInput & { room: string };

const toRow = (s: DoctorSession): Row => ({ weekday: s.weekday, start: s.start, end: s.end, slotMinutes: s.slotMinutes, room: s.room ?? "" });

// When a doctor sees patients, which the front desk books into. Saved as a whole week.
export function WeeklySessions({ practitionerId }: { practitionerId: string }) {
  const sessions = useQuery(scheduleQueries.forDoctor(practitionerId));

  return (
    <SectionCard
      icon={CalendarClock}
      iconClassName="text-primary"
      title="Weekly sessions"
      description="When this doctor sees patients. Reception can only book times inside a session."
    >
      <QueryContent query={sessions} what="the doctor's sessions">
        {/* Keyed on what was saved, so the rows start again from it after a save. */}
        {list => <SessionsEditor key={JSON.stringify(list)} practitionerId={practitionerId} saved={list.map(toRow)} />}
      </QueryContent>
    </SectionCard>
  );
}

function SessionsEditor({ practitionerId, saved }: { practitionerId: string; saved: Row[] }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(saved);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(rows) !== JSON.stringify(saved);

  const update = (index: number, change: Partial<Row>) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));

  // A new session starts as a copy of the last one, on the next day, as weeks are mostly alike.
  const add = () =>
    setRows(prev => {
      const last = prev.at(-1);
      return [...prev, last ? { ...last, weekday: (last.weekday + 1) % 7 } : { weekday: 1, start: "09:00", end: "12:00", slotMinutes: 15, room: "" }];
    });

  const save = async () => {
    setSaving(true);
    try {
      const week = await setSessions(practitionerId, rows.map(r => ({ ...r, room: r.room.trim() || undefined })));
      queryClient.setQueryData(scheduleQueries.forDoctor(practitionerId).queryKey, week);
      toast.success("Sessions saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save the sessions"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet, so this doctor can&apos;t be booked.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Select value={String(row.weekday)} onValueChange={v => update(i, { weekday: Number(v) })}>
                <SelectTrigger className="w-32" aria-label="Day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK.map(d => (
                    <SelectItem key={d} value={String(d)}>{WEEKDAYS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" aria-label="Starts" value={row.start} onChange={e => update(i, { start: e.target.value })} className="w-32" />
              <span className="text-muted-foreground">to</span>
              <Input type="time" aria-label="Ends" value={row.end} onChange={e => update(i, { end: e.target.value })} className="w-32" />
              <Select value={String(row.slotMinutes)} onValueChange={v => update(i, { slotMinutes: Number(v) })}>
                <SelectTrigger className="w-28" aria-label="Appointment length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_LENGTHS.map(m => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input aria-label="Room" placeholder="Room" value={row.room} onChange={e => update(i, { room: e.target.value })} className="w-24" />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${WEEKDAYS[row.weekday]} ${row.start}–${row.end}`}
                onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <Button variant="outline" onClick={add}>
          <Plus /> Add session
        </Button>
        <Button onClick={save} disabled={!changed || saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save sessions
        </Button>
      </div>
    </div>
  );
}
