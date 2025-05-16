
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchPatients, type PatientListItem } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type PatientStatus = 'Stable' | 'Needs Follow-up' | 'Improving' | string; // Allow string for future statuses

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
        return 'bg-secondary/20 text-secondary-foreground border-secondary/40 hover:bg-secondary/30'; // Adjusted for better contrast
      case 'Needs Follow-up':
        return 'border-accent text-accent-foreground bg-accent/10 hover:bg-accent/20'; 
      default:
        return 'border-muted-foreground/30 text-muted-foreground bg-muted/20'; // Default for unknown statuses
    }
}

export default async function PatientsListPage() {
  const { data: patients, error } = await fetchPatients();

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Patients</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!patients || patients.length === 0) {
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
              <p className="text-muted-foreground">No patients found. Get started by adding a new patient.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
