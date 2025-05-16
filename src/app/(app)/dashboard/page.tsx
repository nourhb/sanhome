
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, CalendarCheck, Stethoscope, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { fetchDashboardStats, type DashboardStats } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      // Wait for authentication to complete
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
      // User is not authenticated, or auth state is still loading.
      // Routing should ideally handle unauthenticated users,
      // but we set loading to false if auth is done and no user.
      setIsLoading(false);
      // setError("User not authenticated. Please log in to view the dashboard.");
      // Or, you might rely on the main app router to redirect to login.
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
      
      <Card className="overflow-hidden">
          <Image 
            src="https://placehold.co/1200x400.png" 
            alt="Healthcare banner" 
            width={1200} 
            height={400} 
            className="w-full h-auto object-cover"
            data-ai-hint="healthcare team" 
          />
      </Card>

    </div>
  );
}
