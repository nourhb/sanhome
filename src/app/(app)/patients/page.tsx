
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PatientListItem } from '@/app/actions'; // Keep type definition
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase'; // Import db
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore'; // Import Firestore functions

type PatientStatus = 'Stable' | 'Needs Follow-up' | 'Improving' | string;

const getStatusBadgeVariant = (status: PatientStatus) => {
  switch (status) {
    case 'Stable':
      return 'default'; 
    case 'Improving':
      return 'secondary'; 
    case 'Needs Follow-up':
      return 'outline'; 
    default:
      return 'outline';
  }
};

const getStatusBadgeClassNames = (status: PatientStatus) => {
    switch (status) {
      case 'Stable':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'Improving':
        return 'bg-secondary/20 text-secondary-foreground border-secondary/40 hover:bg-secondary/30';
      case 'Needs Follow-up':
        return 'border-accent text-accent-foreground bg-accent/10 hover:bg-accent/20'; 
      default:
        return 'border-muted-foreground/30 text-muted-foreground bg-muted/20';
    }
}

export default function PatientsListPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    console.log("[CLIENT_LOG] PatientsListPage useEffect triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);

    async function loadPatientsDirectly() {
      console.log("[CLIENT_LOG] PatientsListPage loadPatientsDirectly: Initiating direct Firestore fetch.");
      setIsLoading(true);
      setError(null);
      setPatients(null);

      try {
        const patientsCollectionRef = collection(db, "patients");
        // const q = query(patientsCollectionRef); // Simplified query
        const q = query(patientsCollectionRef, orderBy("createdAt", "desc"));
        console.log("[CLIENT_LOG] PatientsListPage loadPatientsDirectly: Created collection reference. Attempting getDocs...");
        
        const patientsSnapshot = await getDocs(q);
        console.log(`[CLIENT_LOG] PatientsListPage loadPatientsDirectly: getDocs successful. Found ${patientsSnapshot.docs.length} documents.`);
        
        const patientsList = patientsSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "N/A",
            age: data.age || 0,
            avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=P`,
            joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate || new Date().toISOString().split('T')[0],
            primaryNurse: data.primaryNurse || "N/A",
            phone: data.phone || "N/A",
            email: data.email || "N/A",
            address: data.address || "N/A",
            mobilityStatus: data.mobilityStatus || "N/A",
            pathologies: Array.isArray(data.pathologies) ? data.pathologies : [],
            allergies: Array.isArray(data.allergies) ? data.allergies : [],
            lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit || new Date().toISOString().split('T')[0],
            condition: data.condition || "N/A",
            status: data.status || "N/A",
            hint: data.hint || 'person face',
            createdAt: data.createdAt, // Keep original timestamp if needed for sorting, or convert
          } as PatientListItem;
        });
        console.log("[CLIENT_LOG] PatientsListPage loadPatientsDirectly: Data mapping complete. Setting patients state.");
        setPatients(patientsList);
      } catch (e: any) {
        console.error("[CLIENT_ERROR] PatientsListPage loadPatientsDirectly: Exception during direct Firestore fetch:", e);
        setError(e.message || "An unexpected error occurred while fetching patients directly.");
        setPatients(null);
      } finally {
        console.log("[CLIENT_LOG] PatientsListPage loadPatientsDirectly: Fetch finished, setting component isLoading to false.");
        setIsLoading(false);
      }
    }

    if (authLoading) {
      console.log("[CLIENT_LOG] PatientsListPage: Auth is loading, setting component isLoading to true.");
      setIsLoading(true);
      return;
    }

    if (!currentUser) {
      console.log("[CLIENT_LOG] PatientsListPage: No current user. Setting error and stopping load.");
      setError("User not authenticated. Please log in to view patients.");
      setIsLoading(false);
      setPatients(null); 
      return;
    }
    
    console.log("[CLIENT_LOG] PatientsListPage: User is authenticated (currentUser.uid:", currentUser.uid, "). Proceeding to load patients directly.");
    loadPatientsDirectly();

  }, [currentUser, authLoading]);

  if (isLoading) {
    console.log("[CLIENT_LOG] PatientsListPage render: isLoading is true. Showing loader.");
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading patient data...</p>
      </div>
    );
  }

  if (error) {
    console.log("[CLIENT_LOG] PatientsListPage render: error is present. Showing error alert:", error);
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Patients</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
         {/* <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button> */}
      </div>
    );
  }
  
  if (!patients || patients.length === 0) {
    console.log("[CLIENT_LOG] PatientsListPage render: No patients data or empty array. Showing 'No patients found'.");
     return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Patient Management</h1>
            <p className="text-muted-foreground">View, add, and manage patient records.</p>
          </div>
          <Button asChild>
            <Link href="/patients/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Patient
            </Link>
          </Button>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Patients</CardTitle>
            <CardDescription>A list of all registered patients in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <p className="text-muted-foreground">No patients found. Get started by adding a new patient or ensure you are logged in and have the necessary permissions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("[CLIENT_LOG] PatientsListPage render: Rendering patient table with", patients.length, "patients.");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patient Management</h1>
          <p className="text-muted-foreground">View, add, and manage patient records.</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Patient
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Patients</CardTitle>
          <CardDescription>A list of all registered patients in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Primary Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient: PatientListItem) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.lastVisit}</TableCell>
                  <TableCell>{patient.condition}</TableCell>
                  <TableCell>
                    <Badge 
                        variant={getStatusBadgeVariant(patient.status)}
                        className={getStatusBadgeClassNames(patient.status)}
                    >
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/patients/${patient.id}`}>
                        <Eye className="mr-2 h-3 w-3" /> View Profile
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
    
