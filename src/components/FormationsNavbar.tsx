import React, { useState } from 'react';
import { ChevronLeft, Search, BookMarked, GraduationCap, X, Wallet, LogIn } from 'lucide-react';
import { Client } from '../types';
import { useSettings } from '../services/parcelService';
import RenaLogo from './RenaLogo';

interface FormationsNavbarProps {
  onGoHome: () => void;
  loggedClient: Client | null;
  onOpenWallet: () => void;
  onRequestAuth: () => void;
  activeTab: 'all' | 'my';
  onTabChange: (tab: 'all' | 'my') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function FormationsNavbar({
  onGoHome, loggedClient, onOpenWallet, onRequestAuth,
  activeTab, onTabChange, searchQuery, onSearch,
}: FormationsNavbarProps) {
  const { settings } = useSettings();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5">
        <div className="flex items-center h-14 gap-2 sm:gap-3">

          {/* Logo / Back home */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 shrink-0 group pr-1"
            aria-label="Retour à l'accueil"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Rena"
                className="h-7 w-auto object-contain"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <RenaLogo size={28} />
            )}
            <div className="hidden sm:flex flex-col items-start leading-none">
              <span className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-violet-500 transition-colors flex items-center gap-0.5">
                <ChevronLeft className="h-2.5 w-2.5" /> Accueil
              </span>
              <span className="text-xs font-black text-gray-800">Rena</span>
            </div>
          </button>

          <div className="h-5 w-px bg-gray-200 shrink-0 hidden sm:block" />

          {/* LMS label */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <GraduationCap className="h-4 w-4 text-violet-600" />
            <span className="font-black text-gray-800 text-sm">Formations</span>
          </div>

          {/* Search bar */}
          <div className={`relative flex-1 transition-all duration-300 ${searchFocused ? 'max-w-2xl' : 'max-w-xs sm:max-w-sm md:max-w-md'}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Rechercher un cours, instructeur…"
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:bg-white focus:border-violet-300 transition-all"
            />
            {searchQuery && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Tab switcher (desktop only) */}
          <div className="hidden md:flex items-center gap-0.5 shrink-0 bg-gray-100/80 p-0.5 rounded-xl">
            <button
              onClick={() => onTabChange('all')}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Catalogue
            </button>
            <button
              onClick={() => {
                if (!loggedClient) { onRequestAuth(); return; }
                onTabChange('my');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'my'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookMarked className="h-3.5 w-3.5" />
              Mes cours
            </button>
          </div>

          {/* User / wallet */}
          <div className="shrink-0">
            {loggedClient ? (
              <button
                onClick={onOpenWallet}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                  {loggedClient.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-violet-700 hidden sm:block truncate max-w-[70px]">
                  {loggedClient.name.split(' ')[0]}
                </span>
                <Wallet className="h-3.5 w-3.5 text-violet-500" />
              </button>
            ) : (
              <button
                onClick={onRequestAuth}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-sm shadow-violet-500/20"
              >
                <LogIn className="h-3 w-3" />
                <span>Connexion</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
