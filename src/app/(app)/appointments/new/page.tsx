
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIconLucide, Clock, Loader2, PlusCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPatients, fetchNurses, addAppointment, type PatientListItem, type NurseListItem, type AddAppointmentFormValues } from "@/app/actions";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required." }),
  nurseId: z.string().min(1, { message: "Nurse selection is required." }),
  appointmentDate: z.date({ required_error: "Appointment date is required." }),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)."}),
  appointmentType: z.string().min(3, { message: "Appointment type is required." }),
});

// This type is for the client-side form values which includes IDs for patient/nurse
type ClientAppointmentFormValues = z.infer<typeof appointmentFormSchema>;

const appointmentTypes = ["Check-up", "Medication Review", "Wound Care", "Vitals Check", "Consultation"];

export default function NewAppointmentPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [nurses, setNurses] = useState<NurseListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    async function loadInitialData() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) setDataError("Please log in to schedule appointments.");
        setIsLoadingData(authLoading);
        return;
      }
      setIsLoadingData(true);
      setDataError(null);
      try {
        const [patientsResult, nursesResult] = await Promise.all([
          fetchPatients(),
          fetchNurses()
        ]);
        if (patientsResult.data) setPatients(patientsResult.data);
        else setDataError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);
        
        if (nursesResult.data) setNurses(nursesResult.data);
        else setDataError(prev => `${prev ? prev + " " : ""}Failed to load nurses: ${nursesResult.error || 'Unknown error'}`);

      } catch (e: any) {
        setDataError(`Failed to load patients or nurses: ${e.message}`);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [currentUser, authLoading]);

  const form = useForm<ClientAppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      nurseId: "",
      appointmentDate: undefined,
      appointmentTime: "",
      appointmentType: "",
    },
  });

  function onSubmit(values: ClientAppointmentFormValues) {
    startTransition(async () => {
      // The server action 'addAppointment' expects AddAppointmentFormValues
      // which includes patientId and nurseId.
      const result = await addAppointment(values);
      
      if (result.success) {
        const selectedPatient = patients.find(p => p.id === values.patientId);
        const selectedNurse = nurses.find(n => n.id === values.nurseId);
        toast({
          title: "Appointment Scheduled",
          description: `Appointment for ${selectedPatient?.name || 'Selected Patient'} with ${selectedNurse?.name || 'Selected Nurse'} on ${format(values.appointmentDate, "PPP")} at ${values.appointmentTime} has been scheduled.`,
        });
        form.reset();
      } else {
         toast({
          variant: "destructive",
          title: "Scheduling Failed",
          description: result.message || "Could not schedule appointment.",
        });
      }
    });
  }

  if (authLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading data for scheduling...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{dataError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Schedule New Appointment</h1>
          <p className="text-muted-foreground">Fill in the details to book a new appointment.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-6 w-6 text-primary" />
                Appointment Details
              </CardTitle>
              <CardDescription>
                Select patient, nurse, date, time, and type for the appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Name</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={patients.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={patients.length === 0 ? "No patients available" : "Select a patient"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nurseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nurse Name</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={nurses.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={nurses.length === 0 ? "No nurses available" : "Select a nurse"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nurses.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Appointment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0)) 
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input type="time" placeholder="HH:MM" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormDescription>Use HH:MM format (e.g., 14:30 for 2:30 PM).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Type</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appointment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appointmentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isPending || isLoadingData}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Schedule Appointment
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
