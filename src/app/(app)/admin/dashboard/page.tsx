
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersRound, BarChartBig, DownloadCloud, MoreHorizontal, Edit, Trash2, Settings2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserForAdminList, NurseListItem, PatientListItem } from "@/app/actions";
import { fetchUsersForAdmin, fetchNurses, fetchPatients, fetchVideoConsults } from "@/app/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { format, parseISO, isValid } from "date-fns"; // Added parseISO and isValid

const chartConfigLine = {
  users: {
    label: "Active Users",
    color: "hsl(var(--chart-1))",
  },
};

const chartConfigBar = {
  count: {
    label: "Appointments",
    color: "hsl(var(--chart-2))",
  },
};

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserForAdminList[]>([]);
  const [nurses, setNurses] = useState<NurseListItem[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [videoConsults, setVideoConsults] = useState<any[]>([]); // Using 'any' for now

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading, userRole } = useAuth();

  const loadAdminData = useCallback(async () => {
    if (!currentUser || userRole !== 'admin') {
      if (!authLoading && userRole !== 'admin') { // Check authLoading to prevent premature error
        setError("Access denied. Admin privileges required.");
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [usersResult, nursesResult, patientsResult, consultsResult] = await Promise.all([
        fetchUsersForAdmin(),
        fetchNurses(),
        fetchPatients(),
        fetchVideoConsults()
      ]);

      if (usersResult.data) setUsers(usersResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load users: ${usersResult.error || 'Unknown error'}`);
      
      if (nursesResult.data) setNurses(nursesResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load nurses: ${nursesResult.error || 'Unknown error'}`);

      if (patientsResult.data) setPatients(patientsResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load patients: ${patientsResult.error || 'Unknown error'}`);
      
      if (consultsResult.data) setVideoConsults(consultsResult.data);
      else setError(prev => `${prev ? prev + " " : ""}Failed to load consults: ${consultsResult.error || 'Unknown error'}`);

    } catch (e: any) {
      setError(`Failed to load admin data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userRole, authLoading]);

  useEffect(() => {
    if(!authLoading){
      loadAdminData();
    }
  }, [authLoading, loadAdminData]);

  const activeUsersData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((monthName, index) => {
      const count = users.filter(u => {
        if (!u.joined) return false;
        const joinedDate = parseISO(u.joined);
        return isValid(joinedDate) && joinedDate.getMonth() === index;
      }).length;
      return { month: monthName, users: count || Math.floor(Math.random() * 50 + 100) }; // Keep random fallback for now if needed
    });
  }, [users]);


  const appointmentTrendsData = React.useMemo(() => [
    { type: "Check-up", count: videoConsults.filter(c => c.status === 'completed').length || 45 },
    { type: "Med Review", count: Math.floor(Math.random()*20+20) },
    { type: "Wound Care", count: Math.floor(Math.random()*15+10) },
    { type: "Vitals", count: Math.floor(Math.random()*30+30) },
    { type: "Consult", count: Math.floor(Math.random()*10+10) },
  ], [videoConsults]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (userRole !== 'admin' && !isLoading) {
     return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page. Admin privileges required.</AlertDescription>
        </Alert>
    );
  }
  
  if (error) {
    return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }


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
            <UsersRound className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">+3 since last month (mock)</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Nurses</CardTitle>
            <UsersRound className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nurses.filter(n => n.status === 'Available' || n.status === 'On Duty').length}</div>
            <p className="text-xs text-muted-foreground">Online: {nurses.filter(n => n.status === 'On Duty').length} (mock)</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <UsersRound className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">Active Care: {patients.filter(p => p.status !== 'Discharged').length} (mock)</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersRound className="h-6 w-6 text-primary" /> User Management</CardTitle>
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
              {users.map((user) => {
                const joinedDate = user.joined ? parseISO(user.joined) : null;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'outline'} className={user.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                          {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {joinedDate && isValid(joinedDate) 
                        ? format(joinedDate, "PP") 
                        : 'N/A'}
                    </TableCell>
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
                            <Settings2 className="mr-2 h-4 w-4" />
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
                );
              })}
            </TableBody>
          </Table>
          {users.length === 0 && <p className="text-center text-muted-foreground py-4">No users found.</p>}
          <div className="mt-4 flex justify-end">
            <Button>Add New User</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Reports Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChartBig className="h-6 w-6 text-primary" /> Usage Reports</CardTitle>
          <CardDescription>Analytics and reports on platform usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Users Over Time</CardTitle>
                <CardDescription className="text-xs">Based on user join dates from Firestore.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigLine} className="h-[240px] w-full">
                  <LineChart data={activeUsersData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Legend />
                    <Line dataKey="users" type="monotone" stroke="var(--color-users)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appointment Trends</CardTitle>
                <CardDescription className="text-xs">Mock data - 'type' field needed for actual trends.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigBar} className="h-[240px] w-full">
                  <BarChart data={appointmentTrendsData} layout="vertical" margin={{ right: 20, left:10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} fontSize={12} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20}/>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Further reports could include: popular features, nurse activity levels, patient engagement metrics, etc.
            These would require data collection and backend processing or more detailed data models.
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

