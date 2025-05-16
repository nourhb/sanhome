
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, UserSearch, Paperclip, Phone, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockContacts = [
  { id: 'c1', name: 'Alice Wonderland (Patient)', avatarPath: 'https://placehold.co/40x40.png', lastMessage: 'Thanks for the update!', unread: 0, online: true, hint: 'person initial' },
  { id: 'c2', name: 'Dr. Smith (Admin)', avatarPath: 'https://placehold.co/40x40.png', lastMessage: 'Please review the new protocol.', unread: 2, online: false, hint: 'person initial' },
  { id: 'c3', name: 'Bob The Builder (Patient)', avatarPath: 'https://placehold.co/40x40.png', lastMessage: 'Feeling much better today.', unread: 0, online: true, hint: 'person initial' },
  { id: 'c4', name: 'Nurse Betty (Colleague)', avatarPath: 'https://placehold.co/40x40.png', lastMessage: 'Can you cover my shift on Friday?', unread: 1, online: true, hint: 'person initial' },
];

const mockMessages = [
    { id: 'm1', sender: 'Alice Wonderland (Patient)', text: 'Hi Nurse Joy, I have a quick question about my medication.', time: '10:30 AM', self: false },
    { id: 'm2', sender: 'Nurse Joy', text: 'Hello Alice, I\'m here to help. What\'s your question?', time: '10:31 AM', self: true },
    { id: 'm3', sender: 'Alice Wonderland (Patient)', text: 'Is it okay to take it with food?', time: '10:32 AM', self: false },
    { id: 'm4', sender: 'Nurse Joy', text: 'Yes, for this particular medication, it\'s best to take it with a meal to avoid stomach upset. Did you have any other concerns?', time: '10:33 AM', self: true },
    { id: 'm5', sender: 'Alice Wonderland (Patient)', text: 'No, that was all. Thank you so much!', time: '10:34 AM', self: false },
];

// For this example, we'll assume the first contact is selected.
const selectedContact = mockContacts[0];

export default function ChatPage() {
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
            <Input placeholder="Search contacts..." className="pl-8" />
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow">
          <CardContent className="p-0">
            {mockContacts.map(contact => (
              <div key={contact.id} className={`flex items-center gap-3 p-3 border-b hover:bg-accent/50 cursor-pointer ${selectedContact.id === contact.id ? 'bg-accent/70' : ''}`}>
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={contact.avatarPath} alt={contact.name} data-ai-hint={contact.hint} />
                  <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  {contact.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
                {contact.unread > 0 && (
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
                <CardTitle>{selectedContact.name.split(' (')[0]}</CardTitle> {/* Show only name part */}
                <CardDescription className={selectedContact.online ? "text-green-500" : "text-muted-foreground"}>
                  {selectedContact.online ? "Online" : "Offline"}
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
    </div>
  );
}
