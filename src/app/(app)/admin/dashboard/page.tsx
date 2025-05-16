
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersRound, BarChartBig, DownloadCloud, MoreHorizontal, Edit, Trash2, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Mock data - replace with actual data fetching
const mockUsers = [
  { id: 'usr1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'Patient', status: 'Active', joined: '2023-01-15' },
  { id: 'usr2', name: 'Bob The Builder', email: 'bob@example.com', role: 'Patient', status: 'Active', joined: '2023-02-20' },
  { id: 'usr3', name: 'Nurse Joy', email: 'joy@sanhome.com', role: 'Nurse', status: 'Active', joined: '2022-11-10' },
  { id: 'usr4', name: 'Dr. Admin', email: 'admin@sanhome.com', role: 'Admin', status: 'Active', joined: '2022-10-01' },
  { id: 'usr5', name: 'Charlie Suspended', email: 'charlie@example.com', role: 'Patient', status: 'Suspended', joined: '2023-03-05' },
];

const activeUsersData = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 150 },
  { month: "Mar", users: 130 },
  { month: "Apr", users: 170 },
  { month: "May", users: 200 },
  { month: "Jun", users: 180 },
];

const appointmentTrendsData = [
  { type: "Check-up", count: 45 },
  { type: "Med Review", count: 30 },
  { type: "Wound Care", count: 25 },
  { type: "Vitals", count: 50 },
  { type: "Consult", count: 15 },
];

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
            <div className="text-2xl font-bold">{mockUsers.length}</div>
            <p className="text-xs text-muted-foreground">+3 since last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Nurses</CardTitle>
            <UsersRound className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'Nurse').length}</div>
            <p className="text-xs text-muted-foreground">Online: 2</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <UsersRound className="h-5 w-5 text-muted-foreground" />
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
          <CardDescription>Analytics and reports on platform usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Users Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigLine} className="h-[240px] w-full">
                  <LineChart data={activeUsersData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
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
