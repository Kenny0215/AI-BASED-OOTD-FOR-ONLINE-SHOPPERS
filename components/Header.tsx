import React from 'react';
import { LogOut } from 'lucide-react';

interface HeaderProps {
    isAuthenticated: boolean;
    onLogout: () => void;
    currentUser: { name: string } | null;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLogout, currentUser }) => {
  return (
    <header className="text-center py-8 relative">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
        AI-Based OOTD for Online Shoppers
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        {isAuthenticated && currentUser ? `Welcome back, ${currentUser.name}!` : 'Your Personal Virtual Fitting Room'}
      </p>
      {isAuthenticated && (
        <button
            onClick={onLogout}
            className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 lg:right-8 flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Logout"
        >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
        </button>
      )}
    </header>
  );
};