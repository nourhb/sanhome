
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, Paperclip, Phone, Video, Loader2, AlertCircle, Users, Stethoscope } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchPatients, fetchNurses, type PatientListItem, type NurseListItem } from "@/app/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Re-add Input for message typing

// Mock messages - real chat requires a backend and real-time service
const mockMessages = [
    { id: 'm1', senderId: 'user1', text: 'Hi Nurse Joy, I have a quick question about my medication.', time: '10:30 AM', self: false },
    { id: 'm2', senderId: 'currentUser', text: 'Hello Alice, I\'m here to help. What\'s your question?', time: '10:31 AM', self: true },
    { id: 'm3', senderId: 'user1', text: 'Is it okay to take it with food?', time: '10:32 AM', self: false },
    { id: 'm4', senderId: 'currentUser', text: 'Yes, for this particular medication, it\'s best to take it with a meal to avoid stomach upset. Did you have any other concerns?', time: '10:33 AM', self: true },
    { id: 'm5', senderId: 'user1', text: 'No, that was all. Thank you so much!', time: '10:34 AM', self: false },
];

interface Contact {
  id: string;
  name: string;
  email: string | null;
  role: 'patient' | 'nurse'; // Explicitly patient or nurse for this context
  avatarUrl: string;
  lastMessage?: string; // Mock
  unread?: number; // Mock
  online?: boolean; // Mock
  hint?: string;
}


