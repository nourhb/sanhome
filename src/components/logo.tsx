import type { SVGProps } from 'react';
import { HeartPulse } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <HeartPulse className="h-8 w-8 text-primary" {...props} />
  );
}
