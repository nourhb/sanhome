
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Activity, FileClock, PlusCircle, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label"; // Import Label
import { Badge } from "@/components/ui/badge"; // Import Badge

// Mock data
const mockCareLogs = [
  { id: 'cl1', patient: 'Alice Wonderland', date: '2024-07-30', type: 'Vitals Check', notes: 'BP: 120/80, Temp: 37.0C', loggedBy: 'Nurse Alex' },
  { id: 'cl2', patient: 'Bob The Builder', date: '2024-07-29', type: 'Medication Administered', notes: 'Administered Lisinopril 10mg.', loggedBy: 'Nurse Betty' },
  { id: 'cl3', patient: 'Alice Wonderland', date: '2024-07-28', type: 'Wound Care', notes: 'Dressing changed on left leg ulcer.', loggedBy: 'Nurse Alex' },
  { id: 'cl4', patient: 'Charlie Chaplin', date: '2024-07-30', type: 'General Observation', notes: 'Patient reported feeling well.', loggedBy: 'Nurse Charles' },
  { id: 'cl5', patient: 'Diana Prince', date: '2024-07-29', type: 'Physical Therapy', notes: 'Completed range of motion exercises.', loggedBy: 'Nurse Diana' },
];
const mockPatients = ["Alice Wonderland", "Bob The Builder", "Charlie Chaplin", "Diana Prince", "Eleanor Vance"];
const careTypes = ["Vitals Check", "Medication Administered", "Wound Care", "General Observation", "Physical Therapy", "Consultation Note"];


export default function CareTrackingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Care Tracking</h1>
        <p className="text-muted-foreground">Record vitals, treatments, and follow-up logs for patients.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" /> Patient Care Logs</CardTitle>
          <CardDescription>Input and view care activities for patients.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4 p-4 border rounded-lg shadow-sm bg-card">
              <h3 className="text-lg font-semibold flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary" /> Log New Care Activity</h3>
              <form className="space-y-3">
                <div>
                  <Label htmlFor="patient">Patient</Label>
                  <Select>
                    <SelectTrigger id="patient"><SelectValue placeholder="Select Patient" /></SelectTrigger>
                    <SelectContent>{mockPatients.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="care-type">Type of Care</Label>
                  <Select>
                    <SelectTrigger id="care-type"><SelectValue placeholder="Select Care Type" /></SelectTrigger>
                    <SelectContent>{careTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                    <Label htmlFor="care-date">Date & Time</Label>
                    <Input type="datetime-local" id="care-date" defaultValue={new Date().toISOString().substring(0,16)} />
                </div>
                <div>
                  <Label htmlFor="notes">Notes / Vitals</Label>
                  <Textarea id="notes" placeholder="Enter details, observations, vitals..." rows={4}/>
                </div>
                <Button className="w-full">Add Care Log</Button>
              </form>
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Recent Care Logs</h3>
                <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4" /> Filter Logs</Button>
              </div>
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
                    {mockCareLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.patient}</TableCell>
                        <TableCell>{log.date}</TableCell>
                        <TableCell><Badge variant="secondary">{log.type}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{log.loggedBy}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
               {mockCareLogs.length === 0 && (
                <div className="p-8 text-center bg-muted rounded-md mt-4">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Care Logs Yet</h3>
                    <p className="text-muted-foreground">
                    Start by adding a new care activity using the form.
                    </p>
                </div>
               )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
