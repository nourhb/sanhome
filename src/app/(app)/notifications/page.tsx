
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, MessageCircleWarning, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { NotificationItem } from "@/app/actions";
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/app/actions";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const loadNotifications = useCallback(async () => {
    if (!currentUser) {
      setError("Please log in to view notifications.");
      setIsLoading(false);
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchNotifications(currentUser.uid);
      if (result.data) {
        setNotifications(result.data);
      } else {
        setError(result.error || "Failed to load notifications.");
      }
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if(!authLoading && currentUser){
      loadNotifications();
    } else if (!authLoading && !currentUser) {
      setError("Please log in to view notifications.");
      setIsLoading(false);
      setNotifications([]);
    }
  }, [authLoading, currentUser, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    const result = await markNotificationAsRead(currentUser.uid, notificationId);
    if (result.success) {
      loadNotifications(); // Refresh list
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not mark notification as read."});
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    const result = await markAllNotificationsAsRead(currentUser.uid);
    if (result.success) {
      loadNotifications(); // Refresh list
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not mark all notifications as read."});
    }
  };

  if (authLoading) {
     return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with important alerts and reminders.</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={isLoading || notifications.filter(n => !n.read).length === 0}>Mark all as read</Button>
      </div>

      {error && !isLoading && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><BellRing className="mr-2 h-5 w-5 text-primary" />Notification Center</CardTitle>
          <CardDescription>View reminders, treatment alerts, and system updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading notifications...</div>
          )}
          {!isLoading && !error && notifications.length === 0 && (
             <div className="p-8 text-center bg-muted rounded-md">
                <BellRing className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No New Notifications</h3>
                <p className="text-muted-foreground">
                You're all caught up!
                </p>
            </div>
          )}
          {!isLoading && !error && notifications.length > 0 && notifications.map((notification, index) => (
            <div key={notification.id}>
              <div className={`p-4 rounded-lg flex items-start gap-4 ${notification.read ? 'bg-muted/50' : 'bg-accent/20 border border-accent/50 hover:bg-accent/30'}`}
                   onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                   role={!notification.read ? "button" : undefined}
                   tabIndex={!notification.read ? 0 : undefined}
                   onKeyDown={(e) => !notification.read && (e.key === 'Enter' || e.key === ' ') && handleMarkAsRead(notification.id)}
                   title={!notification.read ? "Click to mark as read" : undefined}
                   className="cursor-pointer"
              >
                {notification.type === 'Reminder' && <BellRing className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-yellow-500'}`} />}
                {notification.type === 'Alert' && <MessageCircleWarning className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-red-500'}`} />}
                {notification.type === 'Update' && <CheckCircle2 className={`h-5 w-5 mt-1 ${notification.read ? 'text-muted-foreground' : 'text-blue-500'}`} />}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${notification.read ? 'text-muted-foreground' : ''}`}>{notification.type}</span>
                    <span className={`text-xs ${notification.read ? 'text-muted-foreground' : 'text-foreground/80'}`}>
                      {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notification.message}</p>
                </div>
                {!notification.read && <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full self-center"></Badge>}
              </div>
              {index < notifications.length -1 && <Separator className="my-2" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
