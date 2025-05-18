
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Activity, FileClock, PlusCircle, ListFilter, Loader2, AlertCircle, Eye, Edit, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { CareLogItem, PatientListItem, AddCareLogFormValues, UpdateCareLogFormValues } from "@/app/actions";
import { fetchCareLogs, fetchPatients, addCareLog, updateCareLog, deleteCareLog } from "@/app/actions";
import { format, parseISO } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const careLogFormSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required." }),
  careType: z.string().min(1, { message: "Type of care is required." }),
  careDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Valid date and time are required."}),
  notes: z.string().min(3, { message: "Notes must be at least 3 characters." }),
});

type ClientCareLogFormValues = z.infer<typeof careLogFormSchema>;

const careTypes = ["Vitals Check", "Medication Administered", "Wound Care", "General Observation", "Physical Therapy", "Consultation Note", "Personal Care", "Emergency Response"];

export default function CareTrackingPage() {
  const [careLogs, setCareLogs] = useState<CareLogItem[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formIsLoading, setFormIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedLogForView, setSelectedLogForView] = useState<CareLogItem | null>(null);
  const [isViewLogDialogOpen, setIsViewLogDialogOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logToDeleteId, setLogToDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);


  const defaultFormValues = {
    patientId: "",
    careType: "",
    careDateTime: new Date().toISOString().substring(0, 16), // Format for datetime-local
    notes: "",
  };

  const form = useForm<ClientCareLogFormValues>({
    resolver: zodResolver(careLogFormSchema),
    defaultValues: defaultFormValues,
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
        fetchCareLogs(), 
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
    const actionValues: AddCareLogFormValues = { // Also compatible with UpdateCareLogFormValues
      ...values,
      careDateTime: new Date(values.careDateTime), 
    };

    let result;
    if (editingLogId) {
      result = await updateCareLog(editingLogId, actionValues);
    } else {
      result = await addCareLog(actionValues, currentUser.displayName || currentUser.email || "Unknown User");
    }
    
    if (result.success) {
      toast({ title: editingLogId ? "Care Log Updated" : "Care Log Added", description: result.message });
      form.reset(defaultFormValues);
      setEditingLogId(null);
      loadData(); // Refresh logs
    } else {
      toast({ variant: "destructive", title: editingLogId ? "Failed to Update Log" : "Failed to Add Log", description: result.message });
    }
    setFormIsLoading(false);
  }
  
  const handleViewLog = (log: CareLogItem) => {
    setSelectedLogForView(log);
    setIsViewLogDialogOpen(true);
  };

  const handleEditLog = (log: CareLogItem) => {
    setEditingLogId(log.id);
    // Format date from ISO string to 'yyyy-MM-ddTHH:mm' for datetime-local input
    const formattedCareDate = format(parseISO(log.careDate), "yyyy-MM-dd'T'HH:mm");
    form.reset({
      patientId: log.patientId,
      careType: log.careType,
      careDateTime: formattedCareDate,
      notes: log.notes,
    });
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    form.reset(defaultFormValues);
  };

  const handleDeleteLog = (logId: string) => {
    setLogToDeleteId(logId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDeleteId) return;
    setFormIsLoading(true); // Can reuse formIsLoading or add a specific one for delete
    const result = await deleteCareLog(logToDeleteId);
    if (result.success) {
        toast({ title: "Care Log Deleted", description: result.message });
        loadData(); // Refresh logs
    } else {
        toast({ variant: "destructive", title: "Failed to Delete Log", description: result.message });
    }
    setFormIsLoading(false);
    setIsDeleteConfirmOpen(false);
    setLogToDeleteId(null);
  };


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

      {error && !isLoading && ( 
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
              <h3 className="text-lg font-semibold flex items-center">
                {editingLogId ? <Edit className="mr-2 h-5 w-5 text-primary" /> : <PlusCircle className="mr-2 h-5 w-5 text-primary" />}
                {editingLogId ? "Edit Care Activity" : "Log New Care Activity"}
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="patient">Patient</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={patients.length === 0 || isLoading || !!editingLogId}>
                          <FormControl>
                            <SelectTrigger id="patient">
                              <SelectValue placeholder={patients.length === 0 ? "No patients available" : "Select Patient"} />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormLabel htmlFor="care-type">Type of Care</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger id="care-type"><SelectValue placeholder="Select Care Type" /></SelectTrigger>
                          </FormControl>
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
                        <FormLabel htmlFor="care-date">Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" id="care-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="notes">Notes / Vitals</FormLabel>
                        <FormControl>
                          <Textarea id="notes" placeholder="Enter details, observations, vitals..." rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    {editingLogId && (
                        <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-1/2">
                            <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                        </Button>
                    )}
                    <Button type="submit" className="w-full" disabled={formIsLoading || isLoading}>
                        {formIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingLogId ? "Update Care Log" : "Add Care Log"}
                    </Button>
                  </div>
                </form>
              </Form> 
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {careLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.patientName}</TableCell>
                          <TableCell>{format(parseISO(log.careDate), "PPpp")}</TableCell>
                          <TableCell><Badge variant="secondary">{log.careType}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell">{log.loggedBy}</TableCell>
                          <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleViewLog(log)} title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditLog(log)} title="Edit Log">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLog(log.id)} title="Delete Log" className="text-destructive hover:text-destructive/80">
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      {selectedLogForView && (
        <AlertDialog open={isViewLogDialogOpen} onOpenChange={setIsViewLogDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Care Log Details</AlertDialogTitle>
              <AlertDialogDescription>
                Viewing care log for <span className="font-semibold">{selectedLogForView.patientName}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 text-sm py-4 max-h-[60vh] overflow-y-auto pr-2">
              <p><strong>Patient:</strong> {selectedLogForView.patientName}</p>
              <p><strong>Date & Time:</strong> {format(parseISO(selectedLogForView.careDate), "PPPp")}</p>
              <p><strong>Type of Care:</strong> {selectedLogForView.careType}</p>
              <p><strong>Logged By:</strong> {selectedLogForView.loggedBy}</p>
              <div>
                <strong>Notes / Vitals:</strong>
                <ScrollArea className="h-32 mt-1 rounded-md border p-2 bg-muted/50">
                  <p className="whitespace-pre-wrap">{selectedLogForView.notes}</p>
                </ScrollArea>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsViewLogDialogOpen(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isDeleteConfirmOpen && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this care log? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteConfirmOpen(false); setLogToDeleteId(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {formIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
