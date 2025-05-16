
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Loader2, VideoIcon, Users, User, AlertCircle } from "lucide-react"; // Added VideoIcon
import { useToast } from "@/hooks/use-toast";
import { fetchPatients, fetchNurses, scheduleVideoConsult, type PatientListItem, type NurseListItem } from "@/app/actions";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const scheduleVideoConsultFormSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required." }),
  nurseId: z.string().min(1, { message: "Nurse selection is required." }),
  consultationDate: z.date({ required_error: "Consultation date is required." }),
  consultationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)."}),
});

type ScheduleVideoConsultFormValues = z.infer<typeof scheduleVideoConsultFormSchema>;

export default function ScheduleVideoConsultPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth(); // Get auth state
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [nurses, setNurses] = useState<NurseListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      if (authLoading) return; // Wait for auth state to resolve

      if (!currentUser) {
        setDataError("User not authenticated. Please log in to schedule consultations.");
        setIsLoadingData(false);
        setPatients([]);
        setNurses([]);
        return;
      }

      setIsLoadingData(true);
      setDataError(null);
      try {
        const [patientsResponse, nursesResponse] = await Promise.all([
          fetchPatients(),
          fetchNurses()
        ]);
        if (patientsResponse.data) {
          setPatients(patientsResponse.data);
        } else {
          setDataError(patientsResponse.error || "Failed to load patients.");
          toast({ variant: "destructive", title: "Error", description: patientsResponse.error || "Failed to load patients." });
        }
        
        if (nursesResponse.data) {
          setNurses(nursesResponse.data);
        } else {
          setDataError((prevError) => prevError ? `${prevError} ${nursesResponse.error || "Failed to load nurses."}` : nursesResponse.error || "Failed to load nurses.");
          toast({ variant: "destructive", title: "Error", description: nursesResponse.error || "Failed to load nurses." });
        }

      } catch (error: any) {
        const errorMsg = error.message || "Failed to load initial data for scheduling.";
        setDataError(errorMsg);
        toast({ variant: "destructive", title: "Error", description: errorMsg });
        console.error("Error loading patients/nurses:", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [currentUser, authLoading, toast]);

  const form = useForm<ScheduleVideoConsultFormValues>({
    resolver: zodResolver(scheduleVideoConsultFormSchema),
    defaultValues: {
      patientId: "",
      nurseId: "",
      consultationDate: undefined,
      consultationTime: "",
    },
  });

  function onSubmit(values: ScheduleVideoConsultFormValues) {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to schedule." });
      return;
    }
    startTransition(async () => {
      const [hours, minutes] = values.consultationTime.split(':').map(Number);
      const consultationDateTime = new Date(values.consultationDate);
      consultationDateTime.setHours(hours, minutes, 0, 0);

      const result = await scheduleVideoConsult({
        patientId: values.patientId,
        nurseId: values.nurseId,
        consultationDateTime: consultationDateTime,
      });

      if (result.success) {
        toast({
          title: "Video Consult Scheduled",
          description: result.message,
        });
        form.reset();
        router.push("/video-consult"); 
      } else {
        toast({
          variant: "destructive",
          title: "Scheduling Failed",
          description: result.message,
        });
      }
    });
  }

  if (isLoadingData || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading scheduling data...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{dataError}</AlertDescription>
        </Alert>
         <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>You must be logged in to schedule a video consultation.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/login')} className="mt-4">Login</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Schedule Video Consultation</h1>
          <p className="text-muted-foreground">Select patient, nurse, and time for the video call.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <VideoIcon className="h-6 w-6 text-primary" />
                Consultation Details
              </CardTitle>
              <CardDescription>
                Fill in the details to schedule a new video consultation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Patient</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={patients.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={patients.length === 0 ? "No patients available" : "Select a patient"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (ID: {p.id})</SelectItem>)}
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
                      <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Nurse</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={nurses.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={nurses.length === 0 ? "No nurses available" : "Select a nurse"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nurses.map(n => <SelectItem key={n.id} value={n.id}>{n.name} ({n.specialty})</SelectItem>)}
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
                  name="consultationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Consultation Date</FormLabel>
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
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                  name="consultationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation Time</FormLabel>
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
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isPending || isLoadingData || !currentUser}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Schedule Consult
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

