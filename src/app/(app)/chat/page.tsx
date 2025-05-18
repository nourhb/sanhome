
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, Paperclip, Phone, Video, Loader2, AlertCircle, Users, Stethoscope } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchPatients, fetchNurses, type PatientListItem, type NurseListItem } from "@/app/actions";
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
    try {
      const [patientsResult, nursesResult] = await Promise.all([
        fetchPatients(),
        fetchNurses()
      ]);

      let combinedContacts: Contact[] = [];

      if (patientsResult.data) {
        const patientContactsMapped: Contact[] = patientsResult.data.map(p => ({
          id: p.id, // Patient's own ID from 'patients' collection
          name: p.name,
          email: p.email,
          role: 'patient',
          avatarUrl: p.avatarUrl || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start conversation",
          hint: p.hint || 'person face',
        }));
        combinedContacts = [...combinedContacts, ...patientContactsMapped];
      } else {
        console.warn("[ChatPage] Failed to load patients for chat:", patientsResult.error);
        setErrorContacts(prev => prev ? `${prev} Failed to load patients.` : "Failed to load patients.");
      }

      if (nursesResult.data) {
        const nurseContactsMapped: Contact[] = nursesResult.data.map(n => ({
          id: n.id, // Nurse's own ID from 'nurses' collection
          name: n.name,
          email: n.email,
          role: 'nurse',
          avatarUrl: n.avatar || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start conversation",
          hint: n.hint || 'nurse medical',
        }));
        combinedContacts = [...combinedContacts, ...nurseContactsMapped];
      } else {
         console.warn("[ChatPage] Failed to load nurses for chat:", nursesResult.error);
         setErrorContacts(prev => prev ? `${prev} Failed to load nurses.` : "Failed to load nurses.");
      }
      
      setContacts(combinedContacts);
      console.log("[ChatPage] Combined contacts from patients & nurses collections:", combinedContacts);

      if (combinedContacts.length > 0 && !selectedContact) {
        let defaultContact: Contact | undefined;
         if (userRole === 'patient') {
          defaultContact = combinedContacts.find(c => c.role === 'nurse');
        } else { // admin or nurse
          defaultContact = combinedContacts.find(c => c.role === 'patient');
          if (!defaultContact) {
            defaultContact = combinedContacts.find(c => c.role === 'nurse' && c.id !== currentUser?.uid);
          }
        }
        if (!defaultContact && combinedContacts.length > 0) {
           defaultContact = combinedContacts[0]?.id !== currentUser?.uid ? combinedContacts[0] : (combinedContacts[1] || null);
        }

        if (defaultContact) {
            // We don't auto-select from dropdowns, but user can click a contact from list
            // setSelectedContact(defaultContact); 
            // if (defaultContact.role === 'patient') setSelectedPatientIdFromDropdown(defaultContact.id);
            // if (defaultContact.role === 'nurse') setSelectedNurseIdFromDropdown(defaultContact.id);
        }
      }

    } catch (e: any) {
      setErrorContacts(`Failed to load contacts: ${e.message}`);
      console.error("[ChatPage] Exception loading contacts:", e);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [currentUser, userRole, selectedContact]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [authLoading, loadContacts]);

  // Effect to listen for messages when selectedContact (and thus currentChatId) changes
  useEffect(() => {
    if (!currentUser || !selectedContact) {
      setCurrentChatId(null);
      setMessages([]);
      return;
    }

    // IMPORTANT: For chat, the 'id' of a contact from 'patients' or 'nurses' collection
    // might not be their Firebase Auth UID. Chat should ideally be between Firebase Auth UIDs.
    // This simplified version assumes selectedContact.id IS the other user's UID for chat.
    // A more robust system would map patient/nurse IDs to their auth UIDs if they are also users.
    // For now, we use selectedContact.id as the other participant's ID.
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

    return () => unsubscribe(); // Cleanup listener on component unmount or when chatId changes

  }, [currentUser, selectedContact]);

  // Scroll to bottom of messages when new messages arrive
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
      // Add message to subcollection
      const messagesColRef = collection(db, "chats", currentChatId, "messages");
      await addDoc(messagesColRef, {
        senderId: currentUser.uid,
        receiverId: selectedContact.id, // Assuming selectedContact.id is the other user's UID
        text: messageText,
        timestamp: serverTimestamp(),
      });

      // Update/create parent chat document
      const chatDocRef = doc(db, "chats", currentChatId);
      await setDoc(chatDocRef, {
        participants: [currentUser.uid, selectedContact.id].sort(),
        lastActivity: serverTimestamp(),
        // You could also store lastMessageText snippet here for chat list previews
        // participantNames: { [currentUser.uid]: currentUser.displayName || currentUser.email, [selectedContact.id]: selectedContact.name }
      }, { merge: true }); // Merge true to create if not exists, or update lastActivity

    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally, re-add message to input or show error toast
      setNewMessage(messageText); // Put message back if sending failed
    } finally {
      setIsSending(false);
    }
  };


  const patientContactsForDropdown = useMemo(() => {
    console.log("[ChatPage useMemo patientContactsForDropdown] Full 'contacts' list:", contacts);
    const filtered = contacts.filter(contact => contact.role === 'patient' && contact.id !== currentUser?.uid);
    console.log("[ChatPage useMemo patientContactsForDropdown] Derived patientContactsForDropdown:", filtered);
    return filtered;
  }, [contacts, currentUser]);

  const nurseContactsForDropdown = useMemo(() => {
    console.log("[ChatPage useMemo nurseContactsForDropdown] Full 'contacts' list:", contacts);
    const filtered = contacts.filter(contact => contact.role === 'nurse' && contact.id !== currentUser?.uid);
    console.log("[ChatPage useMemo nurseContactsForDropdown] Derived nurseContactsForDropdown:", filtered);
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
            {(userRole === 'admin' || userRole === 'nurse') && (
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
              <p className="p-4 text-center text-muted-foreground">No patients or nurses available for chat.</p>
            )}
            {!isLoadingContacts && !errorContacts && contacts.filter(c => {
                if (!currentUser) return false;
                if (c.id === currentUser.uid) return false; 
                if (userRole === 'patient') return c.role === 'nurse';
                return true;
            }).map(contact => (
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
                  {/* Online status removed for simplicity, can be re-added with presence system */}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name} <span className="text-xs text-muted-foreground">({contact.role})</span></p>
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
                {/* Unread count removed for simplicity */}
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
                    Chatting as {currentUser.displayName || currentUser.email}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
            <p className="text-muted-foreground">Select a patient or nurse to start chatting.</p>
            {isLoadingContacts && <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>}
             {!isLoadingContacts && !errorContacts && contacts.length > 0 && !selectedContact && (
                <p className="text-sm text-muted-foreground mt-2">Use the dropdowns or click on a contact from the list.</p>
            )}
            {!isLoadingContacts && !errorContacts && contacts.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No patients or nurses found in the database to chat with.</p>
            )}
        </Card>
      )}
    </div>
  );
}
    

    