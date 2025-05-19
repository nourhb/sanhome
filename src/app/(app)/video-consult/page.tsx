
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, LogIn, LogOut, AlertCircle, CalendarPlus, List, RefreshCw, User, BriefcaseMedical, ClockIcon, XCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { fetchVideoConsults, type VideoConsultListItem } from '@/app/actions';
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

type CallStatus = 'scheduled' | 'completed' | 'cancelled';

const getStatusBadgeVariant = (status: CallStatus) => {
  switch (status) {
    case 'scheduled': return 'default';
    case 'completed': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};
const getStatusBadgeClassNames = (status: CallStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'completed':
        return 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/30 hover:bg-destructive/20';
      default:
        return '';
    }
}


export default function VideoConsultPage() {
  const [currentRoomUrl, setCurrentRoomUrl] = useState<string | null>(null);
  const [manualRoomUrl, setManualRoomUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const [scheduledConsults, setScheduledConsults] = useState<VideoConsultListItem[]>([]);
  const [isLoadingConsults, setIsLoadingConsults] = useState(true);

  const loadConsults = useCallback(async () => {
    setIsLoadingConsults(true);
    setErrorMsg(null);
    try {
      const result = await fetchVideoConsults();
      if (result.data) {
        setScheduledConsults(result.data);
      } else {
        setErrorMsg(result.error || "Failed to load scheduled consultations.");
        toast({ variant: 'destructive', title: 'Error', description: result.error || "Failed to load scheduled consultations." });
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An unexpected error occurred while fetching consults.");
      toast({ variant: 'destructive', title: 'Error', description: e.message || "An unexpected error occurred." });
    } finally {
      setIsLoadingConsults(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConsults();
  }, [loadConsults]);

  const handleJoinCall = useCallback((urlToJoin?: string) => {
    const targetRoomUrl = urlToJoin || manualRoomUrl;
    console.log("[VideoConsultPage] Attempting to join Whereby room. URL:", targetRoomUrl);
    if (!targetRoomUrl) {
      toast({ variant: 'destructive', title: 'Error', description: 'Room URL is missing.' });
      return;
    }
    
    if (!targetRoomUrl.includes('.whereby.com/')) {
        toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please enter a valid Whereby room URL (e.g., https://your-subdomain.whereby.com/room-name).' });
        return;
    }
    setCurrentRoomUrl(targetRoomUrl);
    toast({ title: 'Joining Call', description: `Attempting to join room. Ensure embedding is allowed for this domain in your Whereby settings.`});
  }, [manualRoomUrl, toast]);

  const handleLeaveCall = useCallback(() => {
    setCurrentRoomUrl(null);
    toast({ title: 'Call Closed', description: 'You have closed the video consultation window.' });
  }, [toast]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Video Consultation (Whereby)</h1>
          <p className="text-muted-foreground">Secure video calls with patients and other healthcare professionals using Whereby.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/video-consult/schedule">
            <CalendarPlus className="mr-2 h-4 w-4" /> Schedule New Consult
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Video Call Window</CardTitle>
          <CardDescription>
            {currentRoomUrl ? 'Video call in progress via Whereby.' : 'Enter a Whereby room URL or select a scheduled call to join.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && !isLoadingConsults && ( 
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {!currentRoomUrl && (
            <div className="space-y-3 max-w-md">
              <div>
                <Label htmlFor="room-url">Whereby Room URL (Manual Join)</Label>
                <Input
                  id="room-url"
                  type="url"
                  placeholder="https://your-subdomain.whereby.com/room-name"
                  value={manualRoomUrl}
                  onChange={(e) => setManualRoomUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={() => handleJoinCall()}
                disabled={!manualRoomUrl}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Join Manual URL
              </Button>
            </div>
          )}

          {currentRoomUrl && (
            <>
              <div className="relative aspect-video bg-muted rounded-lg shadow-inner overflow-hidden border">
                <iframe
                  src={currentRoomUrl}
                  allow="camera; microphone; fullscreen; speaker; display-capture"
                  className="absolute top-0 left-0 w-full h-full border-0"
                  title="Whereby Video Call"
                ></iframe>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Attempting to embed: <a href={currentRoomUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">{currentRoomUrl}</a>
                <br />
                If you see a "refused to connect" error above, please check your Whereby account settings for the subdomain used in the URL.
                Ensure embedding is explicitly allowed for your current application domain (e.g., <code>localhost</code> or your deployed app's domain).
              </div>
            </>
          )}

          {currentRoomUrl && (
            <Button
              onClick={handleLeaveCall}
              variant="destructive"
              className="w-full mt-4 max-w-md"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Close Call Window
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" /> Scheduled Consultations</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadConsults} disabled={isLoadingConsults}>
              <RefreshCw className={`h-4 w-4 ${isLoadingConsults ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>Upcoming and past video calls. Your Whereby subdomain should be set in environment variables. Check Whereby account settings for embedding permissions if calls fail to connect.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConsults && (
            <div className="flex justify-center items-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading consultations...</p>
            </div>
          )}
          {!isLoadingConsults && errorMsg && !scheduledConsults.length && (
             <Alert variant="default" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not load consults</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          {!isLoadingConsults && !errorMsg && scheduledConsults.length === 0 && (
            <p className="text-muted-foreground text-center p-4">No video consultations scheduled yet.</p>
          )}
          {!isLoadingConsults && scheduledConsults.length > 0 && (
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-4">
                {scheduledConsults.map(consult => (
                  <Card key={consult.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Consultation</CardTitle>
                        <Badge
                          variant={getStatusBadgeVariant(consult.status as CallStatus)}
                          className={getStatusBadgeClassNames(consult.status as CallStatus)}
                        >
                          {consult.status}
                        </Badge>
                      </div>
                       <CardDescription className="text-sm text-muted-foreground">
                         {format(parseISO(consult.consultationTime), "PPP 'at' p")}
                       </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="flex items-center"><User className="mr-2 h-4 w-4 text-primary/80" /> Patient: {consult.patientName}</p>
                      <p className="flex items-center"><BriefcaseMedical className="mr-2 h-4 w-4 text-primary/80" /> Nurse: {consult.nurseName}</p>
                      <p className="flex items-center"><ClockIcon className="mr-2 h-4 w-4 text-primary/80" /> Scheduled: {format(parseISO(consult.createdAt), "PPp")}</p>
                      <p className="text-xs text-muted-foreground truncate" title={consult.roomUrl}>Room: {consult.roomUrl}</p>
                    </CardContent>
                    <CardFooter className="pt-3">
                       <Button 
                          onClick={() => handleJoinCall(consult.roomUrl)} 
                          disabled={!!currentRoomUrl || consult.status !== 'scheduled'}
                          className="w-full"
                        >
                         <LogIn className="mr-2 h-4 w-4" />
                         Join Scheduled Call
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg bg-blue-500/10 border-blue-500/30">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-blue-700 dark:text-blue-400">Whereby Integration Notes & Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-blue-600 dark:text-blue-300">
                <li>This page uses Whereby for video calls via an iframe embed.</li>
                <li>Your Whereby subdomain is set via <code>NEXT_PUBLIC_WHEREBY_SUBDOMAIN</code> in your <code>.env</code> file (currently configured as 'sanhome').</li>
                <li>The Whereby API key (<code>WHEREBY_API_KEY</code> in <code>.env</code>) is used to create new meeting rooms when you schedule a consult.</li>
                <li><strong>IMPORTANT "Refused to connect" Error:</strong> If the iframe shows "sanhome.whereby.com refused to connect" or a similar error:
                    <ul className="list-decimal pl-6 mt-1">
                        <li>Go to your Whereby account dashboard for the <code>sanhome</code> subdomain.</li>
                        <li>Find the settings for **embedding** or **allowed domains**.</li>
                        <li>You **MUST** add your application's current domain to the list of allowed embed origins.
                            For local development, this is typically <code>http://localhost:9002</code> (or your specific port). For deployed apps, it's your production domain.
                        </li>
                        <li>If the domain is not whitelisted by Whereby, the iframe embed will be blocked by Whereby's security policies.</li>
                    </ul>
                </li>
                <li>Ensure your Whereby plan supports API room creation and embedding.</li>
            </ul>
        </CardContent>
    </Card>
    </div>
  );
}

 