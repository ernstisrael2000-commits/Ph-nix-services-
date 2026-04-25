import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TrackingView from './components/TrackingView';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import HomeView from './components/HomeView';
import ShippingView from './components/ShippingView';
import AffiliateLogin from './components/AffiliateLogin';
import AffiliateDashboard from './components/AffiliateDashboard';
import { Toaster } from './components/ui/sonner';
import AccessChoice from './components/AccessChoice';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './services/parcelService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, Package, ChevronLeft, Bell, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Affiliate, AdminAccount } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'home' | 'tracking' | 'admin' | 'affiliate' | 'shipping'>('home');
  const [history, setHistory] = useState<('home' | 'tracking' | 'admin' | 'affiliate' | 'shipping')[]>(['home']);
  const [accessChoice, setAccessChoice] = useState<'selection' | 'affiliate' | 'admin' | null>(null);
  const { user, loading, isAdmin: isGoogleAdmin } = useAuth();
  const { settings } = useSettings();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  
  const [loggedAdmin, setLoggedAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem('neopay_admin');
    return saved ? JSON.parse(saved) : null;
  });

  // Automatically sync Google Admin with loggedAdmin
  useEffect(() => {
    if (isGoogleAdmin && user && !loggedAdmin) {
      const gAdmin: AdminAccount = {
        fullName: user.displayName || user.email?.split('@')[0] || 'Admin Google',
        password: '', // Not used for Google login
        permissions: ['all'],
        isSuperAdmin: true, // Treat direct Google admins as super admins or adjust as needed
        uid: user.uid,
        failedAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setLoggedAdmin(gAdmin);
    }
  }, [isGoogleAdmin, user, loggedAdmin]);

  const handleAdminLogin = (admin: AdminAccount) => {
    setLoggedAdmin(admin);
    localStorage.setItem('neopay_admin', JSON.stringify(admin));
  };

  const handleAdminLogout = async () => {
    setLoggedAdmin(null);
    localStorage.removeItem('neopay_admin');
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('./lib/firebase');
    await signOut(auth);
    setView('home');
  };

  // Bootstrap Super Admin
  useEffect(() => {
    const bootstrapAdmin = async () => {
      // Check if Ernst exists
      const { checkAdminLogin, saveAdminAccount } = await import('./services/adminService');
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      
      const q = query(collection(db, 'admin_accounts'), where('fullName', '==', 'Ernst israel'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await saveAdminAccount({
          fullName: 'Ernst israel',
          password: '$Ernst509@$',
          loginCode: 'ER-2026', // Secret code for Ernst
          isSuperAdmin: true,
          permissions: ['all'],
          failedAttempts: 0
        });
        console.log("Super Admin bootstrapped.");
      }
    };
    bootstrapAdmin();
  }, []);
  
  const handleViewChange = (newView: typeof view) => {
    if (newView === view) return;
    setHistory(prev => [...prev, newView]);
    setView(newView);
    setAccessChoice(null); // Reset when switching
  };

  const handleBack = () => {
    setAccessChoice(null); // Clear selection on back
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const prevView = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setView(prevView);
    } else {
      setView('home');
    }
  };

  const [loggedAffiliate, setLoggedAffiliate] = useState<Affiliate | null>(() => {
    const saved = localStorage.getItem('neopay_affiliate');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAffiliateLogin = (affiliate: Affiliate) => {
    setLoggedAffiliate(affiliate);
    localStorage.setItem('neopay_affiliate', JSON.stringify(affiliate));
  };

  const handleAffiliateLogout = () => {
    setLoggedAffiliate(null);
    localStorage.removeItem('neopay_affiliate');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-subtext font-medium">Initialisation de Neopay...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background font-sans selection:bg-accent-light selection:text-dark flex flex-col">
        <Navbar 
          currentView={view}
          onViewChange={handleViewChange}
        />

        <AnimatePresence>
          {settings?.showGlobalAnnouncement && settings?.globalAnnouncement && showAnnouncement && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 p-6 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-white/98 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.35)] border border-primary/20 pointer-events-auto overflow-hidden ring-1 ring-black/10"
              >
                <div className="relative">
                  {/* Glass Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Bell className="h-5 w-5 text-white animate-ring" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-dark tracking-tight leading-none">
                          Annonce Spéciale
                        </h3>
                        <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mt-1">
                          Neopay Intelligence
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowAnnouncement(false)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all active:scale-95 text-gray-400 hover:text-dark border border-gray-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="p-6 sm:p-8 max-h-[40vh] overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="space-y-4">
                      <p className="text-gray-600 font-bold leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                        {settings.globalAnnouncement}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Footer */}
                  <div className="p-6 pt-0 flex justify-center">
                    <Button 
                      onClick={() => setShowAnnouncement(false)}
                      className="w-full h-12 rounded-2xl bg-primary hover:bg-[#D98A1E] text-white font-black text-sm shadow-xl shadow-accent-light/60 border-0 transition-all hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 group"
                    >
                      J'AI COMPRIS
                      <motion.span 
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="ml-2"
                      >
                        →
                      </motion.span>
                    </Button>
                  </div>
                </div>

                {/* Bottom decorative bar */}
                <div className="h-2 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
              </motion.div>

              {/* Backdrop Blur/Dim */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
                onClick={() => setShowAnnouncement(false)}
              />
            </div>
          )}
        </AnimatePresence>
        
        <main className="animate-in fade-in duration-500 pt-20 flex-grow relative">
          {view !== 'home' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="group flex items-center gap-1.5 text-subtext hover:text-primary hover:bg-accent-light/50 rounded-lg transition-all pl-2 pr-3"
              >
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-semibold uppercase tracking-wider">Retour</span>
              </Button>
            </div>
          )}
          
          {view === 'home' && (
            <HomeView onTrackingClick={() => handleViewChange('tracking')} onViewChange={handleViewChange} />
          )}
          
          {view === 'tracking' && (
            <TrackingView />
          )}

          {view === 'shipping' && (
            <ShippingView />
          )}

          {view === 'admin' && (
            loggedAdmin ? (
              <AdminDashboard onLogout={handleAdminLogout} admin={loggedAdmin} />
            ) : (
              <AdminLogin onLoginSuccess={handleAdminLogin} onBack={() => handleViewChange('home')} />
            )
          )}

          {view === 'affiliate' && (
            loggedAffiliate ? (
              <AffiliateDashboard 
                affiliateId={loggedAffiliate.id!} 
                onLogout={handleAffiliateLogout} 
              />
            ) : loggedAdmin ? (
              <AdminDashboard onLogout={handleAdminLogout} admin={loggedAdmin} />
            ) : accessChoice === 'affiliate' ? (
              <AffiliateLogin onLogin={handleAffiliateLogin} />
            ) : accessChoice === 'admin' ? (
              <AdminLogin onLoginSuccess={handleAdminLogin} onBack={() => setAccessChoice(null)} />
            ) : (
              <AccessChoice onChoice={(choice) => setAccessChoice(choice)} />
            )
          )}
        </main>

        <footer className="py-12 border-t mt-auto bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-muted p-1.5 rounded-md">
                <Package className="h-5 w-5 text-subtext" />
              </div>
              <span className="text-xl font-bold text-dark">Neopay</span>
            </div>
            <p className="text-subtext text-sm">
              © {new Date().getFullYear()} Neopay Logistics. Tous droits réservés.
            </p>
            <div className="flex justify-center gap-6 mt-6 text-sm text-subtext/60">
              <a href="#" className="hover:text-subtext transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-subtext transition-colors">Conditions d'utilisation</a>
              <a href="mailto:neopayservices509@gmail.com" className="hover:text-subtext transition-colors">Support</a>
            </div>
          </div>
        </footer>

        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

