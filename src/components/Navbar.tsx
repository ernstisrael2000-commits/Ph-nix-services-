import { Package, ShieldCheck, LogIn, LogOut, Search, Home, Users, Truck, ExternalLink, Menu, X, GraduationCap, Wallet, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../services/parcelService';
import { usePendingCounts } from '../services/affiliateService';
import { usePendingClientCount } from '../services/clientService';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Client, AdminAccount } from '../types';
import UserAuthModal from './UserAuthModal';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  loggedClient: Client | null;
  onClientLogin: (client: Client) => void;
  onClientLogout: () => void;
  onOpenWallet: () => void;
  onAdminLogin: (admin: AdminAccount) => void;
}

const NAV_ITEMS = [
  { key: 'home', icon: Home, label: 'Accueil' },
  { key: 'tracking', icon: Search, label: 'Suivi' },
  { key: 'shipping', icon: Truck, label: 'Shipping' },
  { key: 'formations', icon: GraduationCap, label: 'Formations' },
  { key: 'affiliate', icon: Users, label: 'Affiliés' },
];

export default function Navbar({ currentView, onViewChange, loggedClient, onClientLogin, onClientLogout, onOpenWallet, onAdminLogin }: NavbarProps) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingAffiliateCount } = usePendingCounts(isAdmin);
  const pendingClientCount = usePendingClientCount();
  const pendingCount = isAdmin ? pendingAffiliateCount + pendingClientCount : 0;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!(user || loggedClient);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onViewChange('home');
      setMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNav = (view: string) => {
    onViewChange(view);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const NavButton = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = currentView === item.key;
    return (
      <button
        onClick={() => handleNav(item.key)}
        className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 group ${active ? 'bg-primary/10' : 'hover:bg-gray-100'}`}
      >
        <item.icon className={`h-[18px] w-[18px] transition-colors ${active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
        <span className={`text-[9px] font-bold uppercase tracking-wide transition-colors ${active ? 'text-primary' : 'text-gray-400/70 group-hover:text-primary/80'}`}>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <nav className="border-b bg-white/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center gap-2">

            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => handleNav('home')}
            >
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Neopay Logo" className="h-7 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="bg-primary p-1.5 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-lg font-black tracking-tight text-gray-800 hidden sm:block">Neopay</span>
            </div>

            {/* Desktop nav — always visible on md+ */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => <NavButton key={item.key} item={item} />)}
              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl relative transition-all duration-200 group ${currentView === 'admin' ? 'bg-amber-50' : 'hover:bg-amber-50/60'}`}
                >
                  <ShieldCheck className={`h-[18px] w-[18px] ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-500'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400/70 group-hover:text-amber-500'}`}>Admin</span>
                  {pendingCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Client wallet */}
              {loggedClient ? (
                <button onClick={onOpenWallet}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white font-black text-[10px]">
                    {loggedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-primary hidden sm:block truncate max-w-[80px]">{loggedClient.name.split(' ')[0]}</span>
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                </button>
              ) : user ? (
                <div className="hidden md:flex items-center gap-2">
                  <img src={user.photoURL || ''} alt={user.displayName || ''}
                    className="h-7 w-7 rounded-full border-2 border-primary/20"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`; }} />
                  <span className="text-xs font-bold text-gray-700 max-w-[90px] truncate">{user.displayName?.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button onClick={() => setShowAuthModal(true)}
                  className="bg-primary hover:bg-[#D98A1E] text-white text-xs font-bold px-3 py-1.5 h-auto rounded-xl flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Connexion</span>
                </Button>
              )}

              {/* Burger — always on mobile, also on desktop when logged in for compactness */}
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors relative"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
                {pendingCount > 0 && !menuOpen && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div ref={menuRef} className="absolute top-14 right-0 w-72 max-h-[calc(100vh-56px)] overflow-y-auto bg-white shadow-2xl rounded-bl-2xl flex flex-col">

            {/* User info block */}
            {(user || loggedClient) && (
              <div className="p-4 border-b bg-gray-50">
                {user && (
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} alt={user.displayName || ''}
                      className="h-10 w-10 rounded-full border-2 border-primary/20"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`; }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                )}
                {loggedClient && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-base">
                      {loggedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{loggedClient.name}</p>
                      <p className="text-xs text-primary font-semibold">Wallet client</p>
                    </div>
                    <button onClick={() => { onOpenWallet(); setMenuOpen(false); }}
                      className="ml-auto p-2 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-colors">
                      <Wallet className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Nav links */}
            <div className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map(item => {
                const active = currentView === item.key;
                return (
                  <button key={item.key} onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 ml-auto text-primary" />}
                  </button>
                );
              })}

              {isAdmin && (
                <button onClick={() => handleNav('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${currentView === 'admin' ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-amber-50/60'}`}>
                  <ShieldCheck className={`h-5 w-5 shrink-0 ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span>Administration</span>
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Bottom actions */}
            <div className="p-3 border-t space-y-1">
              {(user || loggedClient) ? (
                <button onClick={user ? handleLogout : () => { onClientLogout(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Se déconnecter</span>
                </button>
              ) : (
                <button onClick={() => { setShowAuthModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#D98A1E] transition-all">
                  <LogIn className="h-5 w-5 shrink-0" />
                  <span>Connexion</span>
                </button>
              )}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-gray-400 hover:bg-gray-50 transition-all"
                onClick={() => { window.open(window.location.href, '_blank'); setMenuOpen(false); }}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span>Ouvrir dans un nouvel onglet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <UserAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onClientLogin={(client) => { onClientLogin(client); setShowAuthModal(false); }}
        onAdminLogin={(admin) => { onAdminLogin(admin); onViewChange('admin'); setShowAuthModal(false); }}
        onAffiliateAccess={() => onViewChange('affiliate')}
      />

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-red-100 mx-auto">
              <ShieldCheck className="h-8 w-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-dark">Problème de Connexion</DialogTitle>
            <DialogDescription className="pt-4 space-y-4 text-center">
              <p className="text-subtext text-sm leading-relaxed">Une erreur est survenue lors de la connexion. Veuillez réessayer.</p>
              {lastError && (
                <p className="text-[10px] text-subtext/60 font-mono bg-muted p-2 rounded border truncate">Détail: {lastError}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button className="w-full h-12 rounded-xl bg-primary hover:bg-[#D98A1E] text-white font-bold flex items-center justify-center gap-2"
              onClick={() => { window.open(window.location.href, '_blank'); setShowLoginErrorDialog(false); }}>
              <ExternalLink className="h-5 w-5" />
              Ouvrir dans un nouvel onglet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
