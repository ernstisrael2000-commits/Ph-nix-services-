import { 
  Package, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Search, 
  Home, 
  Users, 
  Truck, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Menu,
  ChevronDown,
  User,
  Wallet as WalletIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Client } from '../types';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  loggedClient: Client | null;
  onLogoutClient: () => void;
}

export default function Navbar({ currentView, onViewChange, loggedClient, onLogoutClient }: NavbarProps) {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { total: pendingCount } = usePendingCounts(isAdmin);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      if (loggedClient) {
        onLogoutClient();
      }
      await signOut(auth);
      onViewChange('home');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'tracking', label: 'Suivi', icon: Search },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'affiliate', label: 'Affiliés', icon: Users },
    { id: 'agent', label: 'Agent', icon: User },
  ];

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger
                className="bg-transparent hover:bg-muted/50 p-2 rounded-xl h-10 w-10 flex items-center justify-center md:hidden lg:flex cursor-pointer transition-colors outline-none border-none"
              >
                <Menu className="h-6 w-6 text-primary" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] border-r-0 rounded-r-[2.5rem]">
                <SheetHeader className="pb-8 border-b">
                  <SheetTitle className="text-2xl font-black text-primary">Menu Neopay</SheetTitle>
                </SheetHeader>
                <div className="py-8 space-y-4">
                  {menuItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={currentView === item.id ? 'secondary' : 'ghost'}
                      onClick={() => {
                        onViewChange(item.id);
                      }}
                      className={`w-full justify-start gap-4 h-14 rounded-2xl transition-all ${
                        currentView === item.id ? 'bg-primary/10 text-primary' : 'text-subtext'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-black uppercase tracking-widest text-xs">{item.label}</span>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

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
              <span className="text-xl font-bold tracking-tight text-dark hidden xs:block">Neopay</span>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => onViewChange('affiliate')}
              className="hidden sm:flex items-center gap-2 text-subtext hover:text-primary font-black h-10 px-4 rounded-xl transition-all hover:bg-accent-light/50"
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Affilié</span>
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            {!loggedClient && (
              <div className="hidden md:flex items-center gap-1">
                {menuItems.map((item) => (
                  <Button 
                    key={item.id}
                    variant={currentView === item.id ? 'secondary' : 'ghost'} 
                    onClick={() => onViewChange(item.id)} 
                    className={`flex flex-col items-center justify-center h-14 h-auto py-1 gap-1 px-4 group transition-all duration-300 rounded-xl ${currentView === item.id ? 'bg-accent-light/80 shadow-sm' : 'hover:bg-accent-light/50'}`}
                  >
                    <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${currentView === item.id ? 'text-primary' : 'text-subtext group-hover:text-primary'}`} />
                    <span className={`text-[10px] uppercase tracking-tighter font-semibold transition-colors ${currentView === item.id ? 'text-primary' : 'text-subtext group-hover:text-primary'}`}>{item.label}</span>
                  </Button>
                ))}
              </div>
            )}
            
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

            {loggedClient || user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-bold text-dark truncate max-w-[120px]">
                    {loggedClient ? loggedClient.name : user?.displayName}
                  </span>
                  <span className="text-[10px] text-subtext truncate max-w-[120px]">
                    {loggedClient ? loggedClient.email : user?.email}
                  </span>
                </div>
                {loggedClient?.photoURL || user?.photoURL ? (
                  <img 
                    src={loggedClient?.photoURL || user?.photoURL || ''} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full border border-primary/20 object-cover hidden xs:block"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedClient?.name || user?.displayName || 'User')}`;
                    }}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hidden xs:block">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="px-1 text-subtext group cursor-pointer outline-none border-none bg-transparent hover:bg-muted/50 rounded-md transition-colors">
                    <ChevronDown className="h-4 w-4 group-hover:text-primary transition-colors transition-transform data-[open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-gray-100">
                    {loggedClient && (
                      <DropdownMenuItem 
                        onClick={() => onViewChange('client_wallet')}
                        className="h-10 rounded-xl cursor-pointer gap-3 font-bold text-xs uppercase tracking-widest text-primary"
                      >
                        <WalletIcon className="h-4 w-4" />
                        Mon Wallet
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="h-10 rounded-xl cursor-pointer gap-3 font-bold text-xs uppercase tracking-widest text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="bg-primary hover:bg-[#D98A1E] text-white flex items-center gap-2 rounded-xl h-11 px-4 sm:px-6 font-black tracking-tight shadow-lg shadow-accent-light/40 transition-all hover:shadow-xl active:scale-95 cursor-pointer outline-none border-none"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Accès</span>
                    <ChevronDown className="h-3 w-3 opacity-50 transition-transform data-[open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-gray-100 mt-2">
                    <DropdownMenuItem 
                      onClick={() => onViewChange('client')}
                      className="h-12 rounded-xl cursor-pointer gap-3 font-black text-[10px] uppercase tracking-[0.15em] text-dark hover:bg-accent-light/30"
                    >
                      <User className="h-4 w-4 text-primary" />
                      Client
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onViewChange('affiliate')}
                      className="h-12 rounded-xl cursor-pointer gap-3 font-black text-[10px] uppercase tracking-[0.15em] text-dark hover:bg-accent-light/30"
                    >
                      <Users className="h-4 w-4 text-primary" />
                      Affilié
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onViewChange('agent')}
                      className="h-12 rounded-xl cursor-pointer gap-3 font-black text-[10px] uppercase tracking-[0.15em] text-dark hover:bg-accent-light/30"
                    >
                      <User className="h-4 w-4 text-primary" />
                      Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onViewChange('admin')}
                      className="h-12 rounded-xl cursor-pointer gap-3 font-black text-[10px] uppercase tracking-[0.15em] text-dark hover:bg-accent-light/30"
                    >
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Administrateur
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
