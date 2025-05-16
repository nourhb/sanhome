
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersCog, BarChartBig, DownloadCloud, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - replace with actual data fetching
const mockUsers = [
  { id: 'usr1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'Patient', status: 'Active', joined: '2023-01-15' },
  { id: 'usr2', name: 'Bob The Builder', email: 'bob@example.com', role: 'Patient', status: 'Active', joined: '2023-02-20' },
  { id: 'usr3', name: 'Nurse Joy', email: 'joy@sanhome.com', role: 'Nurse', status: 'Active', joined: '2022-11-10' },
  { id: 'usr4', name: 'Dr. Admin', email: 'admin@sanhome.com', role: 'Admin', status: 'Active', joined: '2022-10-01' },
  { id: 'usr5', name: 'Charlie Suspended', email: 'charlie@example.com', role: 'Patient', status: 'Suspended', joined: '2023-03-05' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Oversee and manage the SanHome platform.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersCog className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.length}</div>
            <p className="text-xs text-muted-foreground">+3 since last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Nurses</CardTitle>
            <UsersCog className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'Nurse').length}</div>
            <p className="text-xs text-muted-foreground">Online: 2</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <UsersCog className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Nurse applications</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersCog className="h-6 w-6 text-primary" /> User Management</CardTitle>
          <CardDescription>View, edit, and manage all users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'default' : 'outline'} className={user.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                        {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShieldCog className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <Button>Add New User</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Reports Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChartBig className="h-6 w-6 text-primary" /> Usage Reports</CardTitle>
          <CardDescription>Analytics and reports on platform usage. (Charts would be integrated here)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Users Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-60 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Line chart placeholder</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appointment Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-60 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Bar chart placeholder</p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Further reports could include: popular features, nurse activity levels, patient engagement metrics, etc.
            These would require data collection and backend processing.
          </p>
        </CardContent>
      </Card>

      {/* Data Export Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DownloadCloud className="h-6 w-6 text-primary" /> Data Export</CardTitle>
          <CardDescription>Export platform data in various formats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            This section would allow administrators to export data such as user lists, appointment histories, care logs, etc., typically in CSV or JSON format.
            Data export functionality requires backend implementation for data aggregation and file generation.
          </p>
          <div className="flex gap-2">
            <Button variant="outline">Export User Data (CSV)</Button>
            <Button variant="outline">Export Appointment Data (CSV)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
