
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit3, Mail, Phone, Shield, User, CalendarDays, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { format, parseISO } from "date-fns";
import Link from "next/link";

export default function UserProfilePage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center p-8">
        <p className="text-xl text-muted-foreground">Please log in to view your profile.</p>
        <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
      </div>
    );
  }
  
  // Data from AuthContext.currentUser is basic. More detailed profile info (address, DOB, etc.)
  // would typically be fetched from the 'users' collection in Firestore based on currentUser.uid.
  // For this example, we'll use what's available in currentUser and add placeholders.
  const name = currentUser.displayName || currentUser.email?.split('@')[0] || "User";
  const email = currentUser.email || "N/A";
  const avatarFallback = name.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  // These would come from your 'users' Firestore document
  const phone = (currentUser as any).phoneNumber || "Not set"; 
  const memberSince = currentUser.metadata?.creationTime ? format(new Date(currentUser.metadata.creationTime), "PPP") : "N/A";
  const address = (currentUser as any).address || "Not set"; // Assuming you store address in users collection
  const dateOfBirth = (currentUser as any).dateOfBirth ? format(parseISO((currentUser as any).dateOfBirth.toDate().toISOString()), "PPP") : "Not set"; // Assuming dateOfBirth is a Timestamp


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your personal information.</p>
        </div>
        <Button variant="outline"><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentUser.photoURL || `https://placehold.co/100x100.png?text=${avatarFallback}`} alt={name} data-ai-hint="user medical" />
              <AvatarFallback className="text-2xl">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{name}</CardTitle>
              <CardDescription className="text-md">{userRole || "User"}</CardDescription>
              <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{address}</span>
              </div>
            </div>
          </div>
          
          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Account Details</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={email} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue={phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" defaultValue={userRole || "User"} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" defaultValue={dateOfBirth} disabled />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="addressDisplay">Address</Label>
                  <Input id="addressDisplay" defaultValue={address} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </form>
          </div>

          <Separator />
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Security</h3>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage your password and account security.</p>
                <Button variant="outline" asChild>
                    <Link href="/settings#security"><Shield className="mr-2 h-4 w-4" /> Security Settings</Link>
                </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
