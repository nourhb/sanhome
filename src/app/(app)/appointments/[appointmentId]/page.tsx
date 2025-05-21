
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CalendarClock, User, Stethoscope, ListChecks, Edit } from 'lucide-react';
import { fetchAppointmentById, type AppointmentListItem } from '@/app/actions';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;

  const [appointment, setAppointment] = useState<AppointmentListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAppointmentDetails() {
      if (!appointmentId) {
        setError("Appointment ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchAppointmentById(appointmentId);
        if (result.data) {
          setAppointment(result.data);
        } else {
          setError(result.error || 'Failed to fetch appointment details.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAppointmentDetails();
  }, [appointmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading appointment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Appointment</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">Appointment not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <CalendarClock className="mr-3 h-7 w-7 text-primary" />
            Appointment Details
          </CardTitle>
          <CardDescription>
            Viewing details for appointment ID: {appointment.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center"><User className="mr-2 h-4 w-4" />Patient:</p>
              <p className="font-medium text-base">{appointment.patientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center"><Stethoscope className="mr-2 h-4 w-4" />Nurse:</p>
              <p className="font-medium text-base">{appointment.nurseName}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center"><CalendarClock className="mr-2 h-4 w-4" />Date & Time:</p>
              <p className="font-medium text-base">{format(parseISO(appointment.appointmentDate), "PPP")} at {appointment.appointmentTime}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center"><ListChecks className="mr-2 h-4 w-4" />Type:</p>
              <p className="font-medium text-base">{appointment.appointmentType}</p>
            </div>
             <div>
              <p className="text-muted-foreground">Status:</p>
              <p className="font-medium text-base">{appointment.status}</p>
            </div>
          </div>
          
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end space-x-3">
          <Button variant="outline" asChild>
            <Link href={`/appointments/${appointment.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Appointment
            </Link>
          </Button>
          {/* TODO: Implement Delete action */}
          <Button variant="destructive">Delete Appointment</Button>
        </CardFooter>
      </Card>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Notes & Follow-up</CardTitle>
          <CardDescription>Placeholder for appointment notes and follow-up actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This section would typically display notes entered by the nurse during or after the appointment, and any follow-up tasks or recommendations.</p>
        </CardContent>
      </Card>
    </div>
  );
}
