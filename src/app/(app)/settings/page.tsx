
"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Bell, Shield, Palette, Sun, Moon, Laptop } from "lucide-react"; // Changed ShieldLock to Shield
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { setTheme, theme, resolvedTheme, themes } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [fontSize, setFontSize] = React.useState(100);

  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    // Avoid hydration mismatch by not rendering theme-dependent UI on the server.
    // Or render a skeleton/loader.
    return null;
  }
  
  const handleFontSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10);
    setFontSize(newSize);
    // In a real app, you would also apply this font size to the document body
    // document.documentElement.style.fontSize = `${newSize}%`;
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2 inline-block" />Profile</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2 inline-block" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2 inline-block" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="w-4 h-4 mr-2 inline-block" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Nurse Joy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="nurse.joy@sanhome.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="email-notifications" defaultChecked />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sms-notifications" />
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="inapp-notifications" defaultChecked />
                <Label htmlFor="inapp-notifications">In-App Notifications</Label>
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" id="security"> {/* Added id="security" for the anchor link */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                </div>
              <Button>Change Password</Button>
              <div className="border-t pt-4 mt-4">
                <h3 className="text-md font-semibold mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">Add an extra layer of security to your account.</p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-2 block font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground mb-3">Select your preferred color scheme.</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"} 
                    onClick={() => setTheme("light")}
                    className={cn("flex-1 justify-start gap-2", theme === "light" && "ring-2 ring-ring")}
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "default" : "outline"} 
                    onClick={() => setTheme("dark")}
                    className={cn("flex-1 justify-start gap-2", theme === "dark" && "ring-2 ring-ring")}
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                  <Button 
                    variant={theme === "system" ? "default" : "outline"} 
                    onClick={() => setTheme("system")}
                    className={cn("flex-1 justify-start gap-2", theme === "system" && "ring-2 ring-ring")}
                  >
                    <Laptop className="h-4 w-4" /> System
                  </Button>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    Current theme: <span className="font-semibold capitalize">{resolvedTheme}</span>
                 </p>
              </div>
               <div>
                <Label htmlFor="fontSize" className="mb-2 block font-medium">Font Size</Label>
                 <p className="text-sm text-muted-foreground mb-3">Adjust the application font size.</p>
                <Input 
                    type="range" 
                    id="fontSize" 
                    min="80" max="120" 
                    value={fontSize} 
                    onChange={handleFontSizeChange}
                    step="5" 
                 />
                <p className="text-xs text-muted-foreground mt-1 text-center">Current: {fontSize}%</p>
              </div>
              {/* This button doesn't do anything for theme/font size currently, 
                  as theme is instant and font size would need more setup */}
              {/* <Button>Save Appearance Settings</Button> */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
