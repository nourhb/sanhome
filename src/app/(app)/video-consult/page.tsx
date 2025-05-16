
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, LogIn, LogOut, AlertCircle, CalendarPlus, List, RefreshCw, User, BriefcaseMedical, ClockIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { fetchVideoConsults, type VideoConsultListItem } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const CALL_OPTIONS = {
  showLeaveButton: true,
  showFullscreenButton: true,
  showParticipantsBar: true,
  showLocalVideo: true,
  showPipButton: true,
};

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
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [roomUrlToJoin, setRoomUrlToJoin] = useState<string>('');
  const [callState, setCallState] = useState<'idle' | 'joining' | 'joined' | 'leaving' | 'left' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const callFrameRef = useRef<HTMLDivElement>(null);
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

  const handleJoinCall = useCallback(async (urlToJoin?: string) => {
    const targetRoomUrl = urlToJoin || roomUrlToJoin;
    if (!targetRoomUrl) {
      toast({ variant: 'destructive', title: 'Error', description: 'Room URL is missing.' });
      return;
    }

    if (!DailyIframe.supportedBrowser().supported) {
      setErrorMsg("Your browser is not supported for Daily.co video calls.");
      setCallState('error');
      return;
    }

    setCallState('joining');
    setErrorMsg(null);

    const newCallObject = DailyIframe.createFrame(callFrameRef.current!, {
      iframeStyle: {
        position: 'relative',
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '0.375rem',
      },
      ...CALL_OPTIONS,
    });

    setCallObject(newCallObject);

    newCallObject
      .on('loaded', () => console.log('Daily call frame loaded'))
      .on('joining-meeting', () => { setCallState('joining'); console.log('Joining meeting...'); })
      .on('joined-meeting', () => { setCallState('joined'); toast({ title: 'Call Joined', description: 'Successfully joined the video consultation.' }); })
      .on('left-meeting', () => {
        setCallState('left');
        newCallObject.destroy();
        setCallObject(null);
        toast({ title: 'Call Left', description: 'You have left the video consultation.' });
      })
      .on('error', (event) => {
        console.error('Daily call error:', event);
        setErrorMsg(event?.errorMsg || 'An unknown error occurred.');
        setCallState('error');
        newCallObject.destroy();
        setCallObject(null);
        toast({ variant: 'destructive', title: 'Call Error', description: event?.errorMsg || 'Could not connect.' });
      });

    try {
      await newCallObject.join({ url: targetRoomUrl });
    } catch (e: any) {
      console.error('Error joining call:', e);
      setErrorMsg(e?.message || 'Failed to join the call.');
      setCallState('error');
      newCallObject.destroy();
      setCallObject(null);
    }
  }, [roomUrlToJoin, toast]);

  const handleLeaveCall = useCallback(async () => {
    if (callObject) {
      setCallState('leaving');
      await callObject.leave();
    }
  }, [callObject]);

  useEffect(() => {
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [callObject]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Video Consultation</h1>
          <p className="text-muted-foreground">Secure video calls with patients and other healthcare professionals.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/video-consult/schedule">
            <CalendarPlus className="mr-2 h-4 w-4" /> Schedule New Consult
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Live Video Call</CardTitle>
          <CardDescription>
            {callState === 'idle' || callState === 'left' || callState === 'error' ? 'Enter a Daily.co room URL or select a scheduled call to join.' : 'Video call in progress.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && callState === 'error' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Video Call Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {(callState === 'idle' || callState === 'left' || callState === 'error') && (
            <div className="space-y-3 max-w-md">
              <div>
                <Label htmlFor="room-url">Daily.co Room URL (Manual Join)</Label>
                <Input
                  id="room-url"
                  type="url"
                  placeholder="https://your-domain.daily.co/room-name"
                  value={roomUrlToJoin}
                  onChange={(e) => setRoomUrlToJoin(e.target.value)}
                  disabled={callState === 'joining' || callState === 'joined'}
                />
              </div>
              <Button
                onClick={() => handleJoinCall()}
                disabled={!roomUrlToJoin || callState === 'joining' || callState === 'joined'}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {callState === 'joining' ? 'Joining...' : 'Join Manual URL'}
              </Button>
            </div>
          )}

          <div
            ref={callFrameRef}
            className={`aspect-video bg-muted rounded-lg shadow-inner ${callState === 'joined' ? 'block' : 'hidden'}`}
            style={{ height: callState === 'joined' ? 'auto' : '0px', minHeight: callState === 'joined' ? '450px' : '0px' }}
          />

          {callState === 'joined' && (
            <Button
              onClick={handleLeaveCall}
              variant="destructive"
              className="w-full mt-4 max-w-md"
              disabled={callState === 'leaving'}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {callState === 'leaving' ? 'Leaving...' : 'Leave Call'}
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
          <CardDescription>Upcoming and past video calls.</CardDescription>
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
                    </CardContent>
                    <CardFooter className="pt-3">
                       <Button 
                          onClick={() => handleJoinCall(consult.dailyRoomUrl)} 
                          disabled={callState === 'joining' || callState === 'joined' || consult.status !== 'scheduled'}
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
            <CardTitle className="text-lg flex items-center text-blue-700 dark:text-blue-400">Integration Notes</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-600 dark:text-blue-300">
                <li>This page uses Daily.co Prebuilt UI for joining calls.</li>
                <li>Scheduled consults generate a unique Daily.co room URL. Ensure your `NEXT_PUBLIC_DAILY_CO_BASE_URL` in `.env` is correct.</li>
                <li>Room URLs for scheduled calls are stored in Firestore.</li>
            </ul>
        </CardContent>
    </Card>
    </div>
  );
}
