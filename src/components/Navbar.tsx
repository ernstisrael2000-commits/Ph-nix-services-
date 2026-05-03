import { Package, ShieldCheck, LogIn, LogOut, Search, Home, Users, Truck, ExternalLink, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../services/parcelService';
import { usePendingCounts } from '../services/affiliateService';
import { usePendingClientCount } from '../services/clientService';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
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

export default function Navbar({ currentView, onViewChange, loggedClient, onClientLogin, onClientLogout, onOpenWallet, onAdminLogin }: NavbarProps) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingAffiliateCount } = usePendingCounts(isAdmin);
  const pendingClientCount = usePendingClientCount();
  const pendingCount = isAdmin ? pendingAffiliateCount + pendingClientCount : 0;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onViewChange('home');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAdminAccess = () => {
    onViewChange('affiliate');
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => onViewChange('home')}
          >
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Neopay Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="bg-primary p-2 rounded-lg group-hover:bg-[#D98A1E] transition-colors">
                <Package className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-dark hidden xs:block">Neopay</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <Button 
              variant={currentView === 'home' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('home')} 
              className={`hidden md:flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 group transition-all duration-300 rounded-xl ${currentView === 'home' ? 'bg-accent-light/80 shadow-sm' : 'hover:bg-accent-light/50'}`}
            >
              <Home className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === 'home' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`} />
              <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === 'home' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`}>Accueil</span>
            </Button>
            <Button 
              variant={currentView === 'tracking' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('tracking')} 
              className={`flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 px-2 sm:px-4 group transition-all duration-300 rounded-xl ${currentView === 'tracking' ? 'bg-accent-light/80 shadow-sm' : 'hover:bg-accent-light/50'}`}
            >
              <Search className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === 'tracking' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`} />
              <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === 'tracking' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`}>Suivi</span>
            </Button>

            <Button 
              variant={currentView === 'shipping' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('shipping')} 
              className={`flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 px-2 sm:px-4 group transition-all duration-300 rounded-xl ${currentView === 'shipping' ? 'bg-accent-light/80 shadow-sm' : 'hover:bg-accent-light/50'}`}
            >
              <Truck className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === 'shipping' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`} />
              <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === 'shipping' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`}>Shipping</span>
            </Button>

            <Button 
              variant={currentView === 'affiliate' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('affiliate')} 
              className={`flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 px-2 sm:px-4 group transition-all duration-300 rounded-xl ${currentView === 'affiliate' ? 'bg-accent-light/80 shadow-sm' : 'hover:bg-accent-light/50'}`}
            >
              <Users className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === 'affiliate' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`} />
              <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === 'affiliate' ? 'text-primary' : 'text-subtext group-hover:text-primary'}`}>Affiliés</span>
            </Button>
            
            {isAdmin && (
              <Button 
                variant={currentView === 'admin' ? 'secondary' : 'outline'} 
                onClick={() => onViewChange('admin')} 
                className={`flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 border-accent-light px-2 sm:px-4 relative group transition-all duration-300 rounded-xl ${currentView === 'admin' ? 'bg-accent-light shadow-sm' : 'hover:bg-accent-light hover:shadow-md'}`}
              >
                <ShieldCheck className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === 'admin' ? 'text-[#D98A1E]' : 'text-primary/70 group-hover:text-[#D98A1E]'}`} />
                <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === 'admin' ? 'text-[#D98A1E]' : 'text-primary/70 group-hover:text-[#D98A1E]'}`}>Admin</span>
                {pendingCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full border border-white">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}

            {/* Client Wallet Button or Login */}
            {loggedClient ? (
              <button
                onClick={onOpenWallet}
                className="flex flex-col items-center justify-center h-14 py-1 gap-1 px-2 sm:px-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all group relative"
              >
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs group-hover:scale-105 transition-transform">
                  {loggedClient.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] uppercase tracking-tighter font-semibold text-primary">Wallet</span>
              </button>
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-bold text-dark truncate max-w-[120px]">{user.displayName}</span>
                  <span className="text-[10px] text-subtext truncate max-w-[120px]">{user.email}</span>
                </div>
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || ''} 
                  className="h-8 w-8 rounded-full border hidden xs:block"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
                  }}
                />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-subtext hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex text-subtext/60 hover:text-primary"
                  onClick={() => window.open(window.location.href, '_blank')}
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-primary hover:bg-[#D98A1E] text-white flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden xs:inline">Connexion</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onClientLogin={(client) => {
          onClientLogin(client);
          setShowAuthModal(false);
        }}
        onAdminLogin={(admin) => {
          onAdminLogin(admin);
          onViewChange('admin');
          setShowAuthModal(false);
        }}
        onAffiliateAccess={() => onViewChange('affiliate')}
      />

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-red-100 mx-auto">
              <ShieldCheck className="h-8 w-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-dark">
              Problème de Connexion
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4 text-center">
              <p className="text-subtext text-sm leading-relaxed">
                Une erreur est survenue lors de la connexion. Veuillez réessayer.
              </p>
              {lastError && (
                <p className="text-[10px] text-subtext/60 font-mono bg-muted p-2 rounded border truncate">
                  Détail: {lastError}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              className="w-full h-12 rounded-xl bg-primary hover:bg-[#D98A1E] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent-light/50 border-0"
              onClick={() => {
                window.open(window.location.href, '_blank');
                setShowLoginErrorDialog(false);
              }}
            >
              <ExternalLink className="h-5 w-5" />
              Ouvrir dans un nouvel onglet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
