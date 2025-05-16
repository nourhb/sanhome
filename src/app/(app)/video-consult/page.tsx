import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, PhoneOff, Users, Mic, VideoOff } from "lucide-react";
import Image from "next/image";

export default function VideoConsultPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Video Consultation</h1>
        <p className="text-muted-foreground">Secure video calls with patients and other healthcare professionals.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Video Call Interface</CardTitle>
          <CardDescription>This section will host the secure video call functionality.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <Image src="https://placehold.co/800x450.png?text=Video+Feed+Area" alt="Video feed placeholder" layout="fill" objectFit="cover" data-ai-hint="video call interface" />
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                <Video className="h-24 w-24 text-background/50 mb-4" />
                <h3 className="text-xl font-semibold text-background mb-2">Video Call Feature Coming Soon</h3>
                <p className="text-background/80 text-center max-w-md">
                Secure, real-time video consultations (using WebRTC or a third-party API like Daily.co) will be integrated here.
                </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 p-4 border rounded-lg bg-background">
            <Button variant="secondary" size="lg"><Mic className="mr-2 h-5 w-5" /> Mute</Button>
            <Button variant="secondary" size="lg"><VideoOff className="mr-2 h-5 w-5" /> Stop Video</Button>
            <Button variant="outline" size="lg"><Users className="mr-2 h-5 w-5" /> Participants</Button>
            <Button variant="destructive" size="lg"><PhoneOff className="mr-2 h-5 w-5" /> End Call</Button>
          </div>

          <Card>
            <CardHeader>
                <CardTitle className="text-lg">Schedule a New Video Consultation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label htmlFor="patient-select" className="block text-sm font-medium text-muted-foreground mb-1">Select Patient</label>
                    <select id="patient-select" className="w-full p-2 border rounded-md bg-input">
                        <option>Alice Wonderland</option>
                        <option>Bob The Builder</option>
                    </select>
                </div>
                 <div className="flex-1">
                    <label htmlFor="datetime-select" className="block text-sm font-medium text-muted-foreground mb-1">Select Date & Time</label>
                    <Input type="datetime-local" id="datetime-select" className="bg-input" />
                </div>
                <Button><Video className="mr-2 h-4 w-4" /> Start/Schedule Call</Button>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
