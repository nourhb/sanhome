import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, CalendarCheck, Stethoscope } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
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
            <div className="text-2xl font-bold">152</div>
            <p className="text-xs text-muted-foreground">+12 since last week</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <CalendarCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">5 today</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Nurses</CardTitle>
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Online now</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Quality Score</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.5%</div>
            <p className="text-xs text-muted-foreground">Above average</p>
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
