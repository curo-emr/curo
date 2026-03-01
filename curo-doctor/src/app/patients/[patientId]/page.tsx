import { notFound } from "next/navigation";
import { 
  getPatientById, 
  getEncountersByPatient, 
  getAllergies, 
  getProblems, 
  getLabOrders,
  getPrescriptionsByEncounter
} from "@/lib/data/api";
import { calculateAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, User, Phone, MapPin, Activity, Droplet, Clock, Plus, FileText, Pill } from "lucide-react";
import Link from "next/link";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";

export default async function PatientChartPage({ params }: { params: { patientId: string } }) {
  // Wait for params if Next.js 15+ (in Next 15 `params` might be a promise, but for now we assume simple object or await it)
  // Let's await it to be safe for Next 15 App Router
  const { patientId } = await params;
  
  const patient = await getPatientById(patientId);
  
  if (!patient) {
    notFound();
  }

  const age = calculateAge(patient.dob);
  const encounters = await getEncountersByPatient(patientId);
  const allergies = await getAllergies(patientId);
  const problems = await getProblems(patientId);
  const labOrdersAll = await getLabOrders();
  const labOrders = labOrdersAll.filter(l => l.patientId === patientId);

  // Note: we can pass serialized data to a client component for interactive tabs, 
  // or use Server Component for each tab. Given shadcn Tabs uses context, the wrapper can be client, 
  // but let's just use the server components directly in Tabs if Tabs are client components, or create a wrapper.
  // Actually, shadcn Tabs are client, but they can children Server Components in React 18+.
  // So we can define PatientChartTabs as a client component and pass the data.

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="flex gap-6 items-start">
            <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{patient.name.full}</h1>
                <Badge variant="outline" className="text-slate-500 font-mono tracking-wide">{patient.mrn}</Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 mt-2">
                <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)} • {age}y ({patient.dob})</div>
                <div className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-red-400" /> Blood: {patient.bloodType}</div>
                <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {patient.phone}</div>
                <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {patient.address.city}</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 shrink-0">
            <Link href={`/patients/${patient.id}/encounters/new`}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Start Visit
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Clinical Alerts Area */}
        {allergies.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 tracking-tight text-sm">Allergies Found</h4>
              <p className="text-sm text-red-700 mt-0.5">
                {allergies.map(a => `${a.substance} (${a.reaction})`).join(", ")}
              </p>
            </div>
          </div>
        )}
      </div>

      <PatientChartTabs 
        patient={patient} 
        encounters={encounters} 
        allergies={allergies} 
        problems={problems} 
        labOrders={labOrders} 
      />
    </div>
  );
}
