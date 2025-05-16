
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, History, Pill, Stethoscope, UploadCloud, FileText, Download, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data
const mockFiles = [
  { id: 'f1', patient: 'Alice Wonderland', name: 'Blood Test Results - July 2024.pdf', type: 'Lab Result', date: '2024-07-25', size: '1.2MB', uploader: 'Dr. Smith' },
  { id: 'f2', patient: 'Bob The Builder', name: 'X-Ray - Left Knee.jpg', type: 'Imaging Report', date: '2024-07-20', size: '3.5MB', uploader: 'Tech Lisa' },
  { id: 'f3', patient: 'Alice Wonderland', name: 'Consultation Summary - Dr. Smith.docx', type: 'Visit Summary', date: '2024-07-15', size: '85KB', uploader: 'Nurse Alex' },
  { id: 'f4', patient: 'Charlie Chaplin', name: 'ECG_Report_20240710.pdf', type: 'Lab Result', date: '2024-07-10', size: '650KB', uploader: 'Dr. Admin' },
  { id: 'f5', patient: 'Diana Prince', name: 'Pathology_Report_Biopsy.pdf', type: 'Pathology Report', date: '2024-07-05', size: '2.1MB', uploader: 'Dr. Smith' },
];

const mockPatients = ["Alice Wonderland", "Bob The Builder", "Charlie Chaplin", "Diana Prince"];
const fileTypes = ["All", "Lab Result", "Imaging Report", "Visit Summary", "Pathology Report", "Prescription"];


export default function MedicalFilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Medical Files</h1>
        <p className="text-muted-foreground">Access, upload, and manage patient medical history, conditions, medications, and visit logs.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FolderKanban className="mr-2 h-5 w-5 text-primary" /> Comprehensive Medical Records</CardTitle>
          <CardDescription>Securely manage all patient-related documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-card">
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 sm:min-w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search files by name or patient..." className="pl-8" />
                </div>
                <Select defaultValue="All">
                  <SelectTrigger className="w-full sm:w-auto">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fileTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full md:w-auto">
                <UploadCloud className="mr-2 h-4 w-4" /> Upload New File
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead className="hidden md:table-cell">Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Date Uploaded</TableHead>
                    <TableHead className="hidden lg:table-cell">Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFiles.length > 0 ? mockFiles.map(file => (
                    <TableRow key={file.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="truncate" title={file.name}>{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{file.patient}</TableCell>
                      <TableCell><Badge variant="outline">{file.type}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell">{file.date}</TableCell>
                      <TableCell className="hidden lg:table-cell">{file.size}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                          <Download className="mr-1 h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                        {/* Add more actions like view, delete in a DropdownMenu if needed */}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No medical files found. Start by uploading a new file.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* Placeholder sections for quick access (can be kept or removed) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center"><Pill className="h-5 w-5 text-primary mr-2" /> Medication History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Quick access to patient medication records.</p>
                 <Button variant="link" size="sm" className="px-0">View All &rarr;</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center"><Stethoscope className="h-5 w-5 text-primary mr-2" /> Visit Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Review notes from previous appointments.</p>
                 <Button variant="link" size="sm" className="px-0">View All &rarr;</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                 <CardTitle className="text-base flex items-center"><History className="h-5 w-5 text-primary mr-2" /> Full Patient History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Access comprehensive patient timeline.</p>
                <Button variant="link" size="sm" className="px-0">View Full History &rarr;</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
