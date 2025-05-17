
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, History, Pill, Stethoscope, UploadCloud, FileText, Download, Search, Filter, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { MedicalFileItem } from "@/app/actions";
import { fetchMedicalFiles, uploadMedicalFile } from "@/app/actions"; // Assuming uploadMedicalFile exists
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const fileTypes = ["All", "Lab Result", "Imaging Report", "Visit Summary", "Pathology Report", "Prescription"];

export default function MedicalFilesPage() {
  const [files, setFiles] = useState<MedicalFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Placeholder for actual file upload handling
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to manage medical files.");
      setIsLoading(false);
      setFiles([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Assuming fetchMedicalFiles doesn't require a specific patientId for a general list
      // or you'd pass the relevant ID (e.g., current user's clinic ID if applicable)
      const result = await fetchMedicalFiles(); 
      if (result.data) {
        setFiles(result.data);
      } else {
        setError(result.error || "Failed to load medical files.");
      }
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if(!authLoading){
      loadFiles();
    }
  }, [authLoading, loadFiles]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated" });
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      toast({ title: "Uploading file...", description: file.name });
      // In a real app, you'd get patientId from context or selection
      // For simulation, we'll use a placeholder or assume a global context later
      const placeholderPatientId = "patient123"; 
      const result = await uploadMedicalFile(
        placeholderPatientId, 
        file.name, 
        file.type, 
        file.size, 
        currentUser.uid, 
        currentUser.displayName || currentUser.email || "Unknown uploader"
      );
      if (result.success) {
        toast({ title: "File Uploaded", description: result.message });
        loadFiles(); // Refresh file list
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: result.message });
      }
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
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
              <Button className="w-full md:w-auto" onClick={handleFileUploadClick} disabled={isUploading || isLoading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                 Upload New File
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            </div>
            
            {isLoading && (
              <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading files...</div>
            )}
            {!isLoading && !error && files.length === 0 && (
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>File Name</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No medical files found. Start by uploading a new file.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
               </div>
            )}
            {!isLoading && !error && files.length > 0 && (
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
                    {files.map(file => (
                      <TableRow key={file.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{file.patientName}</TableCell>
                        <TableCell><Badge variant="outline">{file.fileType}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{format(parseISO(file.uploadDate), "PP")}</TableCell>
                        <TableCell className="hidden lg:table-cell">{(file.size / (1024*1024)).toFixed(2)}MB</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"> {/* Assuming fileUrl is a direct download/view link */}
                              <Download className="mr-1 h-4 w-4" />
                              <span className="hidden sm:inline">Download</span>
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
