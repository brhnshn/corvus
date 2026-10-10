import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-white/[0.06] rounded-md animate-pulse motion-reduce:animate-none ${className}`}
    />
  );
};

export const ContainerTableSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {/* Filtre ve Arama Çubuğu İskeleti */}
      <div className="h-10 bg-white/[0.04] rounded-xl animate-pulse" />
      
      {/* Satır İskeletleri */}
      <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-[#1b1d2a]/50">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="w-36 h-4" />
                <Skeleton className="w-24 h-3" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
