
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useRouter, useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIconLucide, Clock, Loader2, Save, AlertCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPatients, fetchNurses, fetchAppointmentById, type PatientListItem, type NurseListItem, type AddAppointmentFormValues, type AppointmentListItem } from "@/app/actions";
// TODO: Create updateAppointment server action
// import { updateAppointment } from "@/app/actions";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required." }),
  nurseId: z.string().min(1, { message: "Nurse selection is required." }),
  appointmentDate: z.date({ required_error: "Appointment date is required." }),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)."}),
  appointmentType: z.string().min(3, { message: "Appointment type is required." }),
  status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
});

type ClientAppointmentFormValues = z.infer<typeof appointmentFormSchema>;

const appointmentTypes = ["Check-up", "Medication Review", "Wound Care", "Vitals Check", "Consultation"];
const appointmentStatuses: AppointmentListItem['status'][] = ['Scheduled', 'Completed', 'Cancelled'];

export default function EditAppointmentPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.appointmentId as string;

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [nurses, setNurses] = useState<NurseListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();

  const form = useForm<ClientAppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      nurseId: "",
      appointmentDate: undefined,
      appointmentTime: "",
      appointmentType: "",
      status: "Scheduled",
    },
  });

  useEffect(() => {
    async function loadInitialData() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) setDataError("Please log in to edit appointments.");
        setIsLoadingData(authLoading);
        return;
      }
      setIsLoadingData(true);
      setDataError(null);
      try {
        const [patientsResult, nursesResult, appointmentResult] = await Promise.all([
          fetchPatients(),
          fetchNurses(),
          fetchAppointmentById(appointmentId)
        ]);

        if (patientsResult.data) setPatients(patientsResult.data);
        else setDataError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);
        
        if (nursesResult.data) setNurses(nursesResult.data);
        else setDataError(prev => `${prev ? prev + " " : ""}Failed to load nurses: ${nursesResult.error || 'Unknown error'}`);

        if (appointmentResult.data) {
          const appt = appointmentResult.data;
          form.reset({
            patientId: appt.patientId,
            nurseId: appt.nurseId,
            appointmentDate: parseISO(appt.appointmentDate),
            appointmentTime: appt.appointmentTime,
            appointmentType: appt.appointmentType,
            status: appt.status,
          });
        } else {
          setDataError(prev => `${prev ? prev + " " : ""}Failed to load appointment details: ${appointmentResult.error || 'Unknown error'}`);
        }

      } catch (e: any) {
        setDataError(`Failed to load initial data: ${e.message}`);
      } finally {
        setIsLoadingData(false);
      }
    }
    if (appointmentId) {
      loadInitialData();
    }
  }, [currentUser, authLoading, appointmentId, form]);

  function onSubmit(values: ClientAppointmentFormValues) {
    startTransition(async () => {
      // TODO: Implement updateAppointment server action
      console.log("Form values to update appointment:", values, "for ID:", appointmentId);
      // const result = await updateAppointment(appointmentId, values);
      const result = { success: false, message: "Update functionality not yet implemented." }; // Placeholder
      
      if (result.success) {
        toast({
          title: "Appointment Updated",
          description: `Appointment has been successfully updated.`,
        });
        router.push(`/appointments/${appointmentId}`);
      } else {
         toast({
          variant: "destructive",
          title: "Update Failed",
          description: result.message || "Could not update appointment.",
        });
      }
    });
  }

  if (authLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading appointment data...</p>
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
          <h1 className="text-2xl font-semibold">Edit Appointment</h1>
          <p className="text-muted-foreground">Modify the details for appointment ID: {appointmentId}</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-6 w-6 text-primary" />
                Modify Appointment Details
              </CardTitle>
              <CardDescription>
                Adjust patient, nurse, date, time, type, or status.
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
                       <Select onValueChange={field.onChange} value={field.value} disabled={patients.length === 0}>
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
                       <Select onValueChange={field.onChange} value={field.value} disabled={nurses.length === 0}>
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
                            // Allow past dates for editing, but not for new appointments
                            // disabled={(date) =>
                            //   date < new Date(new Date().setHours(0,0,0,0)) 
                            // }
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
                     <Select onValueChange={field.onChange} value={field.value}>
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
               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select appointment status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appointmentStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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
