import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, UserPlus } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const mockNurses = [
  { id: 'n1', name: 'Nurse Alex', specialty: 'Geriatrics', location: 'Springfield General', phone: '555-0101', avatar: 'https://placehold.co/100x100.png?text=NA' },
  { id: 'n2', name: 'Nurse Betty', specialty: 'Pediatrics', location: 'Community Clinic', phone: '555-0102', avatar: 'https://placehold.co/100x100.png?text=NB' },
  { id: 'n3', name: 'Nurse Charles', specialty: 'Cardiology', location: 'City Heart Institute', phone: '555-0103', avatar: 'https://placehold.co/100x100.png?text=NC' },
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
          <CardDescription>Browse and manage nurse profiles. Geolocation tracking would appear here.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockNurses.map(nurse => (
            <Card key={nurse.id} className="flex flex-col">
              <CardHeader className="flex items-center gap-4">
                <Image src={nurse.avatar} alt={nurse.name} width={64} height={64} className="rounded-full" data-ai-hint="nurse medical" />
                <div>
                  <CardTitle>{nurse.name}</CardTitle>
                  <CardDescription>{nurse.specialty}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm flex items-center"><MapPin className="h-4 w-4 mr-2 text-muted-foreground" />{nurse.location}</p>
                <p className="text-sm flex items-center"><Phone className="h-4 w-4 mr-2 text-muted-foreground" />{nurse.phone}</p>
                <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Geolocation Tracking (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="h-64 bg-muted rounded-md flex items-center justify-center">
          <p className="text-muted-foreground">Nurse location map would be displayed here.</p>
          <Image src="https://placehold.co/600x300.png?text=Map+Placeholder" alt="Map placeholder" width={600} height={300} className="opacity-50" data-ai-hint="map city" />
        </CardContent>
      </Card>
    </div>
  );
}
