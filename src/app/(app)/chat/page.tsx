
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Ensure Input is imported
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, UserSearch, Paperclip, Phone, Video, Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchUsersForAdmin, type UserForAdminList } from "@/app/actions"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Mock messages - real chat requires a backend and real-time service
const mockMessages = [
    { id: 'm1', senderId: 'user1', text: 'Hi Nurse Joy, I have a quick question about my medication.', time: '10:30 AM', self: false },
    { id: 'm2', senderId: 'currentUser', text: 'Hello Alice, I\'m here to help. What\'s your question?', time: '10:31 AM', self: true },
    { id: 'm3', senderId: 'user1', text: 'Is it okay to take it with food?', time: '10:32 AM', self: false },
    { id: 'm4', senderId: 'currentUser', text: 'Yes, for this particular medication, it\'s best to take it with a meal to avoid stomach upset. Did you have any other concerns?', time: '10:33 AM', self: true },
    { id: 'm5', senderId: 'user1', text: 'No, that was all. Thank you so much!', time: '10:34 AM', self: false },
];

interface Contact extends UserForAdminList {
  avatarPath?: string;
  lastMessage?: string;
  unread?: number;
  online?: boolean; 
  hint?: string;
}


export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, userRole, loading: authLoading } = useAuth();

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
      const result = await fetchUsersForAdmin(); 
      if (result.data) {
        const fetchedContacts: Contact[] = result.data.map(user => ({
          ...user,
          avatarPath: `https://placehold.co/40x40.png?text=${user.name.split(' ').map(n => n[0]).join('')}`, 
          lastMessage: "Click to start a conversation...", 
          unread: Math.floor(Math.random() * 3), 
          online: Math.random() > 0.5, 
          hint: 'person ' + (user.name.split(' ')[0] || 'contact').toLowerCase(),
        }));
        setContacts(fetchedContacts);
        if (fetchedContacts.length > 0) {
          let defaultContact = fetchedContacts[0];
          if (userRole === 'patient') {
            defaultContact = fetchedContacts.find(c => c.role === 'nurse' && c.id !== currentUser.uid) || fetchedContacts.find(c => c.id !== currentUser.uid) || fetchedContacts[0];
          } else {
            defaultContact = fetchedContacts.find(c => c.id !== currentUser.uid) || fetchedContacts[0];
          }
          setSelectedContact(defaultContact);
        }
      } else {
        setError(result.error || "Failed to load contacts.");
      }
    } catch (e: any) {
      setError(`Failed to load contacts: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (currentUser && userRole) {
      const lowerCaseTrimmedSearchTerm = searchTerm.trim().toLowerCase();
      
      if (!lowerCaseTrimmedSearchTerm) {
         const allVisibleContacts = contacts.filter(contact => {
            if (contact.id === currentUser.uid) return false;
            if (userRole === 'admin' || userRole === 'nurse') return true;
            if (userRole === 'patient') return contact.role === 'nurse';
            return false;
        });
        setFilteredContacts(allVisibleContacts);
        return;
      }

      const filtered = contacts.filter(contact => {
        if (contact.id === currentUser.uid) return false; 

        const contactName = (contact.name || "").trim().toLowerCase();
        const matchesSearchTerm = contactName.includes(lowerCaseTrimmedSearchTerm);
        if (!matchesSearchTerm) return false;

        if (userRole === 'admin' || userRole === 'nurse') {
          return true; 
        } else if (userRole === 'patient') {
          return contact.role === 'nurse'; 
        }
        return false; 
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts([]); 
    }
  }, [searchTerm, contacts, currentUser, userRole]);

  useEffect(() => {
    if(!authLoading){
      loadContacts();
    }
  }, [authLoading, loadContacts]);

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
          <div className="relative">
            <UserSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.trim() && ( 
              <div className="absolute z-10 w-full bg-card border border-border rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="flex items-center gap-3 p-2 border-b hover:bg-accent cursor-pointer" 
                      onClick={() => { setSelectedContact(contact); setSearchTerm(''); }}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (()=>{setSelectedContact(contact); setSearchTerm('');})()}
                      role="button"
                      tabIndex={0}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatarPath} alt={contact.name} data-ai-hint={contact.hint} />
                        <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold">{contact.name} ({contact.role})</p>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-center text-muted-foreground text-sm">
                    No contacts match your search criteria.
                  </p>
                )}
              </div>
            )}
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
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && contacts.length === 0 && (
              <p className="p-4 text-center text-muted-foreground">No contacts available.</p>
            )}
            {!isLoading && !error && contacts.filter(c => currentUser && c.id !== currentUser.uid && (userRole === 'admin' || userRole === 'nurse' || (userRole === 'patient' && c.role === 'nurse'))).map(contact => ( 
              <div
                key={contact.id} 
                className={`flex items-center gap-3 p-3 border-b hover:bg-accent/50 cursor-pointer ${selectedContact?.id === contact.id ? 'bg-accent' : ''}`}
                onClick={() => setSelectedContact(contact)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedContact(contact)}
              >
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={contact.avatarPath} alt={contact.name} data-ai-hint={contact.hint} />
                  <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  {contact.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name} ({contact.role})</p>
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
                  <AvatarImage src={selectedContact.avatarPath} alt={selectedContact.name} data-ai-hint={selectedContact.hint} />
                  <AvatarFallback>{selectedContact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  {selectedContact.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div>
                  <CardTitle>{selectedContact.name}</CardTitle>
                  <CardDescription className={selectedContact.online ? "text-green-500" : "text-muted-foreground"}>
                    {selectedContact.online ? "Online" : "Offline"} {selectedContact.role && `(${selectedContact.role})`}
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
            <p className="text-muted-foreground">Select a contact to start chatting.</p>
            {isLoading && <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>}
             {!isLoading && !error && contacts.length > 0 && !selectedContact && (
                <p className="text-sm text-muted-foreground mt-2">Or click on a contact from the list.</p>
            )}
        </Card>
      )}
    </div>
  );
}

    