import Link from "next/link";
import { UserPlus, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function QuickActions() {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Link href={ROUTES.NEW_PATIENT} className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm">
            <UserPlus className="h-5 w-5 text-status-success-text" />
            Register New Patient
          </Button>
        </Link>
        <Link href={ROUTES.NEW_APPOINTMENT} className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Book Appointment
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
