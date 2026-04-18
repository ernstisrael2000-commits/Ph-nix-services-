import { Package, ShieldCheck, LogIn, LogOut, Search, Home, Users, Truck, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../services/parcelService';
import { usePendingCounts } from '../services/affiliateService';
import { toast } from 'sonner';

export default function Navbar({ currentView, onViewChange }: { currentView: string, onViewChange: (view: any) => void }) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingCount } = usePendingCounts(isAdmin);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Connexion réussie !");
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("La fenêtre de connexion a été fermée.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domaine non autorisé. Veuillez ajouter l'URL de l'application aux domaines autorisés dans la console Firebase.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Erreur réseau. Si vous utilisez Chrome, essayez d'ouvrir l'application dans un nouvel onglet.");
      } else {
        toast.error(`Échec de la connexion: ${error.message || 'Erreur inconnue'}`);
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
              <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
                <Package className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 hidden xs:block">Neopay</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <Button 
              variant={currentView === 'home' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('home')} 
              className="hidden md:flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Button>
            <Button 
              variant={currentView === 'tracking' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('tracking')} 
              className="flex items-center gap-2 px-2 sm:px-4"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Suivi</span>
            </Button>

            <Button 
              variant={currentView === 'shipping' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('shipping')} 
              className="flex items-center gap-2 px-2 sm:px-4"
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Shipping</span>
            </Button>

            <Button 
              variant={currentView === 'affiliate' ? 'secondary' : 'ghost'} 
              onClick={() => onViewChange('affiliate')} 
              className="flex items-center gap-2 px-2 sm:px-4"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Affiliés</span>
            </Button>
            
            {isAdmin && (
              <Button 
                variant={currentView === 'admin' ? 'secondary' : 'outline'} 
                onClick={() => onViewChange('admin')} 
                className="flex items-center gap-2 border-blue-200 hover:bg-blue-50 text-blue-700 px-2 sm:px-4 relative"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{user.displayName}</span>
                  <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.email}</span>
                </div>
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || ''} 
                  className="h-8 w-8 rounded-full border hidden xs:block"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`;
                  }}
                />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex text-gray-400 hover:text-blue-600"
                  onClick={() => window.open(window.location.href, '_blank')}
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden xs:inline">Connexion</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
