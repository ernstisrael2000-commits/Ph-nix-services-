import { useState } from 'react';
import Navbar from './components/Navbar';
import TrackingView from './components/TrackingView';
import AdminDashboard from './components/AdminDashboard';
import HomeView from './components/HomeView';
import ShippingView from './components/ShippingView';
import AffiliateLogin from './components/AffiliateLogin';
import AffiliateDashboard from './components/AffiliateDashboard';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, ShieldAlert, Package, ChevronLeft } from 'lucide-react';
import { Button } from './components/ui/button';
import { Affiliate } from './types';

export default function App() {
  const [view, setView] = useState<'home' | 'tracking' | 'admin' | 'affiliate' | 'shipping'>('home');
  const [history, setHistory] = useState<('home' | 'tracking' | 'admin' | 'affiliate' | 'shipping')[]>(['home']);
  const { isAdmin, loading } = useAuth();
  
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
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Initialisation de Neopay...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
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
                className="group flex items-center gap-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all pl-2 pr-3"
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
            isAdmin ? (
              <AdminDashboard />
            ) : (
              <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in duration-300">
                <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-100">
                  <ShieldAlert className="h-10 w-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3 text-center">Accès Administrateur</h2>
                <p className="text-gray-600 mb-8 text-sm leading-relaxed text-center">
                  Cette section est réservée à l'administrateur. Si vous êtes Ernst, connectez-vous avec votre compte Google.
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-left">
                    <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2">
                      <Loader2 className="h-3 w-3" />
                      Problème de connexion ?
                    </p>
                    <p className="text-[11px] text-blue-600 leading-tight">
                      Si vous utilisez Google Chrome, la connexion peut être bloquée par l'aperçu. 
                      Cliquez sur le bouton ci-dessous pour régler le problème.
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 font-bold"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    Ouvrir Neopay dans un nouvel onglet
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={handleBack}
                    className="w-full text-gray-500 text-xs hover:bg-transparent hover:text-gray-800"
                  >
                    Retour
                  </Button>
                </div>
              </div>
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

