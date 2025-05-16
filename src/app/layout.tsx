
import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif, Geist is also fine.
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Using --font-sans as convention
});

export const metadata: Metadata = {
  title: 'SanHome',
  description: 'Personalized Home Care Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