export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userRole, loading: authLoading } = useAuth();

  const [selectedPatientIdFromDropdown, setSelectedPatientIdFromDropdown] = useState<string>("");
  const [selectedNurseIdFromDropdown, setSelectedNurseIdFromDropdown] = useState<string>("");

  const loadContacts = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to use chat.");
      setIsLoading(false);
      setContacts([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [patientsResult, nursesResult] = await Promise.all([
        fetchPatients(),
        fetchNurses()
      ]);

      let combinedContacts: Contact[] = [];

      if (patientsResult.data) {
        const patientContactsMapped: Contact[] = patientsResult.data.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: 'patient',
          avatarUrl: p.avatarUrl || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start a conversation...", // Mock
          unread: Math.floor(Math.random() * 3), // Mock
          online: Math.random() > 0.5, // Mock
          hint: p.hint || 'person face',
        }));
        combinedContacts = [...combinedContacts, ...patientContactsMapped];
      } else {
        console.warn("[ChatPage] Failed to load patients for chat:", patientsResult.error);
        setError(prev => prev ? `${prev} Failed to load patients.` : "Failed to load patients.");
      }

      if (nursesResult.data) {
        const nurseContactsMapped: Contact[] = nursesResult.data.map(n => ({
          id: n.id,
          name: n.name,
          email: n.email,
          role: 'nurse',
          avatarUrl: n.avatar || `https://placehold.co/40x40.png`,
          lastMessage: "Click to start a conversation...", // Mock
          unread: Math.floor(Math.random() * 3), // Mock
          online: Math.random() > 0.5, // Mock
          hint: n.hint || 'nurse medical',
        }));
        combinedContacts = [...combinedContacts, ...nurseContactsMapped];
      } else {
         console.warn("[ChatPage] Failed to load nurses for chat:", nursesResult.error);
         setError(prev => prev ? `${prev} Failed to load nurses.` : "Failed to load nurses.");
      }
      
      setContacts(combinedContacts);
      console.log("[ChatPage] Combined contacts from patients & nurses collections:", combinedContacts);

      if (combinedContacts.length > 0) {
        let defaultContact: Contact | undefined;
        if (userRole === 'patient') {
          defaultContact = combinedContacts.find(c => c.role === 'nurse' && c.id !== currentUser?.uid);
        } else { // admin or nurse
          defaultContact = combinedContacts.find(c => c.role === 'patient' && c.id !== currentUser?.uid);
          if (!defaultContact) {
            defaultContact = combinedContacts.find(c => c.role === 'nurse' && c.id !== currentUser?.uid);
          }
        }
        if (!defaultContact && combinedContacts.length > 0) {
           defaultContact = combinedContacts[0]?.id !== currentUser?.uid ? combinedContacts[0] : (combinedContacts[1] || null);
        }
        setSelectedContact(defaultContact || null);
        if (defaultContact?.role === 'patient') setSelectedPatientIdFromDropdown(defaultContact.id);
        if (defaultContact?.role === 'nurse') setSelectedNurseIdFromDropdown(defaultContact.id);
      }

    } catch (e: any) {
      setError(`Failed to load contacts: ${e.message}`);
      console.error("[ChatPage] Exception loading contacts:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [authLoading, loadContacts]);

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
      {/* Contacts Panel */}
      <Card className="w-full md:w-1/3 lg:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            Conversations
            <Button variant="ghost" size="icon" aria-label="New Conversation"><MessageSquarePlus className="h-5 w-5" /></Button>
          </CardTitle>

          <div className="space-y-2 pt-2">
            {(userRole === 'admin' || userRole === 'nurse') && (
              <Select value={selectedPatientIdFromDropdown} onValueChange={handleSelectPatientFromDropdown}>
                <SelectTrigger className="w-full">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a Patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientContactsForDropdown.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (Patient)</SelectItem>
                  ))}
                   {patientContactsForDropdown.length === 0 && <div className="p-2 text-sm text-muted-foreground">No patients found.</div>}
                </SelectContent>
              </Select>
            )}
            {/* Nurse dropdown visible to all roles including patient */}
            <Select value={selectedNurseIdFromDropdown} onValueChange={handleSelectNurseFromDropdown}>
              <SelectTrigger className="w-full">
                <Stethoscope className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select a Nurse..." />
              </SelectTrigger>
              <SelectContent>
                {nurseContactsForDropdown.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.name} (Nurse)</SelectItem>
                ))}
                 {nurseContactsForDropdown.length === 0 && <div className="p-2 text-sm text-muted-foreground">No nurses found.</div>}
              </SelectContent>
            </Select>
          </div>

        </CardHeader>
        <ScrollArea className="flex-grow">
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" /> Loading contacts...
              </div>
            )}
            {!isLoading && error && (
              <Alert variant="destructive" className="m-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Contacts</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && contacts.length === 0 && (
              <p className="p-4 text-center text-muted-foreground">No patients or nurses available for chat.</p>
            )}
            {/* Main contact list - filtered by user role visibility implicitly by combinedContacts logic */}
            {!isLoading && !error && contacts.filter(c => {
                if (!currentUser) return false;
                if (c.id === currentUser.uid) return false; // Exclude self
                if (userRole === 'patient') return c.role === 'nurse'; // Patients only see nurses
                return true; // Admins and Nurses see everyone else
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
                  {contact.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name} <span className="text-xs text-muted-foreground">({contact.role})</span></p>
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
                {contact.unread && contact.unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {contact.unread}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      {selectedContact ? (
        <Card className="flex-1 shadow-lg flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={selectedContact.avatarUrl} alt={selectedContact.name} data-ai-hint={selectedContact.hint} />
                  <AvatarFallback>{selectedContact.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  {selectedContact.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div>
                  <CardTitle>{selectedContact.name}</CardTitle>
                  <CardDescription className={selectedContact.online ? "text-green-500" : "text-muted-foreground"}>
                    {selectedContact.online ? "Online" : "Offline"} ({selectedContact.role})
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
              {mockMessages.map(msg => (
                   <div key={msg.id} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow-sm ${msg.self ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.self ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'}`}>{msg.time}</p>
                      </div>
                  </div>
              ))}
          </ScrollArea>
          <CardContent className="p-4 border-t bg-background">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Attach file"><Paperclip className="h-5 w-5" /></Button>
              <Input placeholder="Type your message..." className="flex-1" />
              <Button aria-label="Send message"><Send className="h-5 w-5" /></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 shadow-lg flex flex-col items-center justify-center bg-muted/30">
            <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a patient or nurse to start chatting.</p>
            {isLoading && <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>}
             {!isLoading && !error && contacts.length > 0 && !selectedContact && (
                <p className="text-sm text-muted-foreground mt-2">Use the dropdowns or click on a contact from the list.</p>
            )}
            {!isLoading && !error && contacts.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No patients or nurses found in the database to chat with.</p>
            )}
        </Card>
      )}
    </div>
  );
}
    

    