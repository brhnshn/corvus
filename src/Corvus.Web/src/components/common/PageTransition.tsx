import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, pageKey }) => {
  return (
    <div
      key={pageKey}
      className="w-full animate-in fade-in-50 duration-200 motion-reduce:animate-none"
    >
      {children}
    </div>
  );
};
