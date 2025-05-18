
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, History, Pill, Stethoscope, UploadCloud, FileText, Download, Search, Filter, Loader2, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useEffect, useCallback, useRef } from "react";
import 'jspdf-autotable'; // Import for side effects
import { jsPDF } from 'jspdf'; // Default import
import { useAuth } from "@/contexts/auth-context";
import type { MedicalFileItem, PatientListItem } from "@/app/actions"; // Renamed to PatientListItem
import { fetchMedicalFiles, uploadMedicalFile, fetchPatients, fetchPatientById } from "@/app/actions";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const fileTypesForFilter = ["All", "Lab Result", "Imaging Report", "Visit Summary", "Pathology Report", "Prescription", "Other"];

export default function MedicalFilesPage() {
  const [files, setFiles] = useState<MedicalFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(""); // Initialize as empty string
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilterType, setSelectedFilterType] = useState<string>("All");


  const loadInitialData = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to manage medical files.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [patientsResult, filesResult] = await Promise.all([
        fetchPatients(),
        fetchMedicalFiles(selectedPatientId || undefined) // Fetch files for selected patient or all if none selected
      ]);

      if (patientsResult.data) {
        setPatients(patientsResult.data);
      } else {
        setError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);
      }

      if (filesResult.data) {
        setFiles(filesResult.data);
      } else {
        setError(prev => `${prev ? prev + " " : ""}Failed to load medical files: ${filesResult.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, selectedPatientId]);

  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading, loadInitialData]);

  const handleFileUploadClick = () => {
    if (!selectedPatientId) {
      toast({ variant: "destructive", title: "Patient Not Selected", description: "Please select a patient before uploading a file." });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    if (!selectedPatientId) { // Should be caught by handleFileUploadClick, but double-check
      toast({ variant: "destructive", title: "Please select a patient" });
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      toast({ title: "Uploading file...", description: file.name });
      const result = await uploadMedicalFile(
        selectedPatientId, 
        file.name, 
        file.type, 
        file.size, 
        currentUser.uid, 
        currentUser.displayName || currentUser.email || "Unknown uploader",
        file // Pass the File object itself
      );
      if (result.success) {
        toast({ title: "File Uploaded", description: result.message });
        loadInitialData(); // Refresh file list
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: result.message });
      }
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };
  
  const filteredFiles = files.filter(file => 
    selectedFilterType === "All" || file.fileType.toLowerCase().includes(selectedFilterType.toLowerCase())
  );

  const generatePdfReport = async () => {
    if (!selectedPatientId) {
      toast({ variant: "destructive", title: "No Patient Selected", description: "Please select a patient to generate their report." });
      return;
    }
    setIsGeneratingPdf(true);
    toast({ title: "Generating PDF Report...", description: "Fetching patient data and files." });

    try {
      const patientResult = await fetchPatientById(selectedPatientId);
      const filesResult = await fetchMedicalFiles(selectedPatientId);

      if (!patientResult.data) {
        throw new Error(patientResult.error || "Failed to fetch patient details for PDF.");
      }
      const patient = patientResult.data;
      const patientFiles = filesResult.data || [];

      const doc = new jsPDF();
      let yPos = 20;
      const margin = 15;
      const pageHeight = doc.internal.pageSize.height;
      const addPageIfNeeded = (spaceNeeded: number = 20) => {
        if (yPos + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };
      
      doc.setFontSize(18);
      doc.text(`Medical Report for ${patient.name}`, margin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.text(`Patient ID: ${patient.id}`, margin, yPos); yPos += 7;
      doc.text(`Age: ${patient.age}`, margin, yPos); yPos += 7;
      doc.text(`Email: ${patient.email || 'N/A'}`, margin, yPos); yPos += 7;
      doc.text(`Phone: ${patient.phone || 'N/A'}`, margin, yPos); yPos += 7;
      doc.text(`Address: ${patient.address || 'N/A'}`, margin, yPos); yPos += 10;
      addPageIfNeeded();

      doc.setFontSize(14);
      doc.text("Medical History (Summary)", margin, yPos); yPos += 7;
      doc.setFontSize(10);
      doc.text(`Mobility: ${patient.mobilityStatus || 'N/A'}`, margin, yPos); yPos += 5;
      doc.text(`Pathologies: ${patient.pathologies?.join(', ') || 'None reported'}`, margin, yPos); yPos += 5;
      doc.text(`Allergies: ${patient.allergies?.join(', ') || 'None reported'}`, margin, yPos); yPos += 10;
      addPageIfNeeded();
      
      // Placeholder for medications and visit summaries (can be expanded later)
      doc.setFontSize(14);
      doc.text("Current Medications (Placeholder)", margin, yPos); yPos += 7;
      doc.setFontSize(10);
      doc.text("Details to be fetched or entered.", margin, yPos); yPos += 10;
      addPageIfNeeded();

      doc.setFontSize(14);
      doc.text("Medical Files", margin, yPos); yPos += 7;
      addPageIfNeeded(patientFiles.length * 8 + 20); // Estimate table height

      if (patientFiles.length > 0) {
        const tableColumn = ["File Name", "Type", "Date Uploaded", "Size (MB)"];
        const tableRows = patientFiles.map(file => [
          file.fileName,
          file.fileType,
          isValid(parseISO(file.uploadDate)) ? format(parseISO(file.uploadDate), "PP") : file.uploadDate,
          (file.size / (1024 * 1024)).toFixed(2)
        ]);
        (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0], fontSize: 10 },
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
          didDrawPage: (data: any) => {
            yPos = data.cursor.y + 10; // Update yPos after table
          }
        });
      } else {
        doc.setFontSize(10);
        doc.text("No medical files found for this patient.", margin, yPos); yPos += 7;
      }
      
      doc.save(`medical_report_${patient.name.replace(/\s/g, '_')}_${patient.id}.pdf`);
      toast({ title: "PDF Generated", description: "Report downloaded successfully." });

    } catch (e: any) {
      console.error("PDF Generation Error:", e);
      toast({ variant: "destructive", title: "PDF Generation Failed", description: e.message || "Could not generate PDF report." });
    } finally {
      setIsGeneratingPdf(false);
    }
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
        <h1 className="text-2xl font-semibold">Patient Medical Files</h1>
        <p className="text-muted-foreground">Access, upload, and manage patient medical history, conditions, medications, and visit logs.</p>
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
          <CardTitle className="flex items-center"><FolderKanban className="mr-2 h-5 w-5 text-primary" /> Comprehensive Medical Records</CardTitle>
          <CardDescription>Securely manage all patient-related documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-card">
                <div className="flex-grow space-y-2 md:space-y-0 md:flex md:gap-2 w-full">
                     <Select onValueChange={setSelectedPatientId} value={selectedPatientId} disabled={patients.length === 0 || isLoading}>
                        <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={patients.length === 0 ? "No patients loaded" : "Select a patient..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>{patient.name} (ID: {patient.id})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select onValueChange={setSelectedFilterType} defaultValue="All" disabled={isLoading}>
                        <SelectTrigger className="w-full md:w-auto md:min-w-[180px]">
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Filter by type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {fileTypesForFilter.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button className="w-full sm:w-auto" onClick={handleFileUploadClick} disabled={isUploading || isLoading || !selectedPatientId}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Upload File
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={generatePdfReport} disabled={isGeneratingPdf || isLoading || !selectedPatientId}>
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Generate PDF
                    </Button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            </div>
            
            {isLoading && (
              <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading files...</div>
            )}
            {!isLoading && !error && filteredFiles.length === 0 && (
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>File Name</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {selectedPatientId ? "No medical files found for the selected patient or filter." : "Select a patient to view their files, or no files found."}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
               </div>
            )}
            {!isLoading && !error && filteredFiles.length > 0 && (
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
                    {filteredFiles.map(file => (
                      <TableRow key={file.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{file.patientName}</TableCell>
                        <TableCell><Badge variant="outline">{file.fileType || "Unknown"}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{isValid(parseISO(file.uploadDate)) ? format(parseISO(file.uploadDate), "PP") : 'N/A'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{(file.size / (1024*1024)).toFixed(2)}MB</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1 h-4 w-4" />
                              <span className="hidden sm:inline">View/Download</span>
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
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

