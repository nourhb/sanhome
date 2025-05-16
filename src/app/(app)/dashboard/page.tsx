
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, CalendarCheck, Stethoscope, AlertCircle, Loader2, CheckCheck, TrendingDown, BarChartHorizontalBig, LineChart as LineChartIcon, PieChart as PieChartIconLucide, ListChecks } from "lucide-react"; // Added new icons
import Image from "next/image";
import { fetchDashboardStats, type DashboardStats } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

// Mock data for new charts - this would ideally come from fetchDashboardStats or dedicated actions
const appointmentsByTypeData = [
  { type: "Check-up", count: 150, fill: "var(--color-checkup)" },
  { type: "Med Review", count: 90, fill: "var(--color-medreview)" },
  { type: "Wound Care", count: 60, fill: "var(--color-woundcare)" },
  { type: "Vitals", count: 120, fill: "var(--color-vitals)" },
  { type: "Consult", count: 75, fill: "var(--color-consult)" },
];

const patientRegistrationsData = [
  { month: "Jan", newPatients: 10 },
  { month: "Feb", newPatients: 15 },
  { month: "Mar", newPatients: 12 },
  { month: "Apr", newPatients: 18 },
  { month: "May", newPatients: 25 },
  { month: "Jun", newPatients: 22 },
];

const appointmentStatusData = [
  { status: "Completed", count: 185, fill: "var(--color-completed)" },
  { status: "Scheduled", count: 65, fill: "var(--color-scheduled)" },
  { status: "Cancelled", count: 22, fill: "var(--color-cancelled)" },
];

const nursePerformanceData = [
  { nurseName: "Nurse Joy", tasks: 45, fill: "var(--color-nurseJoy)" },
  { nurseName: "Nurse Alex", tasks: 38, fill: "var(--color-nurseAlex)" },
  { nurseName: "Nurse Betty", tasks: 52, fill: "var(--color-nurseBetty)" },
  { nurseName: "Nurse Charles", tasks: 30, fill: "var(--color-nurseCharles)" },
];

const chartConfigAppointments = {
  count: { label: "Count" },
  checkup: { label: "Check-up", color: "hsl(var(--chart-1))" },
  medreview: { label: "Med Review", color: "hsl(var(--chart-2))" },
  woundcare: { label: "Wound Care", color: "hsl(var(--chart-3))" },
  vitals: { label: "Vitals Check", color: "hsl(var(--chart-4))" },
  consult: { label: "Consultation", color: "hsl(var(--chart-5))" },
};

const chartConfigRegistrations = {
  newPatients: {
    label: "New Patients",
    color: "hsl(var(--chart-1))",
  },
};

const chartConfigAppointmentStatus = {
  count: { label: "Count" },
  completed: { label: "Completed", color: "hsl(var(--chart-1))" }, // Green
  scheduled: { label: "Scheduled", color: "hsl(var(--chart-2))" }, // Blue
  cancelled: { label: "Cancelled", color: "hsl(var(--destructive))" }, // Red
};

const chartConfigNursePerformance = {
  tasks: { label: "Tasks Completed" },
  nurseJoy: { label: "Nurse Joy", color: "hsl(var(--chart-3))" },
  nurseAlex: { label: "Nurse Alex", color: "hsl(var(--chart-4))" },
  nurseBetty: { label: "Nurse Betty", color: "hsl(var(--chart-5))" },
  nurseCharles: { label: "Nurse Charles", color: "hsl(var(--chart-1))" }
};


