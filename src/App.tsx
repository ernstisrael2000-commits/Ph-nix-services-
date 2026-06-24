import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import { Toaster } from './components/ui/sonner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './services/parcelService';
import { useFCM } from './hooks/useFCM';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Bell, X, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { AdminAccount, Client } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { toast } from 'sonner';

// ── Lazy-loaded heavy views ────────────────────────────────────────────────────
const TrackingView       = lazy(() => import('./components/TrackingView'));
const ServicesView       = lazy(() => import('./components/ServicesView'));
const AdminDashboard     = lazy(() => import('./components/AdminDashboard'));
const AdminLogin         = lazy(() => import('./components/AdminLogin'));
const ClientDashboard    = lazy(() => import('./components/ClientDashboard'));
const WalletPage         = lazy(() => import('./components/WalletPage'));
const PaymentSuccessView    = lazy(() => import('./components/PaymentSuccessView'));
const PaymentSuccessPage    = lazy(() => import('./components/PaymentSuccessPage'));
const SafacilPaySuccessView = lazy(() => import('./components/SafacilPaySuccessView'));
const UserAuthModal      = lazy(() => import('./components/UserAuthModal'));
const FormationsView     = lazy(() => import('./components/FormationsView'));
const FormationsNavbar   = lazy(() => import('./components/FormationsNavbar'));
const ReseauxView        = lazy(() => import('./components/ReseauxView'));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

type ViewType = 'tracking' | 'services' | 'admin' | 'wallet' | 'formations' | 'promotion';

