"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorklistFiltersProps {
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function WorklistFilters({
  priorityFilter,
  onPriorityChange,
  onClear,
  hasFilters,
}: WorklistFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="stat">STAT</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="routine">Routine</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
