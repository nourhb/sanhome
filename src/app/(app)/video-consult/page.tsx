
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, LogIn, LogOut, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CALL_OPTIONS = {
  showLeaveButton: true,
  showFullscreenButton: true,
  showParticipantsBar: true,
  showLocalVideo: true,
  showPipButton: true,
};

export default function VideoConsultPage() {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [callState, setCallState] = useState<'idle' | 'joining' | 'joined' | 'leaving' | 'left' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const callFrameRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleJoinCall = useCallback(async () => {
    if (!roomUrl) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid Daily.co room URL.' });
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
        borderRadius: '0.375rem', // Match with rounded-lg
      },
      ...CALL_OPTIONS,
    });

    setCallObject(newCallObject);

    newCallObject
      .on('loaded', () => {
        console.log('Daily call frame loaded');
      })
      .on('joining-meeting', () => {
        console.log('Joining meeting...');
        setCallState('joining');
      })
      .on('joined-meeting', () => {
        console.log('Joined meeting');
        setCallState('joined');
        toast({ title: 'Call Joined', description: 'Successfully joined the video consultation.' });
      })
      .on('left-meeting', () => {
        console.log('Left meeting');
        setCallState('left');
        newCallObject.destroy();
        setCallObject(null);
        toast({ title: 'Call Left', description: 'You have left the video consultation.' });
      })
      .on('error', (event) => {
        console.error('Daily call error:', event);
        setErrorMsg(event?.errorMsg || 'An unknown error occurred with the video call.');
        setCallState('error');
        newCallObject.destroy();
        setCallObject(null);
        toast({ variant: 'destructive', title: 'Call Error', description: event?.errorMsg || 'Could not connect to the video call.' });
      });

    try {
      await newCallObject.join({ url: roomUrl });
    } catch (e: any) {
      console.error('Error joining call:', e);
      setErrorMsg(e?.message || 'Failed to join the call.');
      setCallState('error');
      newCallObject.destroy();
      setCallObject(null);
    }
  }, [roomUrl, toast]);

  const handleLeaveCall = useCallback(async () => {
    if (callObject) {
      setCallState('leaving');
      await callObject.leave();
    }
  }, [callObject]);

  // Cleanup call object on component unmount
  useEffect(() => {
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [callObject]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Video Consultation</h1>
        <p className="text-muted-foreground">Secure video calls with patients and other healthcare professionals.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Video className="mr-2 h-5 w-5 text-primary" /> Video Call</CardTitle>
          <CardDescription>
            {callState === 'idle' || callState === 'left' || callState === 'error' ? 'Enter a Daily.co room URL to start or join a consultation.' : 'Video call in progress.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {callState === 'error' && errorMsg && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Video Call Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {(callState === 'idle' || callState === 'left' || callState === 'error') && (
            <div className="space-y-3 max-w-md">
              <div>
                <Label htmlFor="room-url">Daily.co Room URL</Label>
                <Input 
                  id="room-url" 
                  type="url" 
                  placeholder="https://your-domain.daily.co/room-name" 
                  value={roomUrl}
                  onChange={(e) => setRoomUrl(e.target.value)}
                  disabled={callState === 'joining' || callState === 'joined'}
                />
              </div>
              <Button 
                onClick={handleJoinCall} 
                disabled={!roomUrl || callState === 'joining' || callState === 'joined'}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {callState === 'joining' ? 'Joining...' : 'Join Call'}
              </Button>
            </div>
          )}

          <div 
            ref={callFrameRef} 
            className={`aspect-video bg-muted rounded-lg shadow-inner ${callState === 'joined' ? 'block' : 'hidden'}`}
            style={{ height: callState === 'joined' ? 'auto' : '0px', minHeight: callState === 'joined' ? '450px' : '0px' }} // Ensure space for the iframe
          >
            {/* Daily.co iframe will be created here by the SDK */}
          </div>
          
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

      <Card className="shadow-lg bg-blue-500/10 border-blue-500/30">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-blue-700 dark:text-blue-400">Integration Notes</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-600 dark:text-blue-300">
                <li>This page uses Daily.co Prebuilt UI.</li>
                <li>You need to enter a valid Daily.co room URL to join a call. Create rooms via your Daily.co dashboard or API.</li>
                <li>For dynamic room creation or more custom call UI, further integration with Daily.co's SDK and APIs is required.</li>
                <li>PipeCat integration for AI voice features would be an additional, complex step involving its own SDK and potentially backend services.</li>
            </ul>
        </CardContent>
    </Card>
    </div>
  );
}
