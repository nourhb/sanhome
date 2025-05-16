
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit3, Mail, Phone, Shield } from "lucide-react";

// Mock user data, in a real app this would come from auth context/session
const currentUser = {
  name: "Nurse Joy",
  email: "nurse.joy@sanhome.com",
  role: "Nurse",
  avatarUrl: "https://placehold.co/100x100.png",
  phone: "+1 (555) 123-4567",
  memberSince: "2023-01-15",
};

export default function UserProfilePage() {
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
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="user medical" />
              <AvatarFallback className="text-2xl">{currentUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{currentUser.name}</CardTitle>
              <CardDescription className="text-md">{currentUser.role}</CardDescription>
              <p className="text-xs text-muted-foreground">Member since {currentUser.memberSince}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{currentUser.phone}</span>
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
                  <Input id="fullName" defaultValue={currentUser.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={currentUser.email} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue={currentUser.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" defaultValue={currentUser.role} disabled />
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
                    <a href="/settings#security"><Shield className="mr-2 h-4 w-4" /> Security Settings</a>
                </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
