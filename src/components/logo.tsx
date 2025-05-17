import type { SVGProps } from 'react';
import { HeartPulse } from 'lucide-react'; // Ensure HeartPulse is imported

// Logo component for the application
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    // Using HeartPulse icon as the logo
    <HeartPulse className="h-8 w-8 text-primary" {...props} />
  );
}
