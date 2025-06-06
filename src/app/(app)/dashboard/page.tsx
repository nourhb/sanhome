
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, CalendarCheck, Stethoscope, AlertCircle, Loader2, CheckCheck, TrendingDown, BarChartHorizontalBig, LineChart as LineChartIcon, PieChart as PieChartIconLucide, ListChecks, ClockIcon, DatabaseZap } from "lucide-react"; 
import Image from "next/image";
import { fetchDashboardStats, seedDatabase, type DashboardStats, type PatientRegistrationDataPoint, type AppointmentStatusDataPoint, type NursePerformanceDataPoint } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

// Mock data for Appointments by Type chart (as this data is not in videoConsults)
const appointmentsByTypeDataMock = [
  { type: "Check-up", count: 150, fill: "var(--color-checkup)" },
  { type: "Med Review", count: 90, fill: "var(--color-medreview)" },
  { type: "Wound Care", count: 60, fill: "var(--color-woundcare)" },
  { type: "Vitals", count: 120, fill: "var(--color-vitals)" },
  { type: "Consult", count: 75, fill: "var(--color-consult)" },
];

// Mock data for small stat cards that are not easily aggregated from current DB structure
const mockAdditionalStats = {
    completedAppointments: 78, 
    cancellationRate: "5%",
    avgResponseTime: "2.5 hrs",
    openSupportTickets: 3,
};


const chartConfigAppointmentsMock = {
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
  completed: { label: "Completed", color: "hsl(var(--chart-1))" },
  scheduled: { label: "Scheduled", color: "hsl(var(--chart-2))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--destructive))" },
};

const chartConfigNursePerformance = {
  consults: { label: "Consults" },
  // Colors will be applied directly via 'fill' in NursePerformanceDataPoint
};


export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = React.useState(false);

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
      setError("User not authenticated. Please log in to view dashboard.");
    }
  }, [currentUser, authLoading]);

  const handleSeedDatabase = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You must be logged in to seed the database.",
      });
      return;
    }
    setIsSeeding(true);
    toast({ title: "Seeding started...", description: "Please wait. This may take a moment." });
    try {
      const result = await seedDatabase();
      if (result.success) {
        toast({
          title: "Database Seeding Successful",
          description: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : ""),
          duration: 15000, // Show for longer
        });
        // Optionally, refresh dashboard stats after seeding
        // const newStats = await fetchDashboardStats();
        // if (newStats.data) setStats(newStats.data);
      } else {
        toast({
          variant: "destructive",
          title: "Database Seeding Failed",
          description: result.message + (result.details ? ` Details: ${JSON.stringify(result.details)}` : ""),
          duration: 15000,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Seeding Error",
        description: error.message || "An unexpected error occurred during seeding.",
        duration: 15000,
      });
    } finally {
      setIsSeeding(false);
    }
  };

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
        <Button onClick={handleSeedDatabase} disabled={isSeeding} variant="outline" className="mt-4">
          <DatabaseZap className="mr-2 h-4 w-4" />
          {isSeeding ? "Seeding..." : "Seed All Data (Users, Patients, Nurses, Consults)"}
        </Button>
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
           <Button onClick={handleSeedDatabase} disabled={isSeeding || !currentUser} variant="outline" className="mt-4">
            <DatabaseZap className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding Database..." : "Seed Database with Tunisian Data"}
          </Button>
          {!currentUser && <p className="text-xs text-destructive mt-1">Login to enable database seeding.</p>}
          <p className="text-xs text-muted-foreground mt-1">
            (Click to populate with sample Users, Patients, Nurses, and Video Consults if database is empty)
          </p>
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
                  <LineChart data={stats.patientRegistrationsData || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12}/>
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false}/>
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
                <CardDescription className="text-xs">Note: This chart uses mock data as "appointment type" is not currently stored in the database.</CardDescription>
              </CardHeader>
              <CardContent>
                 <ChartContainer config={chartConfigAppointmentsMock} className="h-[250px] w-full">
                  <BarChart data={appointmentsByTypeDataMock} layout="vertical" margin={{ right: 20, left: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide/>
                    <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={12} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    {/* <Legend content={<ChartLegendContent />} /> */} {/* Removed legend for this specific chart to save space */}
                    <Bar dataKey="count" barSize={15} radius={4}>
                      {appointmentsByTypeDataMock.map((entry) => (
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
                    <Pie data={stats.appointmentStatusData || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} labelLine={false} label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {(stats.appointmentStatusData || []).map((entry) => (
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
                <CardDescription>Consults handled by nurses (Top 5).</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigNursePerformance} className="h-[250px] w-full">
                  <BarChart data={stats.nursePerformanceData || []} layout="vertical" margin={{ left: 30, right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="consults" fontSize={12} allowDecimals={false} />
                    <YAxis dataKey="nurseName" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={12} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="consults" label={{ position: 'right', fill: 'hsl(var(--foreground))', fontSize: 10 }} barSize={15} radius={4}>
                      {(stats.nursePerformanceData || []).map((entry) => (
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
                    <div className="text-2xl font-bold">{mockAdditionalStats.completedAppointments}</div>
                    <p className="text-xs text-muted-foreground">+12 since last week (mock)</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{mockAdditionalStats.cancellationRate}</div>
                    <p className="text-xs text-muted-foreground">Improved from 7% (mock)</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                    <ClockIcon className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{mockAdditionalStats.avgResponseTime}</div>
                    <p className="text-xs text-muted-foreground">-0.5 hrs from last week (mock)</p>
                </CardContent>
             </Card>
             <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Support Tickets</CardTitle>
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{mockAdditionalStats.openSupportTickets}</div>
                    <p className="text-xs text-muted-foreground">Unresolved (mock)</p>
                </CardContent>
             </Card>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}


    