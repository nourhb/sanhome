
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, LogIn, XCircle, AlertCircle, CalendarPlus, List, RefreshCw, User, BriefcaseMedical, Clock, PhoneOff } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { fetchVideoConsults, type VideoConsultListItem } from '@/app/actions';
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context'; // Use our AuthContext
import VideoCall from '@/components/VideoCall'; // Our new WebRTC component

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
};

export default function VideoConsultPage() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualRoomIdInput, setManualRoomIdInput] = useState<string>('');
  const { toast } = useToast();
  const [scheduledConsults, setScheduledConsults] = useState<VideoConsultListItem[]>([]);
  const [isLoadingConsults, setIsLoadingConsults] = useState(true);
  const { currentUser, loading: authLoading } = useAuth();

  const loadConsults = useCallback(async () => {
    setIsLoadingConsults(true);
    setErrorMsg(null);
    try {
      const result = await fetchVideoConsults();
      if (result.data) {
        setScheduledConsults(result.data);
      } else {
        setErrorMsg(result.error || "Failed to load scheduled consultations.");
        toast({ variant: 'destructive', title: 'Error loading consults', description: result.error || "Failed to load consultations." });
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An unexpected error occurred while loading consults.");
      toast({ variant: 'destructive', title: 'Error', description: e.message || "An unexpected error occurred." });
    } finally {
      setIsLoadingConsults(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) { // Only load if auth state is resolved
        loadConsults();
    }
  }, [loadConsults, authLoading]);

  const handleJoinCall = useCallback((roomIdToJoin: string) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to join a call.' });
      return;
    }
    if (!roomIdToJoin || roomIdToJoin.trim() === "") {
      toast({ variant: 'destructive', title: 'Input Error', description: 'Room ID cannot be empty.' });
      return;
    }
    console.log(`[VideoConsultPage] Attempting to join/start call in room: ${roomIdToJoin} by user: ${currentUser.uid}`);
    setCurrentRoomId(roomIdToJoin.trim());
    setErrorMsg(null);
  }, [toast, currentUser]);

  const handleLeaveCall = useCallback(() => {
    console.log("[VideoConsultPage] User requested to leave call. Current Room ID:", currentRoomId);
    // The VideoCall component's internal cleanup (pc.close(), track.stop()) should handle WebRTC resources.
    // This function mainly resets the UI state on this page.
    setCurrentRoomId(null);
    setManualRoomIdInput(''); // Clear manual input field as well
    // No need to manually interact with Whereby/Daily SDKs anymore
    toast({ title: "Call Ended", description: "You have left the video consultation." });
  }, [toast]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading user authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Video Consultation (WebRTC/Firebase)</h1>
          <p className="text-muted-foreground">Secure peer-to-peer video calls using WebRTC and Firebase for signaling.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/video-consult/schedule">
            <CalendarPlus className="mr-2 h-4 w-4" /> Schedule New Consult
          </Link>
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Video Call Interface</CardTitle>
          <CardDescription>
            {currentRoomId ? `In call for Room ID: ${currentRoomId}` : 'Enter a Room ID or select a scheduled call to join.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {currentUser && currentRoomId ? (
            <VideoCall userId={currentUser.uid} roomId={currentRoomId} onHangUp={handleLeaveCall} />
          ) : (
            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <Label htmlFor="room-id-input">Enter Room ID to Join/Start</Label>
                <Input
                  id="room-id-input"
                  type="text"
                  placeholder="e.g., sanhome-webrtc-xxxxxx"
                  value={manualRoomIdInput}
                  onChange={(e) => setManualRoomIdInput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => handleJoinCall(manualRoomIdInput)}
                disabled={!manualRoomIdInput.trim() || !currentUser || !!currentRoomId}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Join / Start Call
              </Button>
               {!currentUser && <p className="text-xs text-destructive text-center mt-1">Please log in to start or join a call.</p>}
            </div>
          )}
          
          {/* The hang-up button is now inside VideoCall.tsx */}
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
          <CardDescription>Upcoming and past video consultations (using WebRTC/Firebase).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConsults && (
            <div className="flex justify-center items-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading consultations...</p>
            </div>
          )}
          {!isLoadingConsults && errorMsg && !scheduledConsults.length && ( // Check if error and no consults
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
                        <CardTitle className="text-lg">Consultation (WebRTC)</CardTitle>
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
                      <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-primary/80" /> Scheduled: {format(parseISO(consult.createdAt), "PPp")}</p>
                      <p className="text-xs text-muted-foreground truncate" title={consult.roomId}>Room ID: {consult.roomId}</p>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <Button
                        onClick={() => handleJoinCall(consult.roomId)}
                        disabled={!!currentRoomId || consult.status !== 'scheduled' || !currentUser}
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
    </div>
  );
}

    