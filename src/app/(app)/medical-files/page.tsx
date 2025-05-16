import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, History, Pill, Stethoscope } from "lucide-react";

export default function MedicalFilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Medical Files</h1>
        <p className="text-muted-foreground">Access complete patient medical history, conditions, medications, and visit logs.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FolderKanban className="mr-2 h-5 w-5 text-primary" /> Comprehensive Medical Records</CardTitle>
          <CardDescription>This section will provide a holistic view of each patient's medical journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center bg-muted rounded-md">
            <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Full Patient Medical File Feature Coming Soon</h3>
            <p className="text-muted-foreground">
              Detailed patient files including medical history, diagnosed conditions, prescribed medications, allergies, immunization records, and all past visit logs will be accessible here.
              Secure and organized for quick reference.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 border rounded-lg bg-background">
              <Pill className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-semibold">Medication History</h4>
              <p className="text-xs text-muted-foreground">Track all prescribed and past medications.</p>
            </div>
            <div className="p-4 border rounded-lg bg-background">
              <Stethoscope className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-semibold">Visit Summaries</h4>
              <p className="text-xs text-muted-foreground">Review notes and outcomes from previous appointments.</p>
            </div>
            <div className="p-4 border rounded-lg bg-background">
              <FolderKanban className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-semibold">Lab Results & Reports</h4>
              <p className="text-xs text-muted-foreground">View and manage diagnostic reports.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
