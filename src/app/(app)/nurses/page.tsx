
"use client";

import Link from 'next/link';
import Image from "next/image";
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MapPin, Phone, UserPlus, Mail, Briefcase, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NurseListItem } from '@/app/actions'; // Keep type definition
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';

export default function NursesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [nurses, setNurses] = useState<NurseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("[CLIENT_LOG] NursesPage useEffect triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);

    async function loadNursesDirectly() {
      console.log("[CLIENT_LOG] NursesPage loadNursesDirectly: Initiating direct Firestore fetch.");
      setIsLoading(true);
      setError(null);
      setNurses(null);

      try {
        const nursesCollectionRef = collection(db, "nurses");
        const q = query(nursesCollectionRef, orderBy("createdAt", "desc"));
        console.log("[CLIENT_LOG] NursesPage loadNursesDirectly: Created collection reference. Attempting getDocs...");
        
        const nursesSnapshot = await getDocs(q);
        console.log(`[CLIENT_LOG] NursesPage loadNursesDirectly: getDocs successful. Found ${nursesSnapshot.docs.length} documents.`);
        
        const nursesList = nursesSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "N/A",
            specialty: data.specialty || "N/A",
            location: data.location || "N/A",
            phone: data.phone || "N/A",
            email: data.email || "N/A",
            avatar: data.avatar || `https://placehold.co/100x100.png?text=N`,
            status: data.status || "Available",
            hint: data.hint || 'nurse medical',
            createdAt: data.createdAt, // Keep original timestamp
          } as NurseListItem;
        });
        console.log("[CLIENT_LOG] NursesPage loadNursesDirectly: Data mapping complete. Setting nurses state.");
        setNurses(nursesList);
      } catch (e: any) {
        console.error("[CLIENT_ERROR] NursesPage loadNursesDirectly: Exception during direct Firestore fetch:", e);
        setError(e.message || "An unexpected error occurred while fetching nurses directly.");
        setNurses(null);
      } finally {
        console.log("[CLIENT_LOG] NursesPage loadNursesDirectly: Fetch finished, setting component isLoading to false.");
        setIsLoading(false);
      }
    }

    if (authLoading) {
      console.log("[CLIENT_LOG] NursesPage: Auth is loading, setting component isLoading to true.");
      setIsLoading(true);
      return;
    }

    if (!currentUser) {
      console.log("[CLIENT_LOG] NursesPage: No current user. Setting error and stopping load.");
      setError("User not authenticated. Please log in to view nurses.");
      setIsLoading(false);
      setNurses(null); 
      return;
    }
    
    console.log("[CLIENT_LOG] NursesPage: User is authenticated. Proceeding to load nurses directly.");
    loadNursesDirectly();

  }, [currentUser, authLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading nurse data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Nurses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!nurses || nurses.length === 0) {
     return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Nurse Management</h1>
            <p className="text-muted-foreground">Manage nurse profiles, assignments, and tracking.</p>
          </div>
          <Button asChild>
            <Link href="/nurses/new">
              <UserPlus className="mr-2 h-4 w-4" /> Add New Nurse
            </Link>
          </Button>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Nurse Directory</CardTitle>
            <CardDescription>Browse and manage nurse profiles. Geolocation tracking would appear on the map below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <p className="text-muted-foreground">No nurses found. Get started by adding a new nurse or ensure you are logged in and have the necessary permissions.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nurse Geolocation Tracking</CardTitle>
          <CardDescription>Real-time location of active nurses.</CardDescription>
        </CardHeader>
        <CardContent className="h-96 bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
          <Image 
            src="https://placehold.co/1000x600.png" 
            alt="Map placeholder showing city streets and pins" 
            fill={true}
            className="object-cover opacity-30" 
            data-ai-hint="map city" 
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <MapPin className="h-16 w-16 text-primary mb-4 opacity-70"/>
            <p className="text-xl font-semibold p-2 bg-background/80 rounded-md shadow text-foreground">
              Interactive Nurse Location Map
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md bg-background/80 p-2 rounded-md shadow">
                This area will display real-time nurse locations using Google Maps API integration.
                Requires API key setup and location data for nurses.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nurse Management</h1>
          <p className="text-muted-foreground">Manage nurse profiles, assignments, and tracking.</p>
        </div>
        <Button asChild>
          <Link href="/nurses/new">
            <UserPlus className="mr-2 h-4 w-4" /> Add New Nurse
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nurse Directory</CardTitle>
          <CardDescription>Browse and manage nurse profiles. Geolocation tracking would appear on the map below.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nurses.map(nurse => (
            <Card key={nurse.id} className="flex flex-col hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4 pb-3 bg-card p-4">
                <Image src={nurse.avatar} alt={nurse.name} width={72} height={72} className="rounded-full border-2 border-primary/50" data-ai-hint={nurse.hint || 'nurse medical'} />
                <div>
                  <CardTitle className="text-lg">{nurse.name}</CardTitle>
                  <CardDescription className="text-sm flex items-center">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground"/>{nurse.specialty}
                  </CardDescription>
                  <Badge 
                    variant={nurse.status === 'Available' ? 'default' : nurse.status === 'On Duty' ? 'secondary' : 'outline'}
                    className={`mt-1 text-xs ${nurse.status === 'Available' ? 'bg-green-500/20 text-green-700 border-green-500/30' : nurse.status === 'On Duty' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'}`}
                  >
                    {nurse.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm p-4">
                <p className="flex items-start text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                  {nurse.location}
                </p>
                <p className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                  {nurse.phone}
                </p>
                 <p className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                  {nurse.email}
                </p>
              </CardContent>
              <CardFooter className="pt-3 p-4 border-t">
                <Link href={`/nurses/${nurse.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nurse Geolocation Tracking</CardTitle>
          <CardDescription>Real-time location of active nurses.</CardDescription>
        </CardHeader>
        <CardContent className="h-96 bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
          <Image 
            src="https://placehold.co/1000x600.png" 
            alt="Map placeholder showing city streets and pins" 
            fill={true}
            className="object-cover opacity-30" 
            data-ai-hint="map city" 
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <MapPin className="h-16 w-16 text-primary mb-4 opacity-70"/>
            <p className="text-xl font-semibold p-2 bg-background/80 rounded-md shadow text-foreground">
              Interactive Nurse Location Map
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md bg-background/80 p-2 rounded-md shadow">
                This area will display real-time nurse locations using Google Maps API integration.
                Requires API key setup and location data for nurses.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
