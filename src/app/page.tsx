
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (currentUser.emailVerified) {
          router.replace('/dashboard');
        } else {
          // Optional: redirect to a page asking them to verify email
          // For now, still allow to dashboard, but UserNav will show "Email not verified"
          router.replace('/dashboard'); 
          // Or: router.replace('/please-verify-email');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  // Show a loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return null; // Or a loading spinner, page will redirect shortly
}
