
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIconLucide, PlusCircle, Clock, User, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import type { AppointmentListItem } from "@/app/actions";
import { fetchAppointments } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";

type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

const getStatusBadgeVariant = (status: AppointmentStatus) => {
  switch (status) {
    case 'Scheduled':
      return 'default'; 
    case 'Completed':
      return 'secondary'; 
    case 'Cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusBadgeClassNames = (status: AppointmentStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'Completed':
        return 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30';
      case 'Cancelled':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/30 hover:bg-destructive/20';
      default:
        return '';
    }
}


export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();

  const loadAppointments = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to view appointments.");
      setIsLoading(false);
      setAppointments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAppointments();
      if (result.data) {
        setAppointments(result.data);
      } else {
        setError(result.error || "Failed to load appointments.");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading) {
        loadAppointments();
    }
  }, [authLoading, loadAppointments]);

  const appointmentDates = useMemo(() => {
    return appointments.map(appt => parseISO(appt.appointmentDate));
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter(appt => {
      const apptDate = parseISO(appt.appointmentDate);
      return isSameDay(apptDate, selectedDate);
    });
  }, [selectedDate, appointments]);

  const modifiers = {
    hasAppointment: (date: Date) => appointmentDates.some(apptDate => isSameDay(date, apptDate)),
  };

  const modifiersStyles = {
    hasAppointment: {
      boxShadow: 'inset 0 -3px 0 0 hsl(var(--accent))', 
      borderRadius: '0px', 
    },
    selected: {
        backgroundColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
    }
  };
  
  const combinedModifiers = {
    ...modifiers,
    selected: selectedDate, 
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading appointments...</p>
      </div>
    );
  }

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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Upcoming & Past Appointments</CardTitle>
              <CardDescription>A log of all scheduled and completed appointments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments.map(appt => (
                <Card key={appt.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{appt.appointmentType}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" /> Patient: {appt.patientName} <span className="text-muted-foreground mx-1">|</span> <User className="h-4 w-4" /> Nurse: {appt.nurseName}
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
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                      <CalendarIconLucide className="h-4 w-4" /> {format(parseISO(appt.appointmentDate), "PPP")}
                      <Clock className="h-4 w-4 ml-2" /> {appt.appointmentTime}
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </CardContent>
                </Card>
              ))}
               {appointments.length === 0 && !isLoading && !error && (
                <div className="p-8 text-center bg-muted rounded-md">
                    <CalendarIconLucide className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Appointments</h3>
                    <p className="text-muted-foreground">
                    There are no upcoming or past appointments. Use the button above to schedule one.
                    </p>
                </div>
               )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6"> 
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>Select a date to see appointments.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center"> 
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={combinedModifiers}
                modifiersStyles={modifiersStyles}
                footer={selectedDate ? <p className="text-sm mt-2">You selected {format(selectedDate, "PPP")}.</p> : <p  className="text-sm mt-2">Pick a day.</p>}
              />
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Appointments for {format(selectedDate, "PPP")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDayAppointments.length > 0 ? (
                  selectedDayAppointments.map(appt => (
                    <Card key={appt.id} className="text-sm">
                      <CardContent className="p-3">
                        <p className="font-semibold">{appt.appointmentType} - {appt.appointmentTime}</p>
                        <p>Patient: {appt.patientName}</p>
                        <p>Nurse: {appt.nurseName}</p>
                        <Badge 
                            variant={getStatusBadgeVariant(appt.status as AppointmentStatus)}
                            className={`mt-1 ${getStatusBadgeClassNames(appt.status as AppointmentStatus)}`}
                        >
                            {appt.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground">No appointments scheduled for this day.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
