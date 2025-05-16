
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, UserPlus } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const mockNurses = [
  { id: 'n1', name: 'Nurse Alex Ray', specialty: 'Geriatrics', location: 'Springfield General Hospital', phone: '(555) 010-0101', avatar: 'https://placehold.co/100x100.png?text=AR', email: 'alex.ray@example.com' },
  { id: 'n2', name: 'Nurse Betty Boo', specialty: 'Pediatrics', location: 'Community Health Clinic', phone: '(555) 010-0202', avatar: 'https://placehold.co/100x100.png?text=BB', email: 'betty.boo@example.com' },
  { id: 'n3', name: 'Nurse Charles Xavier', specialty: 'Cardiology', location: 'City Heart Institute', phone: '(555) 010-0303', avatar: 'https://placehold.co/100x100.png?text=CX', email: 'charles.xavier@example.com' },
  { id: 'n4', name: 'Nurse Diana Prince', specialty: 'Oncology', location: 'Hope Cancer Center', phone: '(555) 010-0404', avatar: 'https://placehold.co/100x100.png?text=DP', email: 'diana.prince@example.com' },
];

export default function NursesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nurse Management</h1>
          <p className="text-muted-foreground">Manage nurse profiles, assignments, and tracking.</p>
        </div>
        <Button asChild>
          <Link href="/nurses/new">
            <UserPlus className="mr-2 h-4 w-4" /> Add New Nurse
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nurse Directory</CardTitle>
          <CardDescription>Browse and manage nurse profiles. Geolocation tracking would appear on the map below.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockNurses.map(nurse => (
            <Card key={nurse.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Image src={nurse.avatar} alt={nurse.name} width={64} height={64} className="rounded-full" data-ai-hint="nurse medical" />
                <div>
                  <CardTitle className="text-lg">{nurse.name}</CardTitle>
                  <CardDescription>{nurse.specialty}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-1 text-sm">
                <p className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  {nurse.location}
                </p>
                <p className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2 text-primary" />
                  {nurse.phone}
                </p>
              </CardContent>
              <CardFooter className="pt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile & Schedule
                  </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nurse Geolocation Tracking</CardTitle>
          <CardDescription>Real-time location of active nurses (Placeholder).</CardDescription>
        </CardHeader>
        <CardContent className="h-96 bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
          <Image 
            src="https://placehold.co/1000x600.png" 
            alt="Map placeholder showing city streets and pins" 
            fill={true}
            className="object-cover opacity-50" 
            data-ai-hint="map city" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xl font-semibold p-4 bg-background/80 rounded-md shadow">
              Interactive Nurse Location Map (e.g., Google Maps) would be displayed here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
