import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, MessageCircleWarning, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mockNotifications = [
  { id: 'notif1', type: 'Reminder', message: 'Appointment with Alice Wonderland in 1 hour.', time: '9:00 AM', read: false },
  { id: 'notif2', type: 'Alert', message: 'Bob The Builder missed medication dose.', time: 'Yesterday', read: false },
  { id: 'notif3', type: 'Update', message: 'New care plan assigned for Charlie Chaplin.', time: '2 days ago', read: true },
  { id: 'notif4', type: 'Reminder', message: 'Follow-up call with Diana Prince due tomorrow.', time: '3 days ago', read: true },
];


export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with important alerts and reminders.</p>
        </div>
        <Button variant="outline">Mark all as read</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><BellRing className="mr-2 h-5 w-5 text-primary" />Notification Center</CardTitle>
          <CardDescription>View reminders, treatment alerts, and system updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockNotifications.length > 0 ? mockNotifications.map((notification, index) => (
            <div key={notification.id}>
              <div className={`p-4 rounded-lg flex items-start gap-4 ${notification.read ? 'bg-muted/50' : 'bg-accent/20 border border-accent/50'}`}>
                {notification.type === 'Reminder' && <BellRing className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-yellow-500'}`} />}
                {notification.type === 'Alert' && <MessageCircleWarning className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-red-500'}`} />}
                {notification.type === 'Update' && <CheckCircle2 className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-blue-500'}`} />}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${notification.read ? 'text-muted-foreground' : ''}`}>{notification.type}</span>
                    <span className={`text-xs ${notification.read ? 'text-muted-foreground' : 'text-foreground/80'}`}>{notification.time}</span>
                  </div>
                  <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notification.message}</p>
                </div>
                {!notification.read && <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full"></Badge>}
              </div>
              {index < mockNotifications.length -1 && <Separator className="my-2" />}
            </div>
          )) : (
             <div className="p-8 text-center bg-muted rounded-md">
                <BellRing className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No New Notifications</h3>
                <p className="text-muted-foreground">
                You're all caught up!
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
