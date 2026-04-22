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
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, Package, ChevronLeft } from 'lucide-react';
import { Button } from './components/ui/button';
import { Affiliate, AdminAccount } from './types';

export default function App() {
  const [view, setView] = useState<'home' | 'tracking' | 'admin' | 'affiliate' | 'shipping'>('home');
  const [history, setHistory] = useState<('home' | 'tracking' | 'admin' | 'affiliate' | 'shipping')[]>(['home']);
  const { loading } = useAuth();
  
  const [loggedAdmin, setLoggedAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem('neopay_admin');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAdminLogin = (admin: AdminAccount) => {
    setLoggedAdmin(admin);
    localStorage.setItem('neopay_admin', JSON.stringify(admin));
  };

  const handleAdminLogout = () => {
    setLoggedAdmin(null);
    localStorage.removeItem('neopay_admin');
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
  };

  const handleBack = () => {
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
              <AdminLogin onLogin={handleAdminLogin} />
            )
          )}

          {view === 'affiliate' && (
            loggedAffiliate ? (
              <AffiliateDashboard 
                affiliateId={loggedAffiliate.id!} 
                onLogout={handleAffiliateLogout} 
              />
            ) : (
              <AffiliateLogin onLogin={handleAffiliateLogin} />
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

