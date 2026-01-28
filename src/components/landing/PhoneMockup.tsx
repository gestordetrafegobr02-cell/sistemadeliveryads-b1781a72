import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div className={cn("relative mx-auto", className)}>
      {/* Phone Frame */}
      <div className="relative bg-neutral-900 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-neutral-900 rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="relative bg-white rounded-[2rem] overflow-hidden w-[220px] h-[440px]">
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-neutral-900/90 flex items-center justify-between px-6 text-white text-[10px] z-20">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white rounded-sm">
                <div className="w-2.5 h-full bg-white rounded-sm" />
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="pt-8 h-full overflow-hidden">
            {children}
          </div>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
      </div>
    </div>
  );
}
