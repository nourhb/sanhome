
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Activity, FileClock, PlusCircle, ListFilter, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { CareLogItem, PatientListItem, AddCareLogFormValues } from "@/app/actions";
import { fetchCareLogs, fetchPatients, addCareLog } from "@/app/actions";
import { format, parseISO } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const careLogFormSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required." }),
  careType: z.string().min(1, { message: "Type of care is required." }),
  careDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Valid date and time are required."}), // Validates if string can be parsed to date
  notes: z.string().min(3, { message: "Notes must be at least 3 characters." }),
});

type ClientCareLogFormValues = z.infer<typeof careLogFormSchema>;

const careTypes = ["Vitals Check", "Medication Administered", "Wound Care", "General Observation", "Physical Therapy", "Consultation Note"];

export default function CareTrackingPage() {
  const [careLogs, setCareLogs] = useState<CareLogItem[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formIsLoading, setFormIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<ClientCareLogFormValues>({
    resolver: zodResolver(careLogFormSchema),
    defaultValues: {
      patientId: "",
      careType: "",
      careDateTime: new Date().toISOString().substring(0, 16),
      notes: "",
    },
  });

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to manage care logs.");
      setIsLoading(false);
      setCareLogs([]);
      setPatients([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [logsResult, patientsResult] = await Promise.all([
        fetchCareLogs(), // Assumes fetchCareLogs doesn't require userId or is handled internally
        fetchPatients()
      ]);

      if (logsResult.data) setCareLogs(logsResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load care logs: ${logsResult.error || 'Unknown error'}`);
      
      if (patientsResult.data) setPatients(patientsResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);

    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if(!authLoading){
      loadData();
    }
  }, [authLoading, loadData]);

  async function onSubmit(values: ClientCareLogFormValues) {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in." });
      return;
    }
    setFormIsLoading(true);
    const actionValues: AddCareLogFormValues = {
      ...values,
      careDateTime: new Date(values.careDateTime), // Convert string to Date
    };
    const result = await addCareLog(actionValues, currentUser.displayName || currentUser.email || "Unknown User");
    if (result.success) {
      toast({ title: "Care Log Added", description: result.message });
      form.reset({ careDateTime: new Date().toISOString().substring(0, 16), patientId: "", careType: "", notes: "" });
      loadData(); // Refresh logs
    } else {
      toast({ variant: "destructive", title: "Failed to Add Log", description: result.message });
    }
    setFormIsLoading(false);
  }
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Care Tracking</h1>
        <p className="text-muted-foreground">Record vitals, treatments, and follow-up logs for patients.</p>
      </div>

      {error && !isLoading && ( // Show general error if not loading
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" /> Patient Care Logs</CardTitle>
          <CardDescription>Input and view care activities for patients.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4 p-4 border rounded-lg shadow-sm bg-card">
              <h3 className="text-lg font-semibold flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary" /> Log New Care Activity</h3>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="patient">Patient</Label>
                      <Select onValueChange={field.onChange} value={field.value} disabled={patients.length === 0 || isLoading}>
                        <SelectTrigger id="patient">
                          <SelectValue placeholder={patients.length === 0 ? "No patients available" : "Select Patient"} />
                        </SelectTrigger>
                        <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="careType"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="care-type">Type of Care</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="care-type"><SelectValue placeholder="Select Care Type" /></SelectTrigger>
                        <SelectContent>{careTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="careDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="care-date">Date & Time</Label>
                      <Input type="datetime-local" id="care-date" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="notes">Notes / Vitals</Label>
                      <Textarea id="notes" placeholder="Enter details, observations, vitals..." rows={4} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={formIsLoading || isLoading}>
                  {formIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Care Log
                </Button>
              </form>
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Recent Care Logs</h3>
                <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4" /> Filter Logs</Button>
              </div>
              {isLoading && (
                <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading logs...</div>
              )}
              {!isLoading && !error && careLogs.length === 0 && (
                <div className="p-8 text-center bg-muted rounded-md mt-4">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Care Logs Yet</h3>
                    <p className="text-muted-foreground">
                    Start by adding a new care activity using the form.
                    </p>
                </div>
               )}
              {!isLoading && !error && careLogs.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Logged By</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {careLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.patientName}</TableCell>
                          <TableCell>{format(parseISO(log.careDate), "PPpp")}</TableCell>
                          <TableCell><Badge variant="secondary">{log.careType}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell">{log.loggedBy}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
