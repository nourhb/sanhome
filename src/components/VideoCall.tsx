
// src/components/VideoCall.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { db, auth as firebaseAuth } from '@/lib/firebase'; // Use existing firebase instances
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
} from 'firebase/firestore';
import { Button } from './ui/button';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

interface VideoCallProps {
  userId: string; // Current user's Firebase UID
  roomId: string;
  onHangUp: () => void;
}

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // You might need TURN servers for more reliable connections across different networks
    // Example: { urls: 'turn:your-turn-server.com', username: 'user', credential: 'password' }
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
  const [callStatus, setCallStatus] = useState<string>("Connecting...");

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

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[WebRTC] Found ICE candidate:", event.candidate);
        // Determine if this is an offerer or answerer based on existence of offer
        getDoc(roomDocRef).then(roomSnapshot => {
          if (roomSnapshot.exists() && roomSnapshot.data()?.offer && !roomSnapshot.data()?.answer) {
            // This client is likely the offerer or has already sent offer
            addDoc(offerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
          } else {
            // This client is likely the answerer or has already sent answer
            addDoc(answerCandidatesCollectionRef, { ...event.candidate.toJSON(), senderId: userId });
          }
        });
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
          // onHangUp(); // Consider if this is the right place
        }
      }
    };
  }, [roomId, userId, roomDocRef, offerCandidatesCollectionRef, answerCandidatesCollectionRef]);

  const startLocalStream = useCallback(async () => {
    try {
      console.log("[WebRTC] Requesting local media stream...");
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
    } catch (error) {
      console.error("[WebRTC] Error accessing media devices.", error);
      setCallStatus("Error: Could not access camera/microphone.");
    }
  }, []);


  useEffect(() => {
    setupPeerConnection();
    startLocalStream();

    const roomUnsubscribe = onSnapshot(roomDocRef, async (snapshot) => {
      const data = snapshot.data();
      console.log("[WebRTC] Room snapshot data:", data);

      if (!pc.current) {
        console.warn("[WebRTC] PeerConnection is null in room snapshot listener.");
        return;
      }

      if (data?.offer && !pc.current.remoteDescription && !snapshot.metadata.hasPendingWrites) {
        // If there's an offer and we haven't set it (and it's not our own pending offer)
        console.log("[WebRTC] Found offer, attempting to set remote description and create answer.");
        const offerDescription = new RTCSessionDescription(data.offer);
        try {
          await pc.current.setRemoteDescription(offerDescription);
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          await updateDoc(roomDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
          setCallStatus("Answer created and sent.");
        } catch (error) {
          console.error("[WebRTC] Error processing offer / creating answer:", error);
          setCallStatus("Error processing offer.");
        }
      } else if (data?.answer && !pc.current.remoteDescription && !snapshot.metadata.hasPendingWrites) {
        // This case is likely for the offerer receiving the answer.
        // The check should be `pc.current.currentRemoteDescription` if it's an offerer.
        // Or more simply, if an answer exists and this client hasn't set it yet.
        if(pc.current.signalingState === 'have-local-offer' || pc.current.signalingState === 'stable' && pc.current.localDescription?.type === 'offer'){
            console.log("[WebRTC] Received answer, attempting to set remote description.");
            const answerDescription = new RTCSessionDescription(data.answer);
            try {
              await pc.current.setRemoteDescription(answerDescription);
              setCallStatus("Connected.");
            } catch (error) {
                console.error("[WebRTC] Error setting remote description for answer:", error);
                setCallStatus("Error setting remote description.");
            }
        }
      }
    });

    const offerCandidatesUnsubscribe = onSnapshot(
      query(offerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          console.log("[WebRTC] Received offerer ICE candidate:", change.doc.data());
          const candidate = new RTCIceCandidate(change.doc.data());
          try {
            await pc.current?.addIceCandidate(candidate);
          } catch (error) {
            console.error("[WebRTC] Error adding received ICE candidate (offerer):", error);
          }
        }
      });
    });
    
    const answerCandidatesUnsubscribe = onSnapshot(
      query(answerCandidatesCollectionRef, where("senderId", "!=", userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          console.log("[WebRTC] Received answerer ICE candidate:", change.doc.data());
          const candidate = new RTCIceCandidate(change.doc.data());
          try {
            await pc.current?.addIceCandidate(candidate);
          } catch (error) {
            console.error("[WebRTC] Error adding received ICE candidate (answerer):", error);
          }
        }
      });
    });


    // Initial call logic: try to create offer if room doesn't exist or has no offer
    const initializeCall = async () => {
        if (!pc.current || !localStreamRef.current) {
            console.warn("[WebRTC] PC or local stream not ready for initializeCall");
            // Retry or wait for stream
            setTimeout(initializeCall, 500);
            return;
        }
        
        const roomSnapshot = await getDoc(roomDocRef);
        if (!roomSnapshot.exists() || !roomSnapshot.data()?.offer) {
            console.log("[WebRTC] Room does not exist or no offer found. Creating offer...");
            try {
              const offerDescription = await pc.current.createOffer();
              await pc.current.setLocalDescription(offerDescription);
              await setDoc(roomDocRef, { 
                offer: { type: offerDescription.type, sdp: offerDescription.sdp },
                participants: [userId] // Add initial participant
              }, { merge: true });
              setCallStatus("Offer created. Waiting for peer...");
            } catch (error) {
              console.error("[WebRTC] Error creating offer:", error);
              setCallStatus("Error creating offer.");
            }
        } else if (roomSnapshot.exists() && roomSnapshot.data()?.offer && !roomSnapshot.data()?.answer) {
            // Offer exists, this client is joining
            console.log("[WebRTC] Offer exists. This client is joining. Attempting to update participants.");
            const currentParticipants = roomSnapshot.data()?.participants || [];
            if (!currentParticipants.includes(userId)) {
                await updateDoc(roomDocRef, { participants: [...currentParticipants, userId] });
            }
        }
    };
    initializeCall();

    return () => {
      console.log("[WebRTC] Cleaning up VideoCall component...");
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
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      // Optionally, clean up Firestore document if this user is the last one
      // This is complex and depends on your app's logic for room lifecycle
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
    console.log("[WebRTC] User initiated hang up.");
    // Signal hang up to other peer if necessary (e.g., by updating room doc)
    // For simplicity, this example just calls the passed onHangUp
    onHangUp();

    // Optional: Clean up the room document or specific fields if this user is leaving
    // This part is tricky for 2-party calls as you don't know if the other user is still there
    // or if this was the "host"
    try {
        const roomSnapshot = await getDoc(roomDocRef);
        if (roomSnapshot.exists()) {
            // Example: Clear offer/answer to allow re-joining or new calls if room ID is reused.
            // Or, more robustly, delete the room if this is the last participant.
            // For now, let's clear offer/answer if this was the offerer
            // This is simplified logic.
            if (roomSnapshot.data()?.offer?.sdp === pc.current?.localDescription?.sdp) {
                // This client was the offerer
                // await updateDoc(roomDocRef, { offer: deleteField(), answer: deleteField() });
            }
            // Clean up candidates related to this user
            const offerCandidatesQuery = query(offerCandidatesCollectionRef, where("senderId", "==", userId));
            const answerCandidatesQuery = query(answerCandidatesCollectionRef, where("senderId", "==", userId));
            
            const batch = writeBatch(db);
            (await getDoc(offerCandidatesQuery)).docs.forEach(doc => batch.delete(doc.ref));
            (await getDoc(answerCandidatesQuery)).docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log("[WebRTC] Cleaned up user's ICE candidates from Firestore.");
        }
    } catch (error) {
        console.error("[WebRTC] Error during hangup cleanup in Firestore:", error);
    }

  };


  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-md bg-card">
      <p className="text-sm text-center text-muted-foreground">Room ID: <span className="font-semibold text-primary">{roomId}</span> | Status: <span className="font-semibold">{callStatus}</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-center font-medium mb-2">Your Video</h3>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-auto rounded-md bg-muted aspect-video object-cover" />
        </div>
        <div>
          <h3 className="text-center font-medium mb-2">Remote Video</h3>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-auto rounded-md bg-muted aspect-video object-cover" />
        </div>
      </div>
      <div className="flex justify-center space-x-3 mt-4">
        <Button onClick={handleToggleMute} variant={isMuted ? "secondary" : "outline"} size="icon" aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button onClick={handleToggleVideo} variant={isVideoOff ? "secondary" : "outline"} size="icon" aria-label={isVideoOff ? "Turn Video On" : "Turn Video Off"}>
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>
        <Button onClick={handleLocalHangUp} variant="destructive" size="icon" aria-label="Hang Up">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;

    