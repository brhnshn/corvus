import React from 'react';
import { X } from 'lucide-react';
import { ProfilePage } from '../Profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string | null;
  role?: string | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  role
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161824] border border-white/10 rounded-3xl p-5 sm:p-8 overflow-y-auto shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer z-10"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <ProfilePage username={username ?? undefined} role={role ?? undefined} />
      </div>
    </div>
  );
};
