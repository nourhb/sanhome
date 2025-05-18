
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, Paperclip, Phone, Video, Loader2, AlertCircle, Users, Stethoscope } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchPatients, fetchNurses, fetchUsersForAdmin, fetchVideoConsults, fetchPatientById, type PatientListItem, type NurseListItem, type UserForAdminList, type VideoConsultListItem } from "@/app/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  Timestamp,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";


interface Contact {
  id: string; // This will be the Firebase UID for users, or patient/nurse ID
  name: string;
  email: string | null;
  role: 'patient' | 'nurse' | 'admin' | 'user'; // Broader role definition
  avatarUrl: string;
  lastMessage?: string;
  unread?: number;
  online?: boolean;
  hint?: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date | null; // Store as Date on client for easier formatting
}

const generateChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [errorContacts, setErrorContacts] = useState<string | null>(null);
  const { currentUser, userRole, loading: authLoading } = useAuth();

  const [selectedPatientIdFromDropdown, setSelectedPatientIdFromDropdown] = useState<string>("");
  const [selectedNurseIdFromDropdown, setSelectedNurseIdFromDropdown] = useState<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);


  const loadContacts = useCallback(async () => {
    if (!currentUser) {
      setErrorContacts("Please log in to use chat.");
      setIsLoadingContacts(false);
      setContacts([]);
      return;
    }
    setIsLoadingContacts(true);
    setErrorContacts(null);
    let combinedContacts: Contact[] = [];

    try {
      if (userRole === 'patient') {
        console.log("[ChatPage PATIENT] Loading contacts for PATIENT. Current User UID:", currentUser.uid);
        const [patientDetailsResult, videoConsultsResult, allNursesResult, allUsersResult] = await Promise.all([
          fetchPatientById(currentUser.uid), 
          fetchVideoConsults(),
          fetchNurses(),
          fetchUsersForAdmin()
        ]);

        const patient = patientDetailsResult.data;
        const videoConsults = videoConsultsResult.data || [];
        const allNurses = allNursesResult.data || [];
        const allUsers = allUsersResult.data || [];

        console.log("[ChatPage PATIENT] Fetched patient details:", patient);
        console.log("[ChatPage PATIENT] Fetched video consults (filtered for current patient):", videoConsults.filter(c => c.patientId === currentUser.uid));
        console.log("[ChatPage PATIENT] Fetched ALL nurses (before filtering):", allNurses.map(n => ({id: n.id, name: n.name})));
        
        const allowedNurseIds = new Set<string>();

        // 1. Add primary nurse
        if (patient && patient.primaryNurse) {
          const primaryNurse = allNurses.find(n => n.name === patient.primaryNurse);
          if (primaryNurse) {
            allowedNurseIds.add(primaryNurse.id);
            console.log(`[ChatPage PATIENT] Primary nurse "${primaryNurse.name}" (ID: ${primaryNurse.id}) added to allowedNurseIds.`);
          } else {
            console.warn(`[ChatPage PATIENT] Primary nurse named "${patient.primaryNurse}" not found in allNurses list. Searched for name: "${patient.primaryNurse}". Available nurse names: ${allNurses.map(n => n.name).join(', ')}`);
          }
        }

        // 2. Add nurses from video consults
        videoConsults.forEach(consult => {
          if (consult.patientId === currentUser.uid && consult.nurseId) {
            console.log(`[ChatPage PATIENT] Processing consult: Patient ${consult.patientName} with Nurse ${consult.nurseName} (Nurse ID: ${consult.nurseId}). Adding nurseId: ${consult.nurseId} to allowedNurseIds.`);
            allowedNurseIds.add(consult.nurseId);
          }
        });
        console.log("[ChatPage PATIENT] Allowed nurse IDs (after primary & consults):", Array.from(allowedNurseIds));
        
        const nurseContacts = allNurses
          .filter(n => allowedNurseIds.has(n.id))
          .map(n => ({
            id: n.id, name: n.name, email: n.email, role: 'nurse' as const,
            avatarUrl: n.avatar || `https://placehold.co/40x40.png`,
            lastMessage: "Click to chat", hint: n.hint || 'nurse medical'
          }));
        console.log("[ChatPage PATIENT] Final nurseContacts list for patient (filtered by allowed IDs):", nurseContacts);

        const adminContacts = allUsers
          .filter(u => u.role === 'admin' && u.id !== currentUser.uid)
          .map(u => ({
            id: u.id, name: u.name, email: u.email, role: 'admin' as const,
            avatarUrl: (u as any).avatarUrl || `https://placehold.co/40x40.png`,
            lastMessage: "Click to chat", hint: (u as any).hint || 'admin support'
          }));
        
        combinedContacts = [...nurseContacts, ...adminContacts];
        console.log("[ChatPage PATIENT] Combined contacts for patient (allowed nurses + admins):", combinedContacts);

      } else if (userRole === 'nurse') {
        console.log("[ChatPage NURSE] Loading contacts for NURSE:", currentUser.uid, currentUser.displayName);
        const [allNursesResult, allPatientsResult, videoConsultsResult, allUsersResult] = await Promise.all([
          fetchNurses(),
          fetchPatients(),
          fetchVideoConsults(),
          fetchUsersForAdmin()
        ]);

        const allNurses = allNursesResult.data || [];
        const allPatients = allPatientsResult.data || [];
        const videoConsults = videoConsultsResult.data || [];
        const allUsers = allUsersResult.data || [];

        const tempContactsMap = new Map<string, Contact>();

        // 1. Add other nurses
        allNurses.forEach(n => {
          if (n.id !== currentUser.uid) {
            tempContactsMap.set(n.id, {
              id: n.id, name: n.name, email: n.email, role: 'nurse' as const,
              avatarUrl: n.avatar || `https://placehold.co/40x40.png`,
              lastMessage: "Click to chat", hint: n.hint || 'nurse medical'
            });
          }
        });

        // 2. Add admins
        allUsers.forEach(u => {
          if (u.role === 'admin' && u.id !== currentUser.uid) {
            tempContactsMap.set(u.id, {
              id: u.id, name: u.name, email: u.email, role: 'admin' as const,
              avatarUrl: (u as any).avatarUrl || `https://placehold.co/40x40.png`,
              lastMessage: "Click to chat", hint: (u as any).hint || 'admin support'
            });
          }
        });
        
        // 3. Add patients assigned to this nurse
        allPatients.forEach(p => {
          if (p.primaryNurse === currentUser.displayName) { 
             tempContactsMap.set(p.id, {
              id: p.id, name: p.name, email: p.email, role: 'patient' as const,
              avatarUrl: p.avatarUrl || `https://placehold.co/40x40.png`,
              lastMessage: "Click to chat", hint: p.hint || 'person face'
            });
          }
        });

        // 4. Add patients with appointments with this nurse
        const patientIdsFromAppointments = new Set<string>();
        videoConsults.forEach(consult => {
          if (consult.nurseId === currentUser.uid && consult.patientId) {
            patientIdsFromAppointments.add(consult.patientId);
          }
        });

        allPatients.forEach(p => {
          if (patientIdsFromAppointments.has(p.id)) {
             tempContactsMap.set(p.id, { 
              id: p.id, name: p.name, email: p.email, role: 'patient' as const,
              avatarUrl: p.avatarUrl || `https://placehold.co/40x40.png`,
              lastMessage: "Click to chat", hint: p.hint || 'person face'
            });
          }
        });
        combinedContacts = Array.from(tempContactsMap.values());
        console.log("[ChatPage NURSE] Final combined contacts for nurse:", combinedContacts);

      } else if (userRole === 'admin') { 
        console.log("[ChatPage ADMIN] Loading contacts for ADMIN:", currentUser.uid);
         const [patientsResult, nursesResult, allUsersResult] = await Promise.all([
          fetchPatients(),
          fetchNurses(),
          fetchUsersForAdmin()
        ]);

        const patientContactsMapped: Contact[] = (patientsResult.data || []).map(p => ({
          id: p.id, name: p.name, email: p.email, role: 'patient' as const,
          avatarUrl: p.avatarUrl || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start conversation", hint: p.hint || 'person face',
        }));

        const nurseContactsMapped: Contact[] = (nursesResult.data || []).filter(n => n.id !== currentUser.uid).map(n => ({
          id: n.id, name: n.name, email: n.email, role: 'nurse' as const,
          avatarUrl: n.avatar || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start conversation", hint: n.hint || 'nurse medical',
        }));
        
        const adminContacts = (allUsersResult.data || [])
          .filter(u => u.role === 'admin' && u.id !== currentUser.uid)
          .map(u => ({
            id: u.id, name: u.name, email: u.email, role: 'admin' as const,
            avatarUrl: (u as any).avatarUrl || `https://placehold.co/40x40.png`,
            lastMessage: "Click to chat", hint: (u as any).hint || 'admin support'
          }));

        combinedContacts = [...patientContactsMapped, ...nurseContactsMapped, ...adminContacts];
        console.log("[ChatPage ADMIN] Final combined contacts for admin:", combinedContacts);
      }
      
      setContacts(combinedContacts);

      if (combinedContacts.length > 0 && !selectedContact) {
        let defaultContact: Contact | undefined;
         if (userRole === 'patient') {
          defaultContact = combinedContacts.find(c => c.role === 'nurse');
        } else if (userRole === 'nurse') {
          defaultContact = combinedContacts.find(c => c.role === 'patient');
          if (!defaultContact) defaultContact = combinedContacts.find(c => c.role === 'admin');
          if (!defaultContact) defaultContact = combinedContacts.find(c => c.role === 'nurse'); 
        } else { 
          defaultContact = combinedContacts.find(c => c.role === 'patient');
          if (!defaultContact) defaultContact = combinedContacts.find(c => c.role === 'nurse');
          if (!defaultContact) defaultContact = combinedContacts.find(c => c.role === 'admin');
        }
        if (defaultContact) {
          //setSelectedContact(defaultContact); // Commented out to avoid auto-selection if dropdowns are preferred
        }
      }

    } catch (e: any) {
      setErrorContacts(`Failed to load contacts: ${e.message}`);
      console.error("[ChatPage] Exception loading contacts:", e);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [currentUser, userRole, selectedContact]); // Removed selectedContact from deps to avoid re-fetching on selection

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [authLoading, loadContacts, currentUser, userRole]); // Added currentUser and userRole to ensure loadContacts has the latest

  // Effect to listen for messages when selectedContact (and thus currentChatId) changes
  useEffect(() => {
    if (!currentUser || !selectedContact) {
      setCurrentChatId(null);
      setMessages([]);
      return;
    }
    const chatId = generateChatId(currentUser.uid, selectedContact.id);
    setCurrentChatId(chatId);

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
        });
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("[ChatPage] Error fetching messages:", error);
      setErrorContacts("Failed to load messages for this chat.");
    });

    return () => unsubscribe();

  }, [currentUser, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async () => {
    if (!currentUser || !selectedContact || !currentChatId || newMessage.trim() === "") {
      return;
    }
    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const messagesColRef = collection(db, "chats", currentChatId, "messages");
      await addDoc(messagesColRef, {
        senderId: currentUser.uid,
        receiverId: selectedContact.id, 
        text: messageText,
        timestamp: serverTimestamp(),
      });

      const chatDocRef = doc(db, "chats", currentChatId);
      await setDoc(chatDocRef, {
        participants: [currentUser.uid, selectedContact.id].sort(),
        lastActivity: serverTimestamp(),
        participantNames: { 
          [currentUser.uid]: currentUser.displayName || currentUser.email, 
          [selectedContact.id]: selectedContact.name 
        },
        participantRoles: {
          [currentUser.uid]: userRole,
          [selectedContact.id]: selectedContact.role
        }
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText); 
    } finally {
      setIsSending(false);
    }
  };

  const patientContactsForDropdown = useMemo(() => {
    console.log("[ChatPage useMemo patientContactsForDropdown] Full 'contacts' list before filtering for patients:", contacts.map(c=> ({id: c.id, name: c.name, role: c.role})));
    const filtered = contacts.filter(contact => contact.role === 'patient' && contact.id !== currentUser?.uid);
    console.log("[ChatPage useMemo patientContactsForDropdown] Derived patientContactsForDropdown:", filtered.map(c=> ({id: c.id, name: c.name, role: c.role})));
    return filtered;
  }, [contacts, currentUser]);

  const nurseContactsForDropdown = useMemo(() => {
    console.log("[ChatPage useMemo nurseContactsForDropdown] Full 'contacts' list before filtering for nurses:", contacts.map(c=> ({id: c.id, name: c.name, role: c.role})));
    const filtered = contacts.filter(contact => contact.role === 'nurse' && contact.id !== currentUser?.uid);
    console.log("[ChatPage useMemo nurseContactsForDropdown] Derived nurseContactsForDropdown:", filtered.map(c=> ({id: c.id, name: c.name, role: c.role})));
    return filtered;
  }, [contacts, currentUser]);

  const handleSelectPatientFromDropdown = (patientId: string) => {
    const contact = contacts.find(c => c.id === patientId && c.role === 'patient');
    if (contact) {
      setSelectedContact(contact);
      setSelectedPatientIdFromDropdown(patientId);
      setSelectedNurseIdFromDropdown(""); 
    }
  };

  const handleSelectNurseFromDropdown = (nurseId: string) => {
    const contact = contacts.find(c => c.id === nurseId && c.role === 'nurse');
    if (contact) {
      setSelectedContact(contact);
      setSelectedNurseIdFromDropdown(nurseId);
      setSelectedPatientIdFromDropdown(""); 
    }
  };
  
  const handleSelectContactFromList = (contact: Contact) => {
    setSelectedContact(contact);
    if (contact.role === 'patient') {
      setSelectedPatientIdFromDropdown(contact.id);
      setSelectedNurseIdFromDropdown("");
    } else if (contact.role === 'nurse') {
      setSelectedNurseIdFromDropdown(contact.id);
      setSelectedPatientIdFromDropdown("");
    } else { // Admin or other roles
        setSelectedPatientIdFromDropdown("");
        setSelectedNurseIdFromDropdown("");
    }
  };


  if (authLoading) {
    return (
     <div className="flex items-center justify-center h-[calc(100vh-100px)]">
       <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
       <p>Loading authentication...</p>
     </div>
    );
 }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4">
      <Card className="w-full md:w-1/3 lg:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            Conversations
            <Button variant="ghost" size="icon" aria-label="New Conversation"><MessageSquarePlus className="h-5 w-5" /></Button>
          </CardTitle>
           <p className="text-xs text-muted-foreground pt-1">Select a user from the list or dropdowns to start chatting.</p>
           <div className="space-y-2 pt-2">
            { (userRole === 'admin' || userRole === 'nurse') && (
              <Select value={selectedPatientIdFromDropdown} onValueChange={handleSelectPatientFromDropdown} disabled={isLoadingContacts}>
                <SelectTrigger className="w-full">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a Patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientContactsForDropdown.length > 0 ? patientContactsForDropdown.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (Patient)</SelectItem>
                  )) : <div className="p-2 text-sm text-muted-foreground">No patients found.</div>}
                </SelectContent>
              </Select>
            )}
             { (userRole === 'admin' || userRole === 'nurse' || userRole === 'patient') && (
                <Select value={selectedNurseIdFromDropdown} onValueChange={handleSelectNurseFromDropdown} disabled={isLoadingContacts}>
                <SelectTrigger className="w-full">
                    <Stethoscope className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select a Nurse..." />
                </SelectTrigger>
                <SelectContent>
                    {nurseContactsForDropdown.length > 0 ? nurseContactsForDropdown.map(n => (
                    <SelectItem key={n.id} value={n.id}>{n.name} (Nurse)</SelectItem>
                    )) : <div className="p-2 text-sm text-muted-foreground">No nurses found.</div>}
                </SelectContent>
                </Select>
             )}
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow">
          <CardContent className="p-0">
            {isLoadingContacts && (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" /> Loading contacts...
              </div>
            )}
            {!isLoadingContacts && errorContacts && (
              <Alert variant="destructive" className="m-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Contacts</AlertTitle>
                <AlertDescription>{errorContacts}</AlertDescription>
              </Alert>
            )}
            {!isLoadingContacts && !errorContacts && contacts.length === 0 && (
              <p className="p-4 text-center text-muted-foreground">No contacts available for chat based on your role and connections.</p>
            )}
            {!isLoadingContacts && !errorContacts && contacts.map(contact => ( 
              <div
                key={contact.id}
                className={`flex items-center gap-3 p-3 border-b hover:bg-accent/50 cursor-pointer ${selectedContact?.id === contact.id ? 'bg-accent' : ''}`}
                onClick={() => handleSelectContactFromList(contact)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectContactFromList(contact)}
              >
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint={contact.hint} />
                  <AvatarFallback>{contact.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  {/* Add online indicator if needed */}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name} <span className="text-xs text-muted-foreground">({contact.role})</span></p>
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
                {/* Add unread count badge if needed */}
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>

      {selectedContact && currentUser ? (
        <Card className="flex-1 shadow-lg flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={selectedContact.avatarUrl} alt={selectedContact.name} data-ai-hint={selectedContact.hint} />
                  <AvatarFallback>{selectedContact.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{selectedContact.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Chatting as {currentUser.displayName || currentUser.email} ({userRole})
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  {/* Add call/video call buttons if functionality is implemented */}
                  <Button variant="ghost" size="icon" aria-label="Call"><Phone className="h-5 w-5"/></Button>
                  <Button variant="ghost" size="icon" aria-label="Video Call"><Video className="h-5 w-5"/></Button>
              </div>
            </div>
          </CardHeader>
          <ScrollArea className="flex-grow p-4 space-y-4 bg-muted/30">
              {messages.map(msg => (
                   <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.uid ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow-sm ${msg.senderId === currentUser.uid ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      {msg.timestamp && (
                        <p className={`text-xs mt-1 ${msg.senderId === currentUser.uid ? 'text-muted-foreground text-right self-end' : 'text-muted-foreground text-left self-start'}`}>
                           {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                        </p>
                      )}
                  </div>
              ))}
              <div ref={messagesEndRef} />
          </ScrollArea>
          <CardFooter className="p-4 border-t bg-background">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2 w-full">
              <Button variant="ghost" size="icon" aria-label="Attach file" type="button"><Paperclip className="h-5 w-5" /></Button>
              <Input 
                placeholder="Type your message..." 
                className="flex-1" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSending || !currentChatId}
              />
              <Button aria-label="Send message" type="submit" disabled={isSending || !currentChatId || newMessage.trim() === ""}>
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Card className="flex-1 shadow-lg flex flex-col items-center justify-center bg-muted/30">
            <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a contact to start chatting.</p>
            {isLoadingContacts && <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>}
             {!isLoadingContacts && !errorContacts && contacts.length > 0 && !selectedContact && (
                <p className="text-sm text-muted-foreground mt-2">Use the dropdowns or click on a contact from the list.</p>
            )}
            {!isLoadingContacts && !errorContacts && contacts.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No contacts found based on your role and connections.</p>
            )}
        </Card>
      )}
    </div>
  );
}
    

    
