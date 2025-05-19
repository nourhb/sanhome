
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
import type { MedicalFileItem, PatientListItem } from "@/app/actions";
import { fetchMedicalFiles, uploadMedicalFile, fetchPatients, fetchPatientById } from "@/app/actions";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const fileTypesForFilter = ["All", "Lab Result", "Imaging Report", "Visit Summary", "Pathology Report", "Prescription", "Other"];

export default function MedicalFilesPage() {
  const [files, setFiles] = useState<MedicalFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilterType, setSelectedFilterType] = useState<string>("All");

  // Effect to load patients for the dropdown
  useEffect(() => {
    async function loadPatientsForDropdown() {
      if (!currentUser && !authLoading) {
        setError("Please log in to manage medical files.");
        setIsLoadingPatients(false);
        return;
      }
      if (authLoading) return; // Wait for auth to finish loading

      setIsLoadingPatients(true);
      setError(null); // Clear previous errors
      try {
        const patientsResult = await fetchPatients();
        if (patientsResult.data) {
          setPatients(patientsResult.data);
        } else {
          setError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);
        }
      } catch (e: any) {
        setError(`Failed to load patient list: ${e.message}`);
      } finally {
        setIsLoadingPatients(false);
      }
    }
    loadPatientsForDropdown();
  }, [currentUser, authLoading]);

  // Effect to load medical files when selectedPatientId changes
  useEffect(() => {
    async function loadMedicalFilesForPatient() {
      if (!currentUser || !selectedPatientId) {
        setFiles([]); // Clear files if no patient is selected
        return;
      }
      setIsLoadingFiles(true);
      setError(null); // Clear previous errors specific to file loading
      try {
        const filesResult = await fetchMedicalFiles(selectedPatientId);
        if (filesResult.data) {
          setFiles(filesResult.data);
        } else {
          setError(prev => `${prev ? prev + " " : ""}Failed to load medical files for selected patient: ${filesResult.error || 'Unknown error'}`);
          setFiles([]);
        }
      } catch (e: any) {
        setError(`Failed to load medical files: ${e.message}`);
        setFiles([]);
      } finally {
        setIsLoadingFiles(false);
      }
    }

    loadMedicalFilesForPatient();
  }, [currentUser, selectedPatientId]);


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
    if (!selectedPatientId) {
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
        file
      );
      if (result.success) {
        toast({ title: "File Uploaded", description: result.message });
        // Re-fetch files for the currently selected patient
        if (selectedPatientId) {
            const filesResult = await fetchMedicalFiles(selectedPatientId);
            if (filesResult.data) setFiles(filesResult.data);
        }
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: result.message });
      }
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredFilesByType = files.filter(file =>
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
      // Files for the selected patient are already in the 'files' state
      // const filesResult = await fetchMedicalFiles(selectedPatientId); // Not needed if 'files' state is up-to-date

      if (!patientResult.data) {
        throw new Error(patientResult.error || "Failed to fetch patient details for PDF.");
      }
      const patient = patientResult.data;
      const patientFilesToReport = files; // Use the current 'files' state which should be for the selected patient

      const doc = new jsPDF();
      let yPos = 20;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const lineSpacing = 6;
      const sectionSpacing = 10;

      const addPageIfNeeded = (spaceNeeded: number = 20) => {
        if (yPos + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`Medical Report`, pageWidth / 2, yPos, { align: 'center' });
      yPos += lineSpacing * 1.5;
      addPageIfNeeded();

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Patient: ${patient.name || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += lineSpacing;
      addPageIfNeeded();

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Report Generated On: ${format(new Date(), "PPpp")}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += sectionSpacing * 1.5;
      addPageIfNeeded();
      doc.setTextColor(0);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Information", margin, yPos);
      yPos += lineSpacing * 0.5;
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineSpacing * 1.5;
      addPageIfNeeded();

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const addInfoLine = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value || 'N/A', margin + 35, yPos);
        yPos += lineSpacing;
        addPageIfNeeded();
      };

      addInfoLine("Patient ID", patient.id);
      addInfoLine("Age", patient.age ? patient.age.toString() : 'N/A');
      addInfoLine("Email", patient.email);
      addInfoLine("Phone", patient.phone);
      addInfoLine("Address", patient.address);
      yPos += sectionSpacing * 0.5;
      addPageIfNeeded();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Medical Summary", margin, yPos);
      yPos += lineSpacing * 0.5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineSpacing * 1.5;
      addPageIfNeeded();

      doc.setFontSize(11);
      addInfoLine("Mobility", patient.mobilityStatus);
      addInfoLine("Pathologies", (Array.isArray(patient.pathologies) && patient.pathologies.length > 0) ? patient.pathologies.join(', ') : 'None reported');
      addInfoLine("Allergies", (Array.isArray(patient.allergies) && patient.allergies.length > 0) ? patient.allergies.join(', ') : 'None reported');
      yPos += sectionSpacing * 0.5;
      addPageIfNeeded();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Current Medications (Placeholder)", margin, yPos);
      yPos += lineSpacing * 0.5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineSpacing * 1.5;
      addPageIfNeeded();
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Detailed medication list would be populated here from patient records.", margin, yPos, { maxWidth: pageWidth - margin * 2 });
      yPos += sectionSpacing;
      addPageIfNeeded();
      doc.setFont("helvetica", "normal");

      addPageIfNeeded(patientFilesToReport.length * 8 + 30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Medical Files", margin, yPos);
      yPos += lineSpacing * 0.5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineSpacing * 1.5;
      addPageIfNeeded();

      if (patientFilesToReport.length > 0) {
        const tableColumn = ["File Name", "Type", "Date Uploaded", "Size (MB)"];
        const tableRows = patientFilesToReport.map(file => [
          file.fileName || "N/A",
          file.fileType || "N/A",
          isValid(parseISO(file.uploadDate)) ? format(parseISO(file.uploadDate), "PP") : file.uploadDate,
          file.size ? (file.size / (1024 * 1024)).toFixed(2) : "N/A"
        ]);
        (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: margin, right: margin },
          didDrawPage: (data: any) => {
            yPos = data.cursor.y + 10;
          }
        });
      } else {
        doc.setFontSize(10);
        doc.text("No medical files found for this patient.", margin, yPos);
        yPos += lineSpacing;
      }

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 10, pageHeight - 10, {align: 'right'});
      }

      doc.save(`medical_report_${(patient.name || 'patient').replace(/\s/g, '_')}_${patient.id}.pdf`);
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

      {error && (isLoadingPatients || isLoadingFiles) && ( // Show general error if data is still loading
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
                     <Select onValueChange={setSelectedPatientId} value={selectedPatientId} disabled={patients.length === 0 || isLoadingPatients}>
                        <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={isLoadingPatients ? "Loading patients..." : (patients.length === 0 ? "No patients available" : "Select a patient...")} />
                        </SelectTrigger>
                        <SelectContent>
                            {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>{patient.name} (ID: {patient.id})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select onValueChange={setSelectedFilterType} defaultValue="All" disabled={isLoadingFiles || !selectedPatientId}>
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
                    <Button className="w-full sm:w-auto" onClick={handleFileUploadClick} disabled={isUploading || isLoadingFiles || isLoadingPatients || !selectedPatientId}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Upload File
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={generatePdfReport} disabled={isGeneratingPdf || isLoadingFiles || isLoadingPatients || !selectedPatientId || files.length === 0}>
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Generate PDF
                    </Button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            </div>

            {isLoadingFiles && (
              <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading files for selected patient...</div>
            )}
            {!isLoadingFiles && error && selectedPatientId && ( // Show file-specific error only if a patient is selected
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Files</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {!isLoadingFiles && !error && !selectedPatientId && (
                 <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>Please select a patient to view their medical files.</p>
                </div>
            )}
            {!isLoadingFiles && !error && selectedPatientId && filteredFilesByType.length === 0 && (
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>File Name</TableHead><TableHead className="hidden md:table-cell">Patient</TableHead><TableHead>Type</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead><TableHead className="hidden lg:table-cell">Size</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No medical files found for the selected patient or filter.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
               </div>
            )}
            {!isLoadingFiles && !error && selectedPatientId && filteredFilesByType.length > 0 && (
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
                    {filteredFilesByType.map(file => (
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
                        <TableCell className="hidden lg:table-cell">{file.size ? (file.size / (1024*1024)).toFixed(2) + 'MB' : 'N/A'}</TableCell>
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
