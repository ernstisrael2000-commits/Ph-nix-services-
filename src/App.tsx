import { useState } from 'react';
import Navbar from './components/Navbar';
import TrackingView from './components/TrackingView';
import AdminDashboard from './components/AdminDashboard';
import HomeView from './components/HomeView';
import AffiliateLogin from './components/AffiliateLogin';
import AdminLogin from './components/AdminLogin';
import AffiliateDashboard from './components/AffiliateDashboard';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, ShieldAlert, Package } from 'lucide-react';
import { Affiliate } from './types';

export default function App() {
  const [view, setView] = useState<'home' | 'tracking' | 'admin' | 'affiliate'>('home');
  const { isAdmin, loading } = useAuth();
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
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Initialisation de Neopay...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Navbar 
          currentView={view}
          onViewChange={setView}
        />
        
        <main className="animate-in fade-in duration-500 pt-16">
          {view === 'home' && (
            <HomeView onTrackingClick={() => setView('tracking')} />
          )}
          
          {view === 'tracking' && (
            <TrackingView />
          )}

          {view === 'admin' && (
            isAdmin ? (
              <AdminDashboard />
            ) : (
              <AdminLogin />
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
              <div className="bg-gray-200 p-1.5 rounded-md">
                <Package className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">Neopay</span>
            </div>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Neopay Logistics. Tous droits réservés.
            </p>
            <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
              <a href="#" className="hover:text-gray-600 transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Conditions d'utilisation</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
            </div>
          </div>
        </footer>

        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

