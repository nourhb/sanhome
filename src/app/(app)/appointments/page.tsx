
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, PlusCircle, Clock, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const mockAppointments = [
  { id: 'a1', patient: 'Alice Wonderland', nurse: 'Nurse Alex', date: '2024-08-05', time: '10:00 AM', type: 'Check-up', status: 'Scheduled' },
  { id: 'a2', patient: 'Bob The Builder', nurse: 'Nurse Betty', date: '2024-08-05', time: '02:00 PM', type: 'Medication Review', status: 'Scheduled' },
  { id: 'a3', patient: 'Charlie Chaplin', nurse: 'Nurse Alex', date: '2024-08-06', time: '11:30 AM', type: 'Wound Care', status: 'Completed' },
  { id: 'a4', patient: 'Diana Prince', nurse: 'Nurse Charles', date: '2024-08-07', time: '09:00 AM', type: 'Vitals Check', status: 'Cancelled' },
];

type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

const getStatusBadgeVariant = (status: AppointmentStatus) => {
  switch (status) {
    case 'Scheduled':
      return 'default'; // Uses primary color
    case 'Completed':
      return 'secondary'; // Uses secondary color
    case 'Cancelled':
      return 'destructive'; // Uses destructive color
    default:
      return 'outline';
  }
};

const getStatusBadgeClassNames = (status: AppointmentStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'Completed':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/30 hover:bg-secondary/20';
      case 'Cancelled':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/30 hover:bg-destructive/20';
      default:
        return '';
    }
}


export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointment Management</h1>
          <p className="text-muted-foreground">Schedule, view, and manage patient appointments.</p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <PlusCircle className="mr-2 h-4 w-4" /> New Appointment
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming & Past Appointments</CardTitle>
          <CardDescription>A log of all scheduled and completed appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockAppointments.map(appt => (
            <Card key={appt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{appt.type}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Patient: {appt.patient} <span className="text-muted-foreground mx-1">|</span> <User className="h-4 w-4" /> Nurse: {appt.nurse}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={getStatusBadgeVariant(appt.status as AppointmentStatus)}
                    className={getStatusBadgeClassNames(appt.status as AppointmentStatus)}
                  >
                    {appt.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {appt.date}
                  <Clock className="h-4 w-4 ml-2" /> {appt.time}
                </div>
                <Button variant="outline" size="sm">Details</Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Calendar View (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="h-96 bg-muted rounded-md flex items-center justify-center">
          <p className="text-muted-foreground">Interactive appointment calendar would be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
