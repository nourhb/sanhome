
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalizedCareForm } from "@/components/personalized-care-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, CalendarDays, Droplets, ShieldCheck, HeartPulse, Accessibility, Users, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { fetchPatientById, type PatientListItem } from "@/app/actions"; // Import fetchPatientById
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This MOCK_PATIENT is now a fallback or for structure reference, 
// actual data comes from fetchPatientById
const MOCK_PATIENT_STRUCTURE: PatientListItem = {
  id: "0",
  name: "Eleanor Vance",
  age: 72,
  avatarUrl: "https://placehold.co/150x150.png",
  joinDate: "2023-05-12",
  primaryNurse: "Nurse Nightingale",
  phone: "+1 (555) 123-4567",
  email: "eleanor.vance@example.com",
  address: "456 Oak Avenue, Springfield, IL",
  mobilityStatus: "Ambulatory with cane, difficulty with stairs",
  pathologies: ["Hypertension", "Osteoarthritis", "Type 2 Diabetes (diet-controlled)"],
  allergies: ["Penicillin", "Shellfish"],
  // Fields from mockPatients in actions.ts that might be used here
  lastVisit: '2024-07-22', 
  condition: 'COPD', 
  status: 'Stable',
  hint: 'elderly person',
  // Additional fields that were on PatientProfilePage
  currentMedications: [ // This was on the original page, ensure it's part of PatientListItem or fetched separately
    { name: "Lisinopril", dosage: "10mg daily" },
    { name: "Metformin", dosage: "500mg twice daily" },
    { name: "Acetaminophen", dosage: "500mg as needed for pain" },
  ],
  recentVitals: { // This also needs to be part of PatientListItem or fetched separately
    date: "2024-07-28",
    bp: "135/85 mmHg",
    hr: "72 bpm",
    temp: "36.8°C",
    glucose: "110 mg/dL",
  },
};


type PatientProfilePageProps = {
  params: { patientId: string };
};

export default async function PatientProfilePage({ params }: PatientProfilePageProps) {
  const { data: patient, error } = await fetchPatientById(params.patientId);

  if (error || !patient) {
    return (
        <div className="container mx-auto p-4">
            <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Patient not found."}</AlertDescription>
            </Alert>
        </div>
    );
  }

  // Assuming currentMedications and recentVitals are part of the fetched patient data
  // If not, they need to be added to PatientListItem and mockPatients in actions.ts
  // For now, we'll use the structure from MOCK_PATIENT_STRUCTURE if not on 'patient'
  const medications = (patient as any).currentMedications || MOCK_PATIENT_STRUCTURE.currentMedications;
  const vitals = (patient as any).recentVitals || MOCK_PATIENT_STRUCTURE.recentVitals;


  return (
    <div className="space-y-6">
      <Card className="shadow-lg overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-primary/80 to-secondary/80">
          <Image 
            src="https://placehold.co/1200x300.png" 
            alt="Patient banner" 
            fill={true} 
            className="object-cover"
            data-ai-hint="abstract nature" 
            priority
          />
          <div className="absolute inset-0 bg-black/20 flex items-end p-6">
             <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarImage src={patient.avatarUrl || MOCK_PATIENT_STRUCTURE.avatarUrl} alt={patient.name} data-ai-hint={patient.hint || MOCK_PATIENT_STRUCTURE.hint}/>
              <AvatarFallback className="text-3xl">{patient.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <CardTitle className="text-3xl font-bold text-white">{patient.name}</CardTitle>
              <CardDescription className="text-lg text-gray-200">Patient ID: {patient.id} &bull; Age: {patient.age}</CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">Contact Information</h3>
            <p className="text-sm"><strong>Email:</strong> {patient.email}</p>
            <p className="text-sm"><strong>Phone:</strong> {patient.phone}</p>
            <p className="text-sm"><strong>Address:</strong> {patient.address}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">Care Details</h3>
            <p className="text-sm flex items-center"><Users className="h-4 w-4 mr-2 text-primary" /><strong>Primary Nurse:</strong> {patient.primaryNurse}</p>
            <p className="text-sm flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary" /><strong>Joined:</strong> {patient.joinDate}</p>
          </div>
           <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">Key Health Info</h3>
            <p className="text-sm flex items-center"><Accessibility className="h-4 w-4 mr-2 text-primary" /><strong>Mobility:</strong> {patient.mobilityStatus}</p>
            <p className="text-sm flex items-center"><Droplets className="h-4 w-4 mr-2 text-red-500" /><strong>Allergies:</strong> {patient.allergies.join(", ") || "None reported"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" />Pathologies & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {patient.pathologies.map((pathology, index) => (
                  <li key={index}>{pathology}</li>
                ))}
                 {patient.pathologies.length === 0 && <li>No pathologies reported.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {medications.map((med: {name: string, dosage: string}, index: number) => (
                  <li key={index} className="flex justify-between">
                    <span>{med.name}</span>
                    <span className="text-muted-foreground">{med.dosage}</span>
                  </li>
                ))}
                {medications.length === 0 && <li>No current medications reported.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Recent Vitals</CardTitle>
            <CardDescription>As of {vitals.date}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Blood Pressure</p>
              <p className="font-semibold">{vitals.bp}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Heart Rate</p>
              <p className="font-semibold">{vitals.hr}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="font-semibold">{vitals.temp}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Blood Glucose</p>
              <p className="font-semibold">{vitals.glucose}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PersonalizedCareForm 
        patient={{
          id: patient.id,
          name: patient.name,
          mobility: patient.mobilityStatus,
          pathologies: patient.pathologies,
        }} 
      />
    </div>
  );
}
