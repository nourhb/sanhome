import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data for patient list
const mockPatients = [
  { id: '1', name: 'Alice Wonderland', age: 34, lastVisit: '2024-07-15', condition: 'Diabetes Type 1', status: 'Stable' },
  { id: '2', name: 'Bob The Builder', age: 52, lastVisit: '2024-07-20', condition: 'Hypertension', status: 'Needs Follow-up' },
  { id: '3', name: 'Charlie Chaplin', age: 78, lastVisit: '2024-07-01', condition: 'Arthritis', status: 'Stable' },
  { id: '4', name: 'Diana Prince', age: 45, lastVisit: '2024-06-25', condition: 'Post-surgery Recovery', status: 'Improving' },
];

export default function PatientsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patient Management</h1>
          <p className="text-muted-foreground">View, add, and manage patient records.</p>
        </div>
        <Button asChild>
          <Link href="/patients/new"> {/* Placeholder for new patient form */}
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
              {mockPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.lastVisit}</TableCell>
                  <TableCell>{patient.condition}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'Stable' ? 'default' : patient.status === 'Improving' ? 'secondary' : 'destructive'}
                           className={patient.status === 'Stable' ? 'bg-green-100 text-green-800 border-green-300' 
                                       : patient.status === 'Improving' ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                       : 'bg-yellow-100 text-yellow-800 border-yellow-300'}>
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
