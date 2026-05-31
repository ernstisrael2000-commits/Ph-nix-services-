import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, Search, BookMarked, GraduationCap, X,
  Wallet, LogIn, Menu, Grid3X3, Heart, Award, User
} from 'lucide-react';
import { Client } from '../types';
import { useSettings } from '../services/parcelService';
import RenaLogo from './RenaLogo';
import { AnimatePresence, motion } from 'motion/react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const navItems = [
    {
      id: 'all' as const,
      label: 'Catalogue',
      icon: <Grid3X3 className="h-5 w-5" />,
      desc: 'Explorez toutes les formations',
      action: () => { onTabChange('all'); setMenuOpen(false); },
    },
    {
      id: 'my' as const,
      label: 'Mes cours',
      icon: <BookMarked className="h-5 w-5" />,
      desc: 'Vos formations achetées',
      action: () => {
        if (!loggedClient) { onRequestAuth(); setMenuOpen(false); return; }
        onTabChange('my'); setMenuOpen(false);
      },
    },
    {
      id: 'fav' as const,
      label: 'Favoris',
      icon: <Heart className="h-5 w-5" />,
      desc: 'Formations sauvegardées',
      action: () => {
        if (!loggedClient) { onRequestAuth(); setMenuOpen(false); return; }
        onTabChange('my'); setMenuOpen(false);
      },
    },
    {
      id: 'cert' as const,
      label: 'Certificats',
      icon: <Award className="h-5 w-5" />,
      desc: 'Vos diplômes obtenus',
      action: () => {
        if (!loggedClient) { onRequestAuth(); setMenuOpen(false); return; }
        onTabChange('my'); setMenuOpen(false);
      },
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5">
        <div className="flex items-center h-14 gap-2 sm:gap-3">

          {/* Back button */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-1 shrink-0 group"
            aria-label="Retour à l'accueil"
          >
            <div className="h-8 w-8 rounded-xl bg-gray-50 hover:bg-violet-50 border border-gray-100 flex items-center justify-center transition-all group-hover:border-violet-200">
              <ChevronLeft className="h-4 w-4 text-gray-500 group-hover:text-violet-600 transition-colors" />
            </div>
          </button>

          {/* Logo + label */}
          <div className="flex items-center gap-2 shrink-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Rena"
                className="h-7 w-auto object-contain"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <RenaLogo size={26} />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Rena</span>
              <span className="text-[13px] font-black text-gray-800 leading-none">Academy</span>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-100 shrink-0 hidden sm:block" />

          {/* Search bar */}
          <div className={`relative flex-1 transition-all duration-300 ${searchFocused ? 'max-w-full' : 'max-w-sm'}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Rechercher un cours…"
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

          {/* Right: avatar + burger */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* User avatar */}
            {loggedClient ? (
              <button
                onClick={onOpenWallet}
                className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-[11px] font-black shadow-sm hover:bg-violet-700 transition-colors"
                title={loggedClient.name}
              >
                {loggedClient.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onRequestAuth}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-sm shadow-violet-500/20"
              >
                <LogIn className="h-3 w-3" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

            {/* Burger menu button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${
                  menuOpen
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'
                }`}
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-200/60 overflow-hidden z-50"
                  >
                    {/* User info */}
                    {loggedClient && (
                      <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                          {loggedClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{loggedClient.name}</p>
                          <p className="text-xs text-violet-600 font-semibold truncate">{loggedClient.email || 'Étudiant'}</p>
                        </div>
                      </div>
                    )}

                    {/* Nav items */}
                    <div className="py-1.5">
                      {navItems.map(item => (
                        <button
                          key={item.id}
                          onClick={item.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            (item.id === 'all' || item.id === 'my') && activeTab === item.id
                              ? 'text-violet-700'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0 ${
                            (item.id === 'all' || item.id === 'my') && activeTab === item.id
                              ? 'bg-violet-100 text-violet-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.icon}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.label}</p>
                            <p className="text-[11px] text-gray-400">{item.desc}</p>
                          </div>
                          {(item.id === 'all' || item.id === 'my') && activeTab === item.id && (
                            <div className="ml-auto h-2 w-2 rounded-full bg-violet-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Divider + wallet */}
                    <div className="border-t border-gray-100 p-3">
                      <button
                        onClick={() => { onOpenWallet(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors text-gray-700 hover:text-violet-700"
                      >
                        <Wallet className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-semibold">
                          {loggedClient ? 'Mon Wallet' : 'Connexion / Wallet'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}