export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock additional stats that might come from an expanded DashboardStats type
  const additionalStats = {
    completedAppointments: stats ? Math.floor(stats.upcomingAppointments * 0.85) : 78, // Example calculation
    cancellationRate: "5%",
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (currentUser) {
      const getStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await fetchDashboardStats();
          if (result.data) {
            setStats(result.data);
          } else {
            setError(result.error || "Failed to load dashboard statistics (no data).");
          }
        } catch (e: any) {
          setError(e.message || "An unexpected error occurred while fetching stats.");
        } finally {
          setIsLoading(false);
        }
      };
      getStats();
    } else {
      setIsLoading(false);
    }
  }, [currentUser, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard Data</AlertTitle>
          <AlertDescription>{error || "Could not load dashboard statistics."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Welcome to SanHome!</CardTitle>
          <CardDescription className="text-lg">
            Your centralized platform for managing home healthcare with ease and efficiency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Navigate through the sections using the sidebar to manage patients, nurses, appointments, and more. Get personalized care suggestions powered by AI to enhance patient outcomes.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePatients}</div>
            <p className="text-xs text-muted-foreground">{stats.activePatientsChange}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <CalendarCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">{stats.upcomingAppointmentsToday}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Nurses</CardTitle>
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableNurses}</div>
            <p className="text-xs text-muted-foreground">{stats.availableNursesOnline}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Quality Score</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.careQualityScore}</div>
            <p className="text-xs text-muted-foreground">{stats.careQualityScoreTrend}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Quick links to common tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
              <h3 className="font-semibold mb-1">Manage Patients</h3>
              <p className="text-sm text-muted-foreground">View patient profiles, medical history, and care plans.</p>
              <a href="/patients" className="text-sm text-primary hover:underline mt-2 inline-block">Go to Patients &rarr;</a>
            </div>
            <div className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
              <h3 className="font-semibold mb-1">Schedule Appointments</h3>
              <p className="text-sm text-muted-foreground">Book new appointments or manage existing ones.</p>
              <a href="/appointments" className="text-sm text-primary hover:underline mt-2 inline-block">Go to Appointments &rarr;</a>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Detailed Analytics</CardTitle>
          <CardDescription>Insights into platform activity and patient care.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><LineChartIcon className="mr-2 h-5 w-5 text-primary" />Patient Registrations Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigRegistrations} className="h-[250px] w-full">
                  <LineChart data={patientRegistrationsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="newPatients" stroke="var(--color-newPatients)" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary" />Appointments by Type</CardTitle>
              </CardHeader>
              <CardContent>
                 <ChartContainer config={chartConfigAppointments} className="h-[250px] w-full">
                  <BarChart data={appointmentsByTypeData} layout="vertical" margin={{ right: 20, left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide/>
                    <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={12} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="count" barSize={15} radius={4}>
                      {appointmentsByTypeData.map((entry) => (
                        <Cell key={`cell-${entry.type}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><PieChartIconLucide className="mr-2 h-5 w-5 text-primary" />Appointment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigAppointmentStatus} className="h-[250px] w-full">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={appointmentStatusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} labelLine={false} label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {appointmentStatusData.map((entry) => (
                        <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Nurse Performance</CardTitle>
                <CardDescription>Tasks completed by nurses.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigNursePerformance} className="h-[250px] w-full">
                  <BarChart data={nursePerformanceData} layout="vertical" margin={{ left: 30, right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="tasks" fontSize={12} />
                    <YAxis dataKey="nurseName" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={12} />
                    <Tooltip content={<ChartTooltipContent />} />
                    {/* Removed legend for this chart as nurse names are on Y-axis 
                        <Legend content={<ChartLegendContent nameKey="nurseName" />} />
                    */}
                    <Bar dataKey="tasks" label={{ position: 'right', fill: 'hsl(var(--foreground))', fontSize: 10 }} barSize={15} radius={4}>
                      {nursePerformanceData.map((entry) => (
                        <Cell key={`cell-${entry.nurseName}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Appointments</CardTitle>
                    <CheckCheck className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{additionalStats.completedAppointments}</div>
                    <p className="text-xs text-muted-foreground">+12 since last week</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{additionalStats.cancellationRate}</div>
                    <p className="text-xs text-muted-foreground">Improved from 7% last month</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                    <ClockIcon className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">2.5 hrs</div>
                    <p className="text-xs text-muted-foreground">-0.5 hrs from last week</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Support Tickets</CardTitle>
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">Unresolved</p>
                </CardContent>
             </Card>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

    