import React from 'react';
import { User } from '@supabase/supabase-js';
import { Newspaper, TrendingUp, LogOut, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  user: User;
  onClearSearch?: () => void;
  hasActiveSearch?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onClearSearch, hasActiveSearch }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div
            className={`flex items-center space-x-3 ${
              hasActiveSearch ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
            } transition-opacity group`}
            onClick={hasActiveSearch ? onClearSearch : undefined}
          >
            <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
              <TrendingUp size={18} />
            </div>
                         <div className="hidden sm:block">
               <h1 className="text-lg font-bold text-neutral-900 leading-tight">
                 StockSentiment
                 {hasActiveSearch && (
                   <span className="ml-2 text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                     ← Home
                   </span>
                 )}
               </h1>
               <p className="text-xs text-neutral-500 leading-tight">AI-powered market insights</p>
             </div>
           </div>

          {/* Navigation and User Actions */}
          <div className="flex items-center space-x-4">
            {/* Home Button for Mobile */}
            {hasActiveSearch && onClearSearch && (
              <button
                onClick={onClearSearch}
                className="sm:hidden flex items-center justify-center w-9 h-9 text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Go to Home"
              >
                <Home size={18} />
              </button>
            )}

            {/* User Section */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-neutral-700 font-medium">{user.email?.split('@')[0]}</span>
              </div>
              

              
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-9 h-9 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                title="Sign Out"
              >
                <LogOut size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;