import { redirect } from 'next/navigation';

export default function HomePage() {
  // In a real app, check authentication status here.
  // For now, redirect to dashboard to showcase the app layout.
  // Or, could redirect to /login
  redirect('/dashboard');
  // return null; // redirect() throws an error, so this is unreachable
}
