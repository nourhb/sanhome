import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalizedCareForm } from "@/components/personalized-care-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, CalendarDays, Droplets, ShieldCheck, HeartPulse, Accessibility, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

// Mock patient data - in a real app, this would be fetched based on params.patientId
const MOCK_PATIENT = {
  id: "123",
  name: "Eleanor Vance",
  age: 72,
  avatarUrl: "https://placehold.co/150x150.png",
  joinDate: "2023-05-12",
  primaryNurse: "Nurse Nightingale",
  contact: {
    phone: "+1 (555) 123-4567",
    email: "eleanor.vance@example.com",
    address: "456 Oak Avenue, Springfield, IL",
  },
  mobility: "Ambulatory with cane, difficulty with stairs",
  pathologies: ["Hypertension", "Osteoarthritis", "Type 2 Diabetes (diet-controlled)"],
  allergies: ["Penicillin", "Shellfish"],
  currentMedications: [
    { name: "Lisinopril", dosage: "10mg daily" },
    { name: "Metformin", dosage: "500mg twice daily" },
    { name: "Acetaminophen", dosage: "500mg as needed for pain" },
  ],
  recentVitals: {
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
  // const patient = await fetchPatientById(params.patientId); // API call
  const patient = MOCK_PATIENT; // Using mock data

  if (!patient) {
    return <div>Patient not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-primary/80 to-secondary/80">
          <Image src="https://placehold.co/1200x300.png" alt="Patient banner" layout="fill" objectFit="cover" data-ai-hint="abstract nature" />
          <div className="absolute inset-0 bg-black/20 flex items-end p-6">
             <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarImage src={patient.avatarUrl} alt={patient.name} data-ai-hint="elderly person"/>
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
            <p className="text-sm"><strong>Email:</strong> {patient.contact.email}</p>
            <p className="text-sm"><strong>Phone:</strong> {patient.contact.phone}</p>
            <p className="text-sm"><strong>Address:</strong> {patient.contact.address}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">Care Details</h3>
            <p className="text-sm flex items-center"><Users className="h-4 w-4 mr-2 text-primary" /><strong>Primary Nurse:</strong> {patient.primaryNurse}</p>
            <p className="text-sm flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary" /><strong>Joined:</strong> {patient.joinDate}</p>
          </div>
           <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground">Key Health Info</h3>
            <p className="text-sm flex items-center"><Accessibility className="h-4 w-4 mr-2 text-primary" /><strong>Mobility:</strong> {patient.mobility}</p>
            <p className="text-sm flex items-center"><Droplets className="h-4 w-4 mr-2 text-red-500" /><strong>Allergies:</strong> {patient.allergies.join(", ")}</p>
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
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {patient.currentMedications.map((med, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{med.name}</span>
                    <span className="text-muted-foreground">{med.dosage}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Recent Vitals</CardTitle>
            <CardDescription>As of {patient.recentVitals.date}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Blood Pressure</p>
              <p className="font-semibold">{patient.recentVitals.bp}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Heart Rate</p>
              <p className="font-semibold">{patient.recentVitals.hr}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="font-semibold">{patient.recentVitals.temp}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Blood Glucose</p>
              <p className="font-semibold">{patient.recentVitals.glucose}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PersonalizedCareForm patient={patient} />
    </div>
  );
}
