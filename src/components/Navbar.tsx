import { Package, ShieldCheck, LogIn, LogOut, Search, Home, Users, Truck, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { ADMIN_EMAILS } from '../constants';
import { useSettings } from '../services/parcelService';
import { usePendingCounts } from '../services/affiliateService';
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

export default function Navbar({ currentView, onViewChange }: { currentView: string, onViewChange: (view: any) => void }) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingCount } = usePendingCounts(isAdmin);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    
    try {
      // Ensure persistence is set
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;

      // Check if user is admin      
      if (!ADMIN_EMAILS.includes(loggedUser.email || '')) {
        await signOut(auth);
        toast.error("Accès refusé: Vous n'êtes pas administrateur.");
        setIsLoggingIn(false);
        return;
      }

      toast.success("Connexion réussie !");
      setIsLoggingIn(false);
      onViewChange('admin'); // Redirect to admin dashboard
    } catch (error: any) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
      setLastError(error.code || error.message);

      if (error.code === 'auth/popup-closed-by-user') {
        toast.info("Connexion annulée par l'utilisateur.");
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Le popup de connexion a été bloqué par votre navigateur. Veuillez l'autoriser.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Just ignore this one silently or show a small toast, 
        // as it usually means a second click happened.
        console.warn("Popup request cancelled (usually due to multiple clicks)");
      } else if (error.code === 'auth/network-request-failed' || error.message?.includes('INTERNAL ASSERTION FAILED')) {
        setShowLoginErrorDialog(true);
      } else {
        toast.error(`Échec: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onViewChange('home');
    } catch (error) {
      console.error("Logout failed:", error);
    }
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

            {user ? (
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
                  onClick={handleLogin} 
                  disabled={isLoggingIn}
                  className="bg-primary hover:bg-[#D98A1E] text-white flex items-center gap-2"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span className="hidden xs:inline">
                    {isLoggingIn ? 'Connexion...' : 'Connexion'}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-red-100 mx-auto">
              <ShieldCheck className="h-8 w-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-dark">
              Blocage de Sécurité Chrome
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4 text-center">
              <p className="text-subtext text-sm leading-relaxed">
                Google Chrome bloque la connexion car Neopay est actuellement affiché dans un cadre sécurisé.
              </p>
              
              <div className="bg-accent-light p-4 rounded-2xl border border-accent-light/50 text-left space-y-2">
                <p className="text-xs font-bold text-primary">Comment fixer cela :</p>
                <ol className="text-[11px] text-primary list-decimal pl-4 space-y-1">
                  <li>Cliquez sur le bouton bleu ci-dessous.</li>
                  <li>Une nouvelle fenêtre s'ouvrira avec Neopay.</li>
                  <li>Connectez-vous à nouveau dans cette fenêtre.</li>
                </ol>
              </div>

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
              Réparer & Se Connecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
