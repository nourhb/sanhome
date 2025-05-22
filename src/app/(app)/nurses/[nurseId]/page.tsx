"use client";
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteDoc } from 'firebase/firestore';
import type { NurseListItem } from '@/app/actions'; // Import NurseListItem type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Mail, Briefcase, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

interface NurseProfilePageProps {
  params: {
    nurseId: string;
  };
}

// Define Nurse type similar to NurseListItem but without the 'createdAt' field if it's not needed on the profile page
// Or just use NurseListItem if createdAt is part of the profile display
type Nurse = NurseListItem; // Using NurseListItem for simplicity

const NurseProfilePage: React.FC<NurseProfilePageProps> = ({ params }) => {
  const router = useRouter();
  const { nurseId } = params;
  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNurse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nurseDocRef = doc(db, "nurses", nurseId);
        const nurseDocSnap = await getDoc(nurseDocRef);

        if (nurseDocSnap.exists()) {
          const data = nurseDocSnap.data();
          setNurse({
            id: nurseDocSnap.id,
            name: data.name || "N/A",
            specialty: data.specialty || "N/A",
            location: data.location || "N/A",
            phone: data.phone || "N/A",
            email: data.email || "N/A",
            avatar: data.avatar || `https://placehold.co/100x100.png?text=N`,
            status: data.status || "Available",
            hint: data.hint || 'nurse medical',
            createdAt: data.createdAt, // Include createdAt if needed for display or consistency
          } as Nurse);
        } else {
          setError(`Nurse with ID "${nurseId}" not found.`);
          setNurse(null);
        }
      } catch (err: any) {
        console.error("Error fetching nurse:", err);
        setError(err.message || "An error occurred while fetching nurse data.");
        setNurse(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (nurseId) {
      fetchNurse();
    } else {
      setError("No nurse ID provided.");
      setIsLoading(false);
      setNurse(null);
    }

  }, [nurseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading nurse profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Nurse Profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!nurse) {
    return (
       <div className="container mx-auto p-4">
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Profile Not Available</AlertTitle>
           <AlertDescription>No nurse data could be loaded. The profile might not exist or there was an issue fetching it.</AlertDescription>
         </Alert>
       </div>
     );
   }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Nurse Profile</h1>
        <Link href={`/nurses/${nurseId}/edit`}>
          <Button variant="outline" size="sm">
            Edit Profile
          </Button>
        </Link>
        <p className="text-muted-foreground">Details for {nurse.name}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4 pb-3">
           <Image src={nurse.avatar} alt={nurse.name} width={80} height={80} className="rounded-full border-2 border-primary/50" data-ai-hint={nurse.hint || 'nurse medical'} />
          <div>
            <CardTitle className="text-xl">{nurse.name}</CardTitle>
            <CardDescription className="text-sm flex items-center">
              <Briefcase className="h-4 w-4 mr-1.5 text-muted-foreground"/>{nurse.specialty}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
           {/* Add other nurse details as needed */}
        </CardContent>
      </Card>
      {/* You can add sections for schedule, appointments, etc. here */}
    </div>
  );
};

export default NurseProfilePage;