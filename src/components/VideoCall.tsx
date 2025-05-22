
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
  updateDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  writeBatch,
  deleteField, // Import deleteField
} from 'firebase/firestore';
import { Button } from './ui/button';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Share2, Loader2 } from 'lucide-react'; // Added Share2
import { useToast } from '@/hooks/use-toast'; // Added useToast

interface VideoCallProps {
  userId: string; // Current user's Firebase UID
  roomId: string;
  onHangUp: () => void;
}

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // You might need TURN servers for more reliable connections across different networks
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
  const { toast } = useToast(); // Initialize useToast

  const roomDocRef = doc(db, 'videoCallRooms', roomId);
  const offerCandidatesCollectionRef = collection(db, 'videoCallRooms', roomId, 'offerCandidates');
  const answerCandidatesCollectionRef = collection(db, 'videoCallRooms', roomId, 'answerCandidates');

  const setupPeerConnection = useCallback(() => {
    if (pc.current) {
        console.log("[WebRTC] PeerConnection already exists. Closing old one.");
        pc.current.close();
    }
    console.log("[WebRTC] Creating new RTCPeerConnection");
    pc.current = new RTCPeerConnection(servers);

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log("[WebRTC] Found ICE candidate:", event.candidate.toJSON());
        const roomSnapshot = await getDoc(roomDocRef);
        if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.data();
            // If this client created the offer, it sends offerCandidates.
            // If it created the answer, it sends answerCandidates.
            if (roomData.offer?.sdp === pc.current?.localDescription?.sdp || (roomData.offer && !roomData.answer)) {
                console.log("[WebRTC] Sending offer candidate");
                await addDoc(offerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
            } else if (roomData.answer?.sdp === pc.current?.localDescription?.sdp) {
                 console.log("[WebRTC] Sending answer candidate");
                await addDoc(answerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
            }
        }
      }
    };

    pc.current.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.streams[0]);
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
        if (pc.current.connectionState === 'disconnected' || pc.current.connectionState === 'failed' || pc.current.connectionState === 'closed') {
          // Consider if onHangUp should be called here, or if it causes issues
        }
      }
    };
  }, [roomId, userId, roomDocRef, offerCandidatesCollectionRef, answerCandidatesCollectionRef]);

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
    setupPeerConnection();
    startLocalStream();

    const roomUnsubscribe = onSnapshot(roomDocRef, async (snapshot) => {
      const data = snapshot.data();
      console.log("[WebRTC] Room snapshot data received:", data);

      if (!pc.current) {
        console.warn("[WebRTC] PeerConnection is null in room snapshot listener. This shouldn't happen.");
        return;
      }
      
      // If this client is the caller (has created an offer) and an answer appears
      if (data?.answer && pc.current.signalingState === 'have-local-offer') {
        console.log("[WebRTC] Received answer, attempting to set remote description.");
        const answerDescription = new RTCSessionDescription(data.answer);
        try {
          await pc.current.setRemoteDescription(answerDescription);
          setCallStatus("Connected.");
          console.log("[WebRTC] Successfully set remote description for answer.");
        } catch (error) {
            console.error("[WebRTC] Error setting remote description for answer:", error);
            setCallStatus("Error connecting (setRemoteDescription for answer failed).");
        }
      } 
      // If this client is the callee (joining a room with an existing offer) and hasn't processed it yet
      else if (data?.offer && pc.current.signalingState === 'stable' && !pc.current.remoteDescription) {
        console.log("[WebRTC] Found offer, attempting to set remote description and create answer.");
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

    // Listen for ICE candidates from the offerer if I am the answerer
    const offerCandidatesUnsubscribe = onSnapshot(
      query(offerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          if (pc.current && pc.current.remoteDescription) { // Only add candidates after remote description is set
            console.log("[WebRTC] Received offerer ICE candidate:", change.doc.data());
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.current.addIceCandidate(candidate);
              console.log("[WebRTC] Added offerer ICE candidate successfully.");
            } catch (error) {
              console.error("[WebRTC] Error adding received ICE candidate (from offerer):", error);
            }
          } else {
            console.log("[WebRTC] Received offerer ICE candidate but remoteDescription not set yet. Candidate ignored for now.", change.doc.data());
          }
        }
      });
    });
    
    // Listen for ICE candidates from the answerer if I am the offerer
    const answerCandidatesUnsubscribe = onSnapshot(
      query(answerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
           if (pc.current && pc.current.remoteDescription) { // Only add candidates after remote description is set
            console.log("[WebRTC] Received answerer ICE candidate:", change.doc.data());
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.current.addIceCandidate(candidate);
              console.log("[WebRTC] Added answerer ICE candidate successfully.");
            } catch (error) {
              console.error("[WebRTC] Error adding received ICE candidate (from answerer):", error);
            }
          } else {
             console.log("[WebRTC] Received answerer ICE candidate but remoteDescription not set yet. Candidate ignored for now.", change.doc.data());
          }
        }
      });
    });

    const initializeCall = async () => {
        if (!pc.current || !localStreamRef.current) {
            console.warn("[WebRTC] PC or local stream not ready for initializeCall. Retrying...");
            setCallStatus("Waiting for media stream...");
            setTimeout(initializeCall, 1000); // Retry after a short delay
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
              // Create room document with offer and participants array
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
            // Offer exists, this client is joining and needs to create an answer
            console.log("[WebRTC] Offer exists, I am the callee. Processing offer...");
            setCallStatus("Joining call...");
            const currentParticipants = roomSnapshot.data()?.participants || [];
            if (!currentParticipants.includes(userId)) {
                await updateDoc(roomDocRef, { participants: [...currentParticipants, userId] });
                console.log("[WebRTC] Added self to participants list.");
            }
            // The onSnapshot listener for roomDocRef will handle setting remote desc and creating answer
        } else if (roomSnapshot.exists() && roomSnapshot.data()?.offer && roomSnapshot.data()?.answer) {
            console.log("[WebRTC] Room already has offer and answer. Potentially joining an active call or rejoining.");
            setCallStatus("Attempting to connect to existing call...");
            // If current client is not in participants, add them
            const currentParticipants = roomSnapshot.data()?.participants || [];
            if (!currentParticipants.includes(userId)) {
                await updateDoc(roomDocRef, { participants: [...currentParticipants, userId] });
            }
        }
    };
    // Delay initializeCall slightly to give local stream time to fully initialize and attach tracks
    const initTimeout = setTimeout(initializeCall, 500);


    return () => {
      console.log("[WebRTC] Cleaning up VideoCall component for roomId:", roomId);
      clearTimeout(initTimeout);
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
      // Consider more advanced room cleanup logic here if needed
    };
  }, [roomId, userId, setupPeerConnection, startLocalStream, roomDocRef, offerCandidatesCollectionRef, answerCandidatesCollectionRef]); // Dependencies

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
    
    // Signal hang up to other peer if necessary (e.g., by updating room doc)
    // This is a simplified cleanup. More robust cleanup might involve checking if this user was the offerer.
    // For now, we'll try to remove offer/answer to allow room reuse by others.
    try {
        const roomSnapshot = await getDoc(roomDocRef);
        if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.data();
            const updates:any = {};
            if (roomData.offer) updates.offer = deleteField();
            if (roomData.answer) updates.answer = deleteField();
            // Optionally remove this user from participants array
            const currentParticipants = roomData.participants || [];
            const updatedParticipants = currentParticipants.filter((pId: string) => pId !== userId);
            updates.participants = updatedParticipants;

            if (Object.keys(updates).length > 0) {
                 await updateDoc(roomDocRef, updates);
                 console.log("[WebRTC] Cleared offer/answer fields and updated participants in room document.");
            }

            // Delete user's ICE candidates
            const batch = writeBatch(db);
            const offerCandidatesQuery = query(offerCandidatesCollectionRef, where("senderId", "==", userId));
            const answerCandidatesQuery = query(answerCandidatesCollectionRef, where("senderId", "==", userId));
            
            const offerCandidatesSnap = await getDoc(offerCandidatesQuery); // Changed to getDoc for query
            offerCandidatesSnap.docs.forEach(doc => batch.delete(doc.ref));
            
            const answerCandidatesSnap = await getDoc(answerCandidatesQuery); // Changed to getDoc for query
            answerCandidatesSnap.docs.forEach(doc => batch.delete(doc.ref));
            
            await batch.commit();
            console.log("[WebRTC] Cleaned up user's ICE candidates from Firestore.");
        }
    } catch (error) {
        console.error("[WebRTC] Error during hangup cleanup in Firestore:", error);
    }

    onHangUp(); // Call the parent's hangup handler
  };

  const handleShareLink = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback for local dev
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
      <p className="text-sm text-center text-muted-foreground">Room ID: <span className="font-semibold text-primary">{roomId}</span> | Status: <span className="font-semibold">{callStatus === "Initializing..." || callStatus === "Requesting media access..." || callStatus === "Waiting for media stream..." || callStatus === "Checking room status..." || callStatus === "Creating offer..." || callStatus === "Offer created. Waiting for peer..." || callStatus === "Joining call..." || callStatus === "Answer created and sent." ? <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> : null}{callStatus}</span></p>
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
