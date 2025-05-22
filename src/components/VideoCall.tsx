
// src/components/VideoCall.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/lib/firebase'; // Use existing firebase instances
import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs, // Added getDocs
  updateDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { Button } from './ui/button';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  userId: string; // Current user's Firebase UID
  roomId: string;
  onHangUp: () => void;
}

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCall: React.FC<VideoCallProps> = ({ userId, roomId, onHangUp }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Initializing...");
  const { toast } = useToast();

  const roomDocRef = doc(db, 'videoCallRooms', roomId);
  const offerCandidatesCollectionRef = collection(db, 'videoCallRooms', roomId, 'offerCandidates');
  const answerCandidatesCollectionRef = collection(db, 'videoCallRooms', roomId, 'answerCandidates');

  const setupPeerConnection = useCallback(() => {
    if (pc.current) {
      console.log("[WebRTC] PeerConnection already exists. Closing old one.");
      pc.current.close();
    }
    console.log("[WebRTC] Creating new RTCPeerConnection");
    setCallStatus("Setting up peer connection...");
    pc.current = new RTCPeerConnection(servers);

    pc.current.onicecandidate = async (event) => {
      if (event.candidate && pc.current?.localDescription) {
        console.log("[WebRTC] Found ICE candidate:", event.candidate.toJSON());
        // Determine if this candidate is for an offer or an answer
        if (pc.current.localDescription.type === 'offer') {
          console.log("[WebRTC] Sending offer candidate");
          await addDoc(offerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
        } else if (pc.current.localDescription.type === 'answer') {
          console.log("[WebRTC] Sending answer candidate");
          await addDoc(answerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
        }
      }
    };

    pc.current.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.streams[0]);
      setCallStatus("Remote stream received.");
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      }
    };

    pc.current.onconnectionstatechange = () => {
      if (pc.current) {
        console.log(`[WebRTC] Connection state: ${pc.current.connectionState}`);
        setCallStatus(`Connection: ${pc.current.connectionState}`);
        if (pc.current.connectionState === 'connected') {
            setCallStatus("Connected");
        }
        if (pc.current.connectionState === 'disconnected' || pc.current.connectionState === 'failed' || pc.current.connectionState === 'closed') {
          // Optionally, call onHangUp or provide retry logic
        }
      }
    };
    pc.current.onsignalingstatechange = () => {
        if(pc.current) {
            console.log(`[WebRTC] Signaling state: ${pc.current.signalingState}`);
        }
    };
    pc.current.oniceconnectionstatechange = () => {
        if(pc.current) {
            console.log(`[WebRTC] ICE connection state: ${pc.current.iceConnectionState}`);
        }
    }

  }, [roomId, userId, offerCandidatesCollectionRef, answerCandidatesCollectionRef, roomDocRef]); // Added roomDocRef as it's used in onicecandidate

  const startLocalStream = useCallback(async () => {
    try {
      console.log("[WebRTC] Requesting local media stream...");
      setCallStatus("Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        if (pc.current && localStreamRef.current) {
           console.log("[WebRTC] Adding local track to PeerConnection:", track.kind);
           pc.current.addTrack(track, localStreamRef.current);
        }
      });
      setCallStatus("Local stream started.");
    } catch (error) {
      console.error("[WebRTC] Error accessing media devices.", error);
      setCallStatus("Error: Could not access camera/microphone.");
      toast({
        variant: "destructive",
        title: "Media Access Error",
        description: "Could not access your camera or microphone. Please check permissions.",
      });
    }
  }, [toast]);


  useEffect(() => {
    console.log(`[WebRTC] VideoCall component mounted for roomId: ${roomId}, userId: ${userId}`);
    setupPeerConnection(); // Call it once
    
    const initializeMediaAndSignaling = async () => {
      await startLocalStream(); // Wait for local stream before proceeding with signaling

      if (!pc.current || !localStreamRef.current) {
          console.warn("[WebRTC] PC or local stream not ready for signaling. Retrying...");
          setCallStatus("Waiting for media stream...");
          setTimeout(initializeMediaAndSignaling, 1000); 
          return;
      }
      
      setCallStatus("Checking room status...");
      const roomSnapshot = await getDoc(roomDocRef);
      if (!roomSnapshot.exists() || !roomSnapshot.data()?.offer) {
          console.log("[WebRTC] Room does not exist or no offer found. Creating offer...");
          setCallStatus("Creating offer...");
          try {
            const offerDescription = await pc.current.createOffer();
            await pc.current.setLocalDescription(offerDescription);
            await setDoc(roomDocRef, { 
              offer: { type: offerDescription.type, sdp: offerDescription.sdp },
              participants: [userId] 
            }, { merge: true });
            setCallStatus("Offer created. Waiting for peer...");
            console.log("[WebRTC] Offer created and room document initialized.");
          } catch (error) {
            console.error("[WebRTC] Error creating offer:", error);
            setCallStatus("Error creating offer.");
          }
      } else if (roomSnapshot.exists() && roomSnapshot.data()?.offer && !roomSnapshot.data()?.answer) {
          const currentParticipants = roomSnapshot.data()?.participants || [];
          if (!currentParticipants.includes(userId)) {
              await updateDoc(roomDocRef, { participants: [...currentParticipants, userId] });
              console.log("[WebRTC] Added self to participants list.");
          }
          // The onSnapshot listener for roomDocRef will handle setting remote desc and creating answer
          // No need to do it here to avoid race conditions
      } else if (roomSnapshot.exists() && roomSnapshot.data()?.offer && roomSnapshot.data()?.answer) {
          console.log("[WebRTC] Room already has offer and answer. Attempting to connect.");
          setCallStatus("Attempting to connect to existing call...");
          const currentParticipants = roomSnapshot.data()?.participants || [];
            if (!currentParticipants.includes(userId)) {
                await updateDoc(roomDocRef, { participants: [...currentParticipants, userId] });
            }
      }
    };

    initializeMediaAndSignaling();

    const roomUnsubscribe = onSnapshot(roomDocRef, async (snapshot) => {
      const data = snapshot.data();
      console.log("[WebRTC] Room snapshot data received:", data);

      if (!pc.current) {
        console.warn("[WebRTC] PeerConnection is null in room snapshot listener.");
        return;
      }
      
      if (data?.answer && pc.current.signalingState === 'have-local-offer') {
        console.log("[WebRTC] Received answer, attempting to set remote description.");
        setCallStatus("Received answer. Connecting...");
        const answerDescription = new RTCSessionDescription(data.answer);
        try {
          await pc.current.setRemoteDescription(answerDescription);
          console.log("[WebRTC] Successfully set remote description for answer.");
        } catch (error) {
            console.error("[WebRTC] Error setting remote description for answer:", error);
            setCallStatus("Error connecting (setRemoteDescription for answer failed).");
        }
      } 
      else if (data?.offer && pc.current.signalingState === 'stable' && !pc.current.remoteDescription) {
        console.log("[WebRTC] Found offer, attempting to set remote description and create answer.");
        setCallStatus("Received offer. Creating answer...");
        const offerDescription = new RTCSessionDescription(data.offer);
        try {
          await pc.current.setRemoteDescription(offerDescription);
          console.log("[WebRTC] Successfully set remote description for offer. Creating answer...");
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          await updateDoc(roomDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
          setCallStatus("Answer created and sent.");
          console.log("[WebRTC] Successfully created and sent answer.");
        } catch (error) {
          console.error("[WebRTC] Error processing offer / creating answer:", error);
          setCallStatus("Error connecting (processing offer failed).");
        }
      }
    });

    const offerCandidatesUnsubscribe = onSnapshot(
      query(offerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          if (pc.current && pc.current.remoteDescription) { 
            console.log("[WebRTC] Received offerer ICE candidate:", change.doc.data());
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.current.addIceCandidate(candidate);
              console.log("[WebRTC] Added offerer ICE candidate successfully.");
            } catch (error) {
              console.error("[WebRTC] Error adding received ICE candidate (from offerer):", error);
            }
          }
        }
      });
    });
    
    const answerCandidatesUnsubscribe = onSnapshot(
      query(answerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
           if (pc.current && pc.current.remoteDescription) {
            console.log("[WebRTC] Received answerer ICE candidate:", change.doc.data());
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.current.addIceCandidate(candidate);
              console.log("[WebRTC] Added answerer ICE candidate successfully.");
            } catch (error) {
              console.error("[WebRTC] Error adding received ICE candidate (from answerer):", error);
            }
          }
        }
      });
    });

    return () => {
      console.log("[WebRTC] Cleaning up VideoCall component for roomId:", roomId);
      roomUnsubscribe();
      offerCandidatesUnsubscribe();
      answerCandidatesUnsubscribe();
      if (pc.current) {
        pc.current.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        pc.current.close();
        pc.current = null;
        console.log("[WebRTC] PeerConnection closed.");
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        console.log("[WebRTC] Local stream stopped.");
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [roomId, userId, setupPeerConnection, startLocalStream, roomDocRef, offerCandidatesCollectionRef, answerCandidatesCollectionRef]);

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  const handleLocalHangUp = async () => {
    console.log("[WebRTC] User initiated hang up for room:", roomId);
    
    try {
        const roomSnapshot = await getDoc(roomDocRef);
        if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.data();
            const updates:any = {};
            if (roomData.offer) updates.offer = deleteField();
            if (roomData.answer) updates.answer = deleteField();
            
            const currentParticipants = roomData.participants || [];
            const updatedParticipants = currentParticipants.filter((pId: string) => pId !== userId);
            updates.participants = updatedParticipants;

            if (Object.keys(updates).length > 0) {
                 await updateDoc(roomDocRef, updates);
                 console.log("[WebRTC] Cleared offer/answer fields and updated participants in room document.");
            }

            // Delete user's ICE candidates more reliably
            const batch = writeBatch(db);
            const offerCandidatesQuery = query(offerCandidatesCollectionRef); // Fetch all, then filter if needed or delete all
            const answerCandidatesQuery = query(answerCandidatesCollectionRef); // Fetch all
            
            const offerCandidatesSnap = await getDocs(offerCandidatesQuery);
            offerCandidatesSnap.docs.forEach(doc => batch.delete(doc.ref)); // Deletes all candidates in subcollection
            
            const answerCandidatesSnap = await getDocs(answerCandidatesQuery);
            answerCandidatesSnap.docs.forEach(doc => batch.delete(doc.ref)); // Deletes all candidates in subcollection
            
            await batch.commit();
            console.log("[WebRTC] Cleaned up ICE candidates subcollections from Firestore.");
        }
    } catch (error) {
        console.error("[WebRTC] Error during hangup cleanup in Firestore:", error);
    }

    onHangUp(); 
  };

  const handleShareLink = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const roomLink = `${appUrl}/video-consult?roomId=${roomId}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      toast({
        title: "Link Copied!",
        description: "Video call room link copied to clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy room link: ', err);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy room link to clipboard.",
      });
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-md bg-card">
      <p className="text-sm text-center text-muted-foreground">Room ID: <span className="font-semibold text-primary">{roomId}</span> | Status: <span className="font-semibold">{callStatus.startsWith("Initializing") || callStatus.startsWith("Requesting media") || callStatus.startsWith("Waiting for media") || callStatus.startsWith("Checking room") || callStatus.startsWith("Creating offer") || callStatus.startsWith("Offer created") || callStatus.startsWith("Joining call") || callStatus.startsWith("Received offer") ? <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> : null}{callStatus}</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-center font-medium mb-2">Your Video</h3>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-auto rounded-md bg-muted aspect-video object-cover transform scale-x-[-1]" />
        </div>
        <div>
          <h3 className="text-center font-medium mb-2">Remote Video</h3>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-auto rounded-md bg-muted aspect-video object-cover transform scale-x-[-1]" />
        </div>
      </div>
      <div className="flex justify-center space-x-2 md:space-x-3 mt-4">
        <Button onClick={handleToggleMute} variant={isMuted ? "secondary" : "outline"} size="icon" aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button onClick={handleToggleVideo} variant={isVideoOff ? "secondary" : "outline"} size="icon" aria-label={isVideoOff ? "Turn Video On" : "Turn Video Off"}>
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>
        <Button onClick={handleShareLink} variant="outline" size="icon" aria-label="Share Room Link">
          <Share2 className="h-5 w-5" />
        </Button>
        <Button onClick={handleLocalHangUp} variant="destructive" size="icon" aria-label="Hang Up">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;
