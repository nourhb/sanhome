
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, CalendarCheck, Stethoscope, AlertCircle, Loader2, CheckCheck, TrendingDown, BarChartHorizontalBig, LineChart as LineChartIcon } from "lucide-react"; // Added new icons
import Image from "next/image";
import { fetchDashboardStats, type DashboardStats } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
      
      {/* New Analytics Section */}
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
                    <Legend />
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
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" hideLabel />}
                    />
                    <Legend />
                    {Object.keys(chartConfigAppointments)
                        .filter(key => key !== 'count') // Exclude the generic 'count' key used for dataKey
                        .map((key) => (
                            <Bar key={key} dataKey="count" name={chartConfigAppointments[key as keyof typeof chartConfigAppointments].label as string} fill={`var(--color-${key})`} radius={4} barSize={15} />
                        ))
                    }
                     {/* Fallback generic bar if specific fills aren't working or for simplicity: */}
                     {/* <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20} name="Count" /> */}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
             {/* Add two more small stat cards here if desired */}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