export default function App() {
  const [view, setView] = useState<ViewType>('services');
  const { loading } = useAuth();
  const { settings } = useSettings();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showClientDashboard, setShowClientDashboard] = useState(false);
  const [walletInitialAction, setWalletInitialAction] = useState<'deposit' | 'withdrawal' | undefined>(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [moncashReturnRef, setMoncashReturnRef]       = useState<string | null>(null);
  const [safacilReturnRef, setSafacilReturnRef]       = useState<string | null>(null);
  const [safacilTransactionId, setSafacilTransactionId] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(() =>
    window.location.pathname === '/payment-success'
  );

  const [formationsTab, setFormationsTab] = useState<'all' | 'my'>('all');
  const [formationsSearch, setFormationsSearch] = useState('');
  const [formationsPlayerActive, setFormationsPlayerActive] = useState(false);
  const [showFormationsAuth, setShowFormationsAuth] = useState(false);

  const [loggedAdmin, setLoggedAdmin] = useState<AdminAccount | null>(() => {
    try { const s = localStorage.getItem('rena_admin'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const handleAdminLogin = (admin: AdminAccount) => {
    setLoggedAdmin(admin);
    localStorage.setItem('rena_admin', JSON.stringify(admin));
  };

  const handleAdminLogout = () => {
    setLoggedAdmin(null);
    localStorage.removeItem('rena_admin');
    setView('tracking');
  };

  // Offline detection via browser network events (no Firestore round-trip)
  useEffect(() => {
    const showOffline = () => toast.error("Connexion perdue. Rena fonctionne en mode hors-ligne.", {
      description: "Certaines fonctionnalités peuvent être limitées.",
      duration: Infinity,
      icon: <WifiOff className="h-4 w-4" />,
      id: 'offline-toast',
    });
    const hideOffline = () => toast.dismiss('offline-toast');
    if (!navigator.onLine) showOffline();
    window.addEventListener('offline', showOffline);
    window.addEventListener('online', hideOffline);
    return () => {
      window.removeEventListener('offline', showOffline);
      window.removeEventListener('online', hideOffline);
    };
  }, []);

  // Detect MonCash / SafacilPay return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const moncashRef  = params.get('moncash_ref');
    const safacilRef  = params.get('safacilpay_ref');
    if (moncashRef) {
      setMoncashReturnRef(moncashRef);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (safacilRef) {
      // SafacilPay appends ?transactionId=XXXXX to the return URL on success
      const txId = params.get('transactionId') || '';
      setSafacilReturnRef(safacilRef);
      if (txId) setSafacilTransactionId(txId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (window.location.pathname === '/payment-success') {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Bootstrap Super Admin (fire-and-forget, non-blocking)
  useEffect(() => {
    fetch('/api/admin/bootstrap', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.bootstrapped) console.log('[Bootstrap] Super Admin créé.'); })
      .catch(e => console.warn('[Bootstrap] Non critique:', e.message));
  }, []);

  const handleViewChange = (newView: ViewType) => {
    if (newView === view) return;
    setView(newView);
  };

  const [loggedClient, setLoggedClient] = useState<Client | null>(() => {
    try { const s = localStorage.getItem('rena_client'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  useFCM(loggedClient?.id || null);

  const handleClientLogin = (client: Client) => {
    setLoggedClient(client);
    localStorage.setItem('rena_client', JSON.stringify(client));
  };

  const handleClientLogout = () => {
    setLoggedClient(null);
    localStorage.removeItem('rena_client');
    setShowClientDashboard(false);
  };

  // Sync loggedClient with Firestore in real-time
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

  if (loading) return <LoadingScreen />;

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
          loggedAdmin={loggedAdmin}
          onAdminLogin={(admin) => {
            handleAdminLogin(admin);
            handleViewChange('admin');
          }}
        />

        {/* Global announcement popup */}
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
                        <h3 className="text-base font-black text-dark tracking-tight leading-none">Annonce Spéciale</h3>
                        <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mt-1">Phénix Services</p>
                      </div>
                    </div>
                    <button onClick={() => setShowAnnouncement(false)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all active:scale-95 text-gray-400 hover:text-dark border border-gray-100">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6 sm:p-8 max-h-[40vh] overflow-y-auto no-scrollbar scroll-smooth">
                    <p className="text-gray-600 font-bold leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {settings.globalAnnouncement}
                    </p>
                  </div>
                  <div className="p-6 pt-0 flex justify-center">
                    <Button onClick={() => setShowAnnouncement(false)}
                      className="w-full h-12 rounded-2xl bg-primary hover:bg-[#1D4ED8] text-white font-black text-sm shadow-xl shadow-accent-light/60 border-0 transition-all">
                      J'AI COMPRIS
                      <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="ml-2">→</motion.span>
                    </Button>
                  </div>
                </div>
                <div className="h-2 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
                onClick={() => setShowAnnouncement(false)} />
            </div>
          )}
        </AnimatePresence>

        {view !== 'admin' && view !== 'promotion' && (
          <BottomNav
            currentView={view}
            onViewChange={(v) => {
              if (v === 'wallet' && !loggedClient) { setShowAuthModal(true); return; }
              handleViewChange(v as ViewType);
            }}
            loggedClient={loggedClient}
            onOpenWallet={() => {
              if (!loggedClient) { setShowAuthModal(true); return; }
              handleViewChange('wallet');
            }}
            onOpenWalletDeposit={() => {
              if (!loggedClient) { setShowAuthModal(true); return; }
              handleViewChange('wallet');
            }}
            onOpenWalletWithdrawal={() => {
              if (!loggedClient) { setShowAuthModal(true); return; }
              handleViewChange('wallet');
            }}
            onRequestAuth={() => setShowAuthModal(true)}
          />
        )}

        <main className={`animate-in fade-in duration-300 ${view !== 'wallet' ? 'pt-14' : ''} flex-grow relative ${view !== 'admin' && view !== 'wallet' && view !== 'promotion' ? 'pb-[74px]' : ''}`}>
          <Suspense fallback={<PageSpinner />}>
            {view === 'tracking' && (
              <TrackingView
                loggedClient={loggedClient}
                onRequestAuth={() => setShowAuthModal(true)}
                onOpenWalletDeposit={() => {
                  if (!loggedClient) { setShowAuthModal(true); return; }
                  handleViewChange('wallet');
                }}
              />
            )}

            {view === 'services' && (
              <ServicesView
                loggedClient={loggedClient}
                onOpenWallet={() => {
                  if (!loggedClient) { setShowAuthModal(true); return; }
                  handleViewChange('wallet');
                }}
                onRequestAuth={() => setShowAuthModal(true)}
              />
            )}

            {view === 'wallet' && loggedClient && (
              <WalletPage
                clientId={loggedClient.id!}
                initialClient={loggedClient}
                onLogout={handleClientLogout}
                onBack={() => handleViewChange('services')}
              />
            )}

            {view === 'promotion' && (
              <ReseauxView
                loggedClient={loggedClient}
                onRequestAuth={() => setShowAuthModal(true)}
                onOpenWallet={() => {
                  if (!loggedClient) { setShowAuthModal(true); return; }
                  handleViewChange('wallet');
                }}
                onBack={() => handleViewChange('services')}
                onClientLogin={handleClientLogin}
              />
            )}

            {view === 'formations' && (
              <FormationsView
                loggedClient={loggedClient}
                onOpenWallet={() => setShowClientDashboard(true)}
                onClientLogin={(client) => { handleClientLogin(client); setShowFormationsAuth(false); }}
                activeTab={formationsTab}
                onTabChange={setFormationsTab}
                searchQuery={formationsSearch}
                onSearchChange={setFormationsSearch}
                onPlayerChange={setFormationsPlayerActive}
              />
            )}

            {view === 'admin' && (
              loggedAdmin
                ? <AdminDashboard onLogout={handleAdminLogout} admin={loggedAdmin} />
                : <AdminLogin onLoginSuccess={handleAdminLogin} onBack={() => handleViewChange('tracking')} />
            )}
          </Suspense>
        </main>

        {view !== 'admin' && view !== 'formations' && view !== 'tracking' && view !== 'promotion' && (
          <footer className="py-12 border-t mt-auto bg-white pb-24">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src="/phenix-logo.png" alt="Phénix Services" className="h-10 w-10 object-contain" />
                <span className="text-xl font-bold text-dark">Phénix Services</span>
              </div>
              <p className="text-subtext text-sm">© {new Date().getFullYear()} Phénix Services. Tous droits réservés.</p>
              <div className="flex justify-center gap-6 mt-6 text-sm text-subtext/60">
                <a href="#" className="hover:text-subtext transition-colors">Confidentialité</a>
                <a href="#" className="hover:text-subtext transition-colors">Conditions d'utilisation</a>
                <a href="mailto:renaservices@gmail.com" className="hover:text-subtext transition-colors">Support</a>
              </div>
            </div>
          </footer>
        )}

        <Toaster position="top-right" />

        <Suspense fallback={null}>
          <AnimatePresence>
            {showClientDashboard && loggedClient && (
              <ClientDashboard
                clientId={loggedClient.id!}
                onLogout={handleClientLogout}
                open={showClientDashboard}
                onClose={() => { setShowClientDashboard(false); setWalletInitialAction(undefined); }}
                initialAction={walletInitialAction}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {moncashReturnRef && (
              <PaymentSuccessView
                referenceId={moncashReturnRef}
                onClose={() => { setMoncashReturnRef(null); setShowClientDashboard(true); }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {safacilReturnRef && (
              <SafacilPaySuccessView
                referenceId={safacilReturnRef}
                transactionId={safacilTransactionId || undefined}
                onClose={() => { setSafacilReturnRef(null); setSafacilTransactionId(null); setShowClientDashboard(true); }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPaymentSuccess && (
              <PaymentSuccessPage
                onClose={() => { setShowPaymentSuccess(false); setShowClientDashboard(true); }}
              />
            )}
          </AnimatePresence>

          <UserAuthModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onClientLogin={(client) => { handleClientLogin(client); setShowAuthModal(false); }}
            onAdminLogin={(admin) => { handleAdminLogin(admin); handleViewChange('admin'); setShowAuthModal(false); }}
            onAffiliateAccess={() => {}}
            onAdminPasswordLogin={() => { handleViewChange('admin'); setShowAuthModal(false); }}
          />
        </Suspense>

        <PWAInstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
