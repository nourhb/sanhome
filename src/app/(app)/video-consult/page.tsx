

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, PhoneOff, Users, Mic, VideoOff, CalendarPlus, Info } from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label"; // Import Label

const mockPatientsForVideo = [
  { id: 'p1', name: 'Alice Wonderland' },
  { id: 'p2', name: 'Bob The Builder' },
  { id: 'p3', name: 'Charlie Chaplin' },
];


export default function VideoConsultPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Video Consultation</h1>
        <p className="text-muted-foreground">Secure video calls with patients and other healthcare professionals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Active Video Call</CardTitle>
            <CardDescription>Interface for ongoing video consultations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner">
              <Image 
                  src="https://placehold.co/800x450.png" 
                  alt="Video feed placeholder showing two participants" 
                  fill={true} 
                  className="object-cover opacity-50"
                  data-ai-hint="video call interface" 
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center">
                  <Video className="h-20 w-20 text-background/60 mb-3" />
                  <h3 className="text-xl font-semibold text-background mb-1">Video Call Paused</h3>
                  <p className="text-background/80 text-sm max-w-xs">
                    Your video call will appear here. Waiting for participants to join or video to start.
                  </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center flex-wrap gap-2 p-4 border rounded-lg bg-background shadow-sm">
              <Button variant="secondary" size="lg" className="flex-1 sm:flex-none"><Mic className="mr-2 h-5 w-5" /> Mute</Button>
              <Button variant="secondary" size="lg" className="flex-1 sm:flex-none"><VideoOff className="mr-2 h-5 w-5" /> Stop Video</Button>
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none"><Users className="mr-2 h-5 w-5" /> Participants (2)</Button>
              <Button variant="destructive" size="lg" className="flex-1 sm:flex-none"><PhoneOff className="mr-2 h-5 w-5" /> End Call</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><CalendarPlus className="mr-2 h-5 w-5 text-primary"/>Schedule New Consult</CardTitle>
                    <CardDescription>Book a future video call.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="patient-select">Select Patient</Label>
                        <Select>
                            <SelectTrigger id="patient-select">
                                <SelectValue placeholder="Choose a patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {mockPatientsForVideo.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="datetime-select">Select Date & Time</Label>
                        <Input type="datetime-local" id="datetime-select" className="bg-input" />
                    </div>
                    <Button className="w-full"><Video className="mr-2 h-4 w-4" /> Schedule Call</Button>
                </CardContent>
            </Card>
             <Card className="shadow-lg bg-blue-500/10 border-blue-500/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center text-blue-700 dark:text-blue-400"><Info className="mr-2 h-5 w-5"/>Integration Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                        Actual video functionality (e.g., via WebRTC or a service like Daily.co/Twilio Video) would be integrated here. 
                        This requires backend setup and API key management for secure and reliable video conferencing.
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
