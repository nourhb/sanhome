import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquarePlus, UserSearch, Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockContacts = [
  { id: 'c1', name: 'Alice Wonderland (Patient)', avatar: 'https://placehold.co/40x40.png?text=AW', lastMessage: 'Thanks for the update!', unread: 0, online: true },
  { id: 'c2', name: 'Dr. Smith (Admin)', avatar: 'https://placehold.co/40x40.png?text=DS', lastMessage: 'Please review the new protocol.', unread: 2, online: false },
  { id: 'c3', name: 'Bob The Builder (Patient)', avatar: 'https://placehold.co/40x40.png?text=BB', lastMessage: 'Feeling much better today.', unread: 0, online: true },
];

const mockMessages = [
    { id: 'm1', sender: 'Alice Wonderland (Patient)', text: 'Hi Nurse Joy, I have a quick question about my medication.', time: '10:30 AM', self: false },
    { id: 'm2', sender: 'Nurse Joy', text: 'Hello Alice, I\'m here to help. What\'s your question?', time: '10:31 AM', self: true },
    { id: 'm3', sender: 'Alice Wonderland (Patient)', text: 'Is it okay to take it with food?', time: '10:32 AM', self: false },
];

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4">
      {/* Contacts Panel */}
      <Card className="w-full md:w-1/3 lg:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            Conversations
            <Button variant="ghost" size="icon"><MessageSquarePlus className="h-5 w-5" /></Button>
          </CardTitle>
          <div className="relative">
            <UserSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-8" />
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow">
          <CardContent className="p-0">
            {mockContacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-3 p-3 border-b hover:bg-accent/50 cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar} alt={contact.name} data-ai-hint="person face" />
                  <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://placehold.co/40x40.png?text=AW" alt="Alice Wonderland" data-ai-hint="person face" />
              <AvatarFallback>AW</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Alice Wonderland</CardTitle>
              <CardDescription className="text-green-500">Online</CardDescription>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow p-4 space-y-4 bg-muted/30">
            {mockMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.self ? 'bg-primary text-primary-foreground' : 'bg-background shadow'}`}>
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.self ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'}`}>{msg.time}</p>
                    </div>
                </div>
            ))}
        </ScrollArea>
        <CardContent className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button>
            <Input placeholder="Type your message..." className="flex-1" />
            <Button><Send className="h-5 w-5" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
