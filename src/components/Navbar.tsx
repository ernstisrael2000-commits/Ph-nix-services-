import { Package, ShieldCheck, LogIn, LogOut, Menu, X, Wallet, Bell, CheckCheck, Info, TrendingUp, TrendingDown, Trash2, Download, Share2, Smartphone } from 'lucide-react';
import RenaLogo from './RenaLogo';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../services/parcelService';
import { usePendingClientCount, useClientNotifications, markClientNotificationRead, markAllClientNotificationsRead, clearAllClientNotifications } from '../services/clientService';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Client, AdminAccount } from '../types';
import UserAuthModal from './UserAuthModal';
import { Package as ColisIcon, Globe } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  loggedClient: Client | null;
  onClientLogin: (client: Client) => void;
  onClientLogout: () => void;
  onOpenWallet: () => void;
  onAdminLogin: (admin: AdminAccount) => void;
  loggedAdmin: AdminAccount | null;
}

const NAV_ITEMS = [
  { key: 'services', icon: Globe,     label: 'Services' },
  { key: 'tracking', icon: ColisIcon, label: 'Colis'    },
];

export default function Navbar({ currentView, onViewChange, loggedClient, onClientLogin, onClientLogout, onOpenWallet, onAdminLogin, loggedAdmin }: NavbarProps) {
  const { user, isAdmin } = useAuth();
  const showAdminButton = isAdmin || !!loggedAdmin;
  const { settings } = useSettings();
  const pendingClientCount = usePendingClientCount();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [confirmClearNotifs, setConfirmClearNotifs] = useState(false);
  const [clearingNotifs, setClearingNotifs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const installMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (installMenuRef.current && !installMenuRef.current.contains(e.target as Node)) {
        setShowInstallMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Pour installer l'application :\n• Sur iPhone : appuyez sur « Partager » puis « Sur l'écran d'accueil »\n• Sur Android : appuyez sur le menu du navigateur puis « Ajouter à l'écran d'accueil »");
    }
    setShowInstallMenu(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Phénix Services',
      text: 'Gérez vos services et colis facilement avec Phénix Services.',
      url: window.location.origin,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.origin);
      alert('Lien copié dans le presse-papiers !');
    }
    setShowInstallMenu(false);
  };

  const { notifications: clientNotifs, unreadCount: clientUnreadCount } = useClientNotifications(loggedClient?.id || null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onViewChange('tracking');
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
    document.addEventListener('mousedown', handleClickOutside);
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
      <nav className="border-b bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center gap-2">

            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => handleNav('tracking')}
            >
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Phénix Services Logo" className="h-7 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <img src="/phenix-logo.png" alt="Phénix Services" className="h-8 w-auto object-contain" />
              )}
              <span className="text-lg font-black tracking-tight text-gray-800 hidden sm:block">Phénix Services</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => <NavButton key={item.key} item={item} />)}
              {showAdminButton && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl relative transition-all duration-200 group ${currentView === 'admin' ? 'bg-amber-50' : 'hover:bg-amber-50/60'}`}
                >
                  <ShieldCheck className={`h-[18px] w-[18px] ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-500'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400/70 group-hover:text-amber-500'}`}>Admin</span>
                  {pendingClientCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {pendingClientCount > 9 ? '9+' : pendingClientCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Download button — desktop */}
            {!isInstalled && (
              <div className="hidden md:block relative" ref={installMenuRef}>
                <button
                  onClick={() => setShowInstallMenu(v => !v)}
                  className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 group hover:bg-emerald-50"
                  aria-label="Télécharger l'application"
                >
                  <Download className="h-[18px] w-[18px] text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400/70 group-hover:text-emerald-600 transition-colors">App</span>
                </button>
                {showInstallMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-emerald-50 to-teal-50">
                      <p className="text-xs font-black text-gray-800">Phénix Services</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Accès rapide depuis votre écran</p>
                    </div>
                    <button
                      onClick={handleInstall}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Smartphone className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Télécharger</p>
                        <p className="text-[10px] text-gray-400">Installer sur l'appareil</p>
                      </div>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left border-t border-gray-50"
                    >
                      <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Share2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Partager</p>
                        <p className="text-[10px] text-gray-400">Envoyer le lien</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Client notification bell */}
              {loggedClient && (
                <>
                  <button
                    onClick={() => setShowNotifPanel(true)}
                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className={`h-5 w-5 ${clientUnreadCount > 0 ? 'text-primary' : 'text-gray-400'}`} />
                    {clientUnreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                        {clientUnreadCount > 9 ? '9+' : clientUnreadCount}
                      </span>
                    )}
                  </button>

                  <Dialog open={showNotifPanel} onOpenChange={v => { setShowNotifPanel(v); if (!v) setConfirmClearNotifs(false); }}>
                    <DialogContent className="max-w-sm w-full rounded-3xl border-0 p-0 overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Bell className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">Notifications</p>
                            {clientUnreadCount > 0 && (
                              <p className="text-[10px] text-primary font-bold">{clientUnreadCount} non lue{clientUnreadCount > 1 ? 's' : ''}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {clientUnreadCount > 0 && (
                            <button
                              onClick={async () => { await markAllClientNotificationsRead(loggedClient.id!); }}
                              className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              <CheckCheck className="h-3 w-3" /> Tout lire
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[60vh] overflow-y-auto">
                        {clientNotifs.length === 0 ? (
                          <div className="py-12 text-center text-gray-400">
                            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                              <Bell className="h-8 w-8 opacity-30" />
                            </div>
                            <p className="text-sm font-semibold">Aucune notification</p>
                            <p className="text-xs mt-1 text-gray-300">Tout est calme pour l'instant</p>
                          </div>
                        ) : (
                          clientNotifs.slice(0, 20).map(notif => {
                            const isApproved = notif.type === 'deposit_approved' || notif.type === 'withdrawal_approved';
                            const isRejected = notif.type?.includes('rejected');
                            const iconBg = notif.type === 'deposit_approved' ? 'bg-emerald-100' :
                              notif.type === 'withdrawal_approved' ? 'bg-blue-100' :
                              isRejected ? 'bg-red-100' : 'bg-gray-100';
                            const titleColor = isApproved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-gray-900';
                            return (
                              <button
                                key={notif.id}
                                onClick={() => markClientNotificationRead(notif.id!)}
                                className={`w-full flex items-start gap-3 px-5 py-3.5 text-left border-b last:border-0 transition-colors ${notif.read ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'}`}
                              >
                                <div className={`shrink-0 mt-0.5 h-9 w-9 rounded-2xl flex items-center justify-center ${iconBg}`}>
                                  {notif.type === 'deposit_approved' ? <TrendingUp className="h-4 w-4 text-emerald-600" /> :
                                   notif.type === 'withdrawal_approved' ? <TrendingDown className="h-4 w-4 text-blue-600" /> :
                                   isRejected ? <X className="h-4 w-4 text-red-600" /> :
                                   <Info className="h-4 w-4 text-gray-500" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-black leading-snug ${notif.read ? 'text-gray-500' : titleColor}`}>{notif.title}</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                                  {notif.createdAt && (
                                    <p className="text-[9px] text-gray-300 mt-1 font-semibold">
                                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                                {!notif.read && <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {clientNotifs.length > 0 && (
                        <div className="border-t px-5 py-3 flex items-center justify-end bg-gray-50/50">
                          {confirmClearNotifs ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-red-500 font-bold">Supprimer tout ?</span>
                              <button
                                disabled={clearingNotifs}
                                onClick={async () => {
                                  setClearingNotifs(true);
                                  try { await clearAllClientNotifications(loggedClient.id!); } catch {}
                                  setClearingNotifs(false);
                                  setConfirmClearNotifs(false);
                                }}
                                className="text-[11px] font-black text-red-600 hover:text-red-800 px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {clearingNotifs ? '...' : 'Confirmer'}
                              </button>
                              <button
                                onClick={() => setConfirmClearNotifs(false)}
                                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmClearNotifs(true)}
                              className="text-[11px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> Supprimer l'historique
                            </button>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Client wallet button */}
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
                  className="bg-primary hover:bg-[#1D4ED8] text-white text-xs font-bold px-3 py-1.5 h-auto rounded-xl flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Connexion</span>
                </Button>
              )}

              {/* Burger — mobile */}
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors relative"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div ref={menuRef} className="absolute top-14 right-0 w-72 max-h-[calc(100vh-56px)] overflow-y-auto bg-white shadow-2xl rounded-bl-2xl flex flex-col">

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
                      <p className="text-xs text-primary font-semibold">Wallet</p>
                    </div>
                    <button onClick={() => { onOpenWallet(); setMenuOpen(false); }}
                      className="ml-auto p-2 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-colors">
                      <Wallet className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map(item => {
                const active = currentView === item.key;
                return (
                  <button key={item.key} onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {showAdminButton && (
                <button onClick={() => handleNav('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${currentView === 'admin' ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-amber-50/60'}`}>
                  <ShieldCheck className={`h-5 w-5 shrink-0 ${currentView === 'admin' ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span>Administration</span>
                  {pendingClientCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {pendingClientCount}
                    </span>
                  )}
                </button>
              )}

              {!isInstalled && (
                <>
                  <div className="pt-2 pb-1 px-2">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Application</p>
                  </div>
                  <button
                    onClick={() => { handleInstall(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-all">
                    <Smartphone className="h-5 w-5 shrink-0 text-emerald-500" />
                    <span>Télécharger l'application</span>
                  </button>
                  <button
                    onClick={() => { handleShare(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all">
                    <Share2 className="h-5 w-5 shrink-0 text-blue-500" />
                    <span>Partager l'application</span>
                  </button>
                </>
              )}
            </div>

            <div className="p-3 border-t space-y-1">
              {(user || loggedClient) ? (
                <button onClick={user ? handleLogout : () => { onClientLogout(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Déconnexion</span>
                </button>
              ) : (
                <button onClick={() => { setShowAuthModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-all">
                  <LogIn className="h-5 w-5 shrink-0" />
                  <span>Connexion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <UserAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onClientLogin={(client) => { onClientLogin(client); setShowAuthModal(false); }}
        onAdminLogin={(admin) => { onAdminLogin(admin); setShowAuthModal(false); }}
        onAffiliateAccess={() => {}}
        onAdminPasswordLogin={() => { setShowAuthModal(false); onViewChange('admin'); }}
      />
    </>
  );
}
