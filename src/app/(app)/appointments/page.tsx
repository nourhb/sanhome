
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIconLucide, PlusCircle, Clock, User } from "lucide-react"; // Renamed Calendar to CalendarIconLucide
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar"; // Actual Calendar component
import React, { useState, useMemo } from "react";
import { format, parse, isSameDay } from "date-fns";

const mockAppointments = [
  { id: 'a1', patient: 'Alice Wonderland', nurse: 'Nurse Alex', date: '2024-08-05', time: '10:00 AM', type: 'Check-up', status: 'Scheduled' },
  { id: 'a2', patient: 'Bob The Builder', nurse: 'Nurse Betty', date: '2024-08-05', time: '02:00 PM', type: 'Medication Review', status: 'Scheduled' },
  { id: 'a3', patient: 'Charlie Chaplin', nurse: 'Nurse Alex', date: '2024-08-06', time: '11:30 AM', type: 'Wound Care', status: 'Completed' },
  { id: 'a4', patient: 'Diana Prince', nurse: 'Nurse Charles', date: '2024-08-07', time: '09:00 AM', type: 'Vitals Check', status: 'Cancelled' },
  { id: 'a5', patient: 'Eleanor Vance', nurse: 'Nurse Betty', date: '2024-08-08', time: '03:30 PM', type: 'Consultation', status: 'Scheduled' },
  // Add an appointment for a different month to test calendar navigation
  { id: 'a6', patient: 'Frankenstein Monster', nurse: 'Nurse Alex', date: '2024-09-10', time: '09:00 AM', type: 'Check-up', status: 'Scheduled' },
];

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

  const appointmentDates = useMemo(() => {
    return mockAppointments.map(appt => parse(appt.date, 'yyyy-MM-dd', new Date()));
  }, []);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return mockAppointments.filter(appt => {
      const apptDate = parse(appt.date, 'yyyy-MM-dd', new Date());
      return isSameDay(apptDate, selectedDate);
    });
  }, [selectedDate]);

  const modifiers = {
    hasAppointment: (date: Date) => appointmentDates.some(apptDate => isSameDay(date, apptDate)),
  };

  const modifiersStyles = {
    hasAppointment: {
      // Using a box shadow to create a subtle dot-like effect under the number
      // This is a bit of a hack as direct dot rendering needs custom day component.
      // A simpler alternative is a background color change.
      boxShadow: 'inset 0 -3px 0 0 hsl(var(--accent))', // Using accent color for the "dot"
      borderRadius: '0px', // Override default rounding if boxShadow looks weird with it
    },
    // Ensure selected style still prominent
    selected: {
        backgroundColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
    }
  };
  
  // Combine modifiers for selected and hasAppointment to avoid style override issues
  const combinedModifiers = {
    ...modifiers,
    selected: selectedDate, // react-day-picker handles selected state styling
  };


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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                        <CardDescription className="flex items-center gap-2 text-sm">
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
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                      <CalendarIconLucide className="h-4 w-4" /> {appt.date}
                      <Clock className="h-4 w-4 ml-2" /> {appt.time}
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </CardContent>
                </Card>
              ))}
               {mockAppointments.length === 0 && (
                <div className="p-8 text-center bg-muted rounded-md">
                    <CalendarIconLucide className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Appointments</h3>
                    <p className="text-muted-foreground">
                    There are no upcoming or past appointments.
                    </p>
                </div>
               )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6"> {/* Added space-y-6 for calendar and its appointment list */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>Select a date to see appointments.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center"> {/* Centering calendar */}
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
                        <p className="font-semibold">{appt.type} - {appt.time}</p>
                        <p>Patient: {appt.patient}</p>
                        <p>Nurse: {appt.nurse}</p>
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

