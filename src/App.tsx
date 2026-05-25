import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import TrackingView from './components/TrackingView';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import HomeView from './components/HomeView';
import ShippingView from './components/ShippingView';
import FormationsView from './components/FormationsView';
import ProductsView from './components/ProductsView';
import ServicesView from './components/ServicesView';
import AffiliateLogin from './components/AffiliateLogin';
import AffiliateDashboard from './components/AffiliateDashboard';
import AgentLogin from './components/AgentLogin';
import AgentDashboard from './components/AgentDashboard';
import ClientDashboard from './components/ClientDashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import { Toaster } from './components/ui/sonner';
import AccessChoice from './components/AccessChoice';
import UserAuthModal from './components/UserAuthModal';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './services/parcelService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Package, ChevronLeft, Bell, X, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { Affiliate, AdminAccount, Agent, Client } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { toast } from 'sonner';

export default function App() {
  const [view, setView] = useState<'home' | 'tracking' | 'admin' | 'affiliate' | 'shipping' | 'agent' | 'formations' | 'products' | 'services'>('home');
  const [history, setHistory] = useState<('home' | 'tracking' | 'admin' | 'affiliate' | 'shipping' | 'agent' | 'formations' | 'products' | 'services')[]>(['home']);
  const [formationsTab, setFormationsTab] = useState<'all' | 'my'>('all');
  const [accessChoice, setAccessChoice] = useState<'selection' | 'affiliate' | 'admin' | 'agent' | null>(null);
  const { loading } = useAuth();
  const { settings } = useSettings();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showClientDashboard, setShowClientDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [loggedAdmin, setLoggedAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem('rena_admin');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAdminLogin = (admin: AdminAccount) => {
    setLoggedAdmin(admin);
    localStorage.setItem('rena_admin', JSON.stringify(admin));
  };

  const handleAdminLogout = () => {
    setLoggedAdmin(null);
    localStorage.removeItem('rena_admin');
    setView('home');
  };

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        setIsOffline(false);
      } catch (error: any) {
        if (error?.message?.includes('offline') || error?.code === 'unavailable') {
          setIsOffline(true);
          toast.error("Connexion perdue. Rena fonctionne en mode hors-ligne.", {
            description: "Certaines fonctionnalités peuvent être limitées.",
            duration: Infinity,
            icon: <WifiOff className="h-4 w-4" />,
            id: 'offline-toast'
          });
        }
      }
    };
    testConnection();
  }, []);

  // Bootstrap Super Admin via API (idempotent — creates only if no admin exists)
  useEffect(() => {
    fetch('/api/admin/bootstrap', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.bootstrapped) console.log('[Bootstrap] Super Admin créé.'); })
      .catch(e => console.warn('[Bootstrap] Non critique:', e.message));
  }, []);
  
  const handleViewChange = (newView: typeof view) => {
    if (newView === view) return;
    setHistory(prev => [...prev, newView]);
    setView(newView);
    setAccessChoice(null);
  };

  const handleBack = () => {
    setAccessChoice(null);
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevView = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setView(prevView);
    } else {
      setView('home');
    }
  };

  const [loggedAffiliate, setLoggedAffiliate] = useState<Affiliate | null>(() => {
    const saved = localStorage.getItem('rena_affiliate');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAffiliateLogin = (affiliate: Affiliate) => {
    setLoggedAffiliate(affiliate);
    localStorage.setItem('rena_affiliate', JSON.stringify(affiliate));
  };

  const handleAffiliateLogout = () => {
    setLoggedAffiliate(null);
    localStorage.removeItem('rena_affiliate');
  };

  const [loggedAgent, setLoggedAgent] = useState<Agent | null>(() => {
    const saved = localStorage.getItem('rena_agent');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAgentLogin = (agent: Agent) => {
    setLoggedAgent(agent);
    localStorage.setItem('rena_agent', JSON.stringify(agent));
  };

  const handleAgentLogout = () => {
    setLoggedAgent(null);
    localStorage.removeItem('rena_agent');
  };

  const [loggedClient, setLoggedClient] = useState<Client | null>(() => {
    const saved = localStorage.getItem('rena_client');
    return saved ? JSON.parse(saved) : null;
  });

  const handleClientLogin = (client: Client) => {
    setLoggedClient(client);
    localStorage.setItem('rena_client', JSON.stringify(client));
  };

  const handleClientLogout = () => {
    setLoggedClient(null);
    localStorage.removeItem('rena_client');
    setShowClientDashboard(false);
  };

  // Sync loggedClient with Firestore in real-time so balance stays up-to-date
  const clientUnsub = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (clientUnsub.current) { clientUnsub.current(); clientUnsub.current = null; }
    if (!loggedClient?.id) return;
    clientUnsub.current = onSnapshot(doc(db, 'clients', loggedClient.id), (snap) => {
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() } as Client;
        setLoggedClient(updated);
        localStorage.setItem('rena_client', JSON.stringify(updated));
      }
    });
    return () => { if (clientUnsub.current) clientUnsub.current(); };
  }, [loggedClient?.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background font-sans selection:bg-accent-light selection:text-dark flex flex-col">
        <Navbar 
          currentView={view}
          onViewChange={handleViewChange}
          loggedClient={loggedClient}
          onClientLogin={handleClientLogin}
          onClientLogout={handleClientLogout}
          onOpenWallet={() => setShowClientDashboard(true)}
          onAdminLogin={(admin) => {
            handleAdminLogin(admin);
            handleViewChange('admin');
          }}
          formationsTab={formationsTab}
          onFormationsTabChange={setFormationsTab}
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
                          Rena Intelligence
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

                  <div className="p-6 sm:p-8 max-h-[40vh] overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="space-y-4">
                      <p className="text-gray-600 font-bold leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                        {settings.globalAnnouncement}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 pt-0 flex justify-center">
                    <Button 
                      onClick={() => setShowAnnouncement(false)}
                      className="w-full h-12 rounded-2xl bg-primary hover:bg-[#1D4ED8] text-white font-black text-sm shadow-xl shadow-accent-light/60 border-0 transition-all hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 group"
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

                <div className="h-2 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
              </motion.div>

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
        
        {/* ── Bottom Nav — hidden on dashboard views ── */}
        {!['admin', 'affiliate', 'agent'].includes(view) && (
          <BottomNav
            currentView={view}
            onViewChange={handleViewChange}
            loggedClient={loggedClient}
            onOpenWallet={() => setShowClientDashboard(true)}
            onRequestAuth={() => setShowAuthModal(true)}
          />
        )}

        <main className={`animate-in fade-in duration-500 pt-14 flex-grow relative ${!['admin', 'affiliate', 'agent'].includes(view) ? 'pb-[74px]' : ''}`}>
          {/* Back button only for utility views (tracking, shipping) */}
          {['tracking', 'shipping'].includes(view) && (
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
            <HomeView 
              onTrackingClick={() => handleViewChange('tracking')} 
              onViewChange={handleViewChange}
              loggedClient={loggedClient}
              onOpenWallet={() => setShowClientDashboard(true)}
            />
          )}

          {view === 'products' && (
            <ProductsView
              loggedClient={loggedClient}
              onOpenWallet={() => setShowClientDashboard(true)}
              onViewChange={handleViewChange}
            />
          )}

          {view === 'services' && (
            <ServicesView
              onTrackingClick={() => handleViewChange('tracking')}
              onViewChange={handleViewChange}
            />
          )}
          
          {view === 'tracking' && (
            <TrackingView />
          )}

          {view === 'shipping' && (
            <ShippingView />
          )}

          {view === 'formations' && (
            <FormationsView
              loggedClient={loggedClient}
              onOpenWallet={() => setShowClientDashboard(true)}
              activeTab={formationsTab}
              onTabChange={setFormationsTab}
            />
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
            ) : loggedAgent ? (
              <AgentDashboard 
                agentUid={loggedAgent.id!} 
                onLogout={handleAgentLogout} 
              />
            ) : loggedAdmin ? (
              <AdminDashboard onLogout={handleAdminLogout} admin={loggedAdmin} />
            ) : accessChoice === 'affiliate' ? (
              <AffiliateLogin onLogin={handleAffiliateLogin} />
            ) : accessChoice === 'agent' ? (
              <AgentLogin onLogin={handleAgentLogin} />
            ) : accessChoice === 'admin' ? (
              <AdminLogin onLoginSuccess={handleAdminLogin} onBack={() => setAccessChoice(null)} />
            ) : (
              <AccessChoice onChoice={(choice) => setAccessChoice(choice)} />
            )
          )}

          {view === 'agent' && (
            loggedAgent ? (
              <AgentDashboard 
                agentUid={loggedAgent.id!} 
                onLogout={handleAgentLogout} 
              />
            ) : (
              <AgentLogin onLogin={handleAgentLogin} />
            )
          )}

        </main>

        {/* Footer — only on non-dashboard views */}
        {!['admin', 'affiliate', 'agent'].includes(view) && (
          <footer className="py-12 border-t mt-auto bg-white pb-24">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="bg-muted p-1.5 rounded-md">
                  <Package className="h-5 w-5 text-subtext" />
                </div>
                <span className="text-xl font-bold text-dark">Rena</span>
              </div>
              <p className="text-subtext text-sm">
                © {new Date().getFullYear()} Rena Logistics. Tous droits réservés.
              </p>
              <div className="flex justify-center gap-6 mt-6 text-sm text-subtext/60">
                <a href="#" className="hover:text-subtext transition-colors">Confidentialité</a>
                <a href="#" className="hover:text-subtext transition-colors">Conditions d'utilisation</a>
                <a href="mailto:renaservices509@gmail.com" className="hover:text-subtext transition-colors">Support</a>
              </div>
            </div>
          </footer>
        )}

        <Toaster position="top-right" />

        {/* Client Wallet Dashboard Overlay */}
        <AnimatePresence>
          {showClientDashboard && loggedClient && (
            <ClientDashboard
              clientId={loggedClient.id!}
              onLogout={handleClientLogout}
              open={showClientDashboard}
              onClose={() => setShowClientDashboard(false)}
            />
          )}
        </AnimatePresence>

        {/* Auth modal triggered from BottomNav Wallet tab */}
        <UserAuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          onClientLogin={(client) => { handleClientLogin(client); setShowAuthModal(false); }}
          onAdminLogin={(admin) => { handleAdminLogin(admin); handleViewChange('admin'); setShowAuthModal(false); }}
          onAffiliateAccess={() => handleViewChange('affiliate')}
          onAdminPasswordLogin={() => { handleViewChange('admin'); setShowAuthModal(false); }}
        />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
