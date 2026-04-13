import { Package, ShieldCheck, LogIn, LogOut, Search, Home, Users, User as UserIcon, Key, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../services/parcelService';
import { usePendingCounts } from '../services/affiliateService';
import { loginAdmin } from '../services/adminAuthService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Navbar({ currentView, onViewChange }: { currentView: string, onViewChange: (view: any) => void }) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingCount } = usePendingCounts();
  
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsLoginDialogOpen(false);
      toast.success("Connexion réussie !");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Échec de la connexion Google");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginAdmin(adminUsername, adminPassword);
      setIsLoginDialogOpen(false);
      setAdminUsername('');
      setAdminPassword('');
      toast.success("Connexion administrateur réussie !");
    } catch (error: any) {
      toast.error(error.message || "Identifiants invalides");
    } finally {
      setIsLoggingIn(false);
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
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
                  alt={user.displayName || ''} 
                  className="h-8 w-8 rounded-full border hidden xs:block"
                />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogTrigger render={
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden xs:inline">Connexion</span>
                  </Button>
                } />
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Connexion</DialogTitle>
                    <DialogDescription>
                      Connectez-vous à votre compte Neopay.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-3 h-12"
                      onClick={handleGoogleLogin}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continuer avec Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Ou Admin Username</span>
                      </div>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Nom d'utilisateur</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            id="username" 
                            placeholder="admin_user" 
                            className="pl-10"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            id="password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                        Connexion Admin
                      </Button>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
