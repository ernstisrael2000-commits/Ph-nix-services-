import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Users, Star, Clock, Play, Award,
  CheckCircle2, X, Wallet, Loader2, BookOpen, Lock,
  ChevronRight, ChevronLeft, TrendingUp, Zap, Globe, Tag, User,
  FileText, Layers, BadgeCheck, Percent, MessageSquare,
  ChevronDown, ChevronUp, Video, Download, ExternalLink,
  Smartphone, CreditCard, Send, AlertCircle, Search,
  Heart, Trophy, BarChart3, Sparkles, Filter, Grid,
  BookMarked, ArrowRight, Shield, LogIn,
  Cpu, ShoppingBag, Palette, Briefcase
} from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import CoursePlayer from './CoursePlayer';
import { Button } from './ui/button';
import { Formation, FormationModule, FormationChapter } from '../types';
import { Client } from '../types';
import { toast } from 'sonner';
import { useSettings } from '../services/parcelService';
import { loginClientWithGoogle } from '../services/clientService';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FormationsViewProps {
  loggedClient: Client | null;
  onOpenWallet: () => void;
  onClientLogin?: (client: Client) => void;
  activeTab: 'all' | 'my';
  onTabChange: (tab: 'all' | 'my') => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onPlayerChange?: (active: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const levelLabels: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
};
const levelColors: Record<string, string> = {
  debutant: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  intermediaire: 'bg-violet-100 text-violet-700 border-violet-200',
  avance: 'bg-rose-100 text-rose-700 border-rose-200',
};
const levelGradients: Record<string, string> = {
  debutant: 'from-emerald-500 to-teal-600',
  intermediaire: 'from-violet-500 to-purple-700',
  avance: 'from-rose-500 to-pink-700',
};

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'xs' }) {
  const s = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${s} ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-semibold">{rating > 0 ? rating.toFixed(1) : '—'}</span>
    </div>
  );
}

function ProgressBar({ pct, color = 'bg-violet-600' }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem('rena_favorites') || '[]'); } catch { return []; }
}
function setFavorites(ids: string[]) {
  try { localStorage.setItem('rena_favorites', JSON.stringify(ids)); } catch {}
}

type PaymentStep = 'detail' | 'external-method' | 'form' | 'done';

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FormationsView({ loggedClient, onOpenWallet, onClientLogin, activeTab, onTabChange, searchQuery: externalSearch, onSearchChange, onPlayerChange }: FormationsViewProps) {
  const { settings } = useSettings();

  // Data
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [selected, setSelected] = useState<Formation | null>(null);
  const [playerFormation, setPlayerFormation] = useState<Formation | null>(null);

  // Filters
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sync external search from FormationsNavbar
  useEffect(() => {
    if (externalSearch !== undefined) setSearchQuery(externalSearch);
  }, [externalSearch]);

  // Ownership & progress
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Favorites
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

  // Purchase flow
  const [purchasing, setPurchasing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('detail');
  const [selectedPayMethod, setSelectedPayMethod] = useState<'moncash' | 'natcash' | null>(null);
  const [payFormData, setPayFormData] = useState({ name: '', email: '', transactionCode: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // ── Load formations ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/formations');
        if (!res.ok) throw new Error('api_fail');
        const data = await res.json();
        if (!Array.isArray(data.formations)) throw new Error('api_fail');
        setFormations(data.formations);
      } catch {
        try {
          const q = query(collection(db, 'formations'), where('published', '==', true), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          setFormations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Formation)));
        } catch { toast.error('Impossible de charger les formations.'); }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Load purchases ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedClient?.id) return;
    fetch(`/api/formations/purchases/user/${loggedClient.id}`)
      .then(r => r.json())
      .then(data => {
        const active = (data.purchases || []).filter((p: any) => p.status === 'active').map((p: any) => p.formationId);
        setPurchasedIds(active);
      }).catch(() => {});
  }, [loggedClient?.id]);

  // ── Load progress for owned courses ────────────────────────────────────────
  useEffect(() => {
    if (!loggedClient?.id || purchasedIds.length === 0) return;
    fetch(`/api/formations/progress/${loggedClient.id}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, number> = {};
        (data.progress || []).forEach((p: any) => { if (p.formationId) map[p.formationId] = p.percentage || 0; });
        setProgressMap(map);
      }).catch(() => {});
  }, [loggedClient?.id, purchasedIds.length]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isOwned = (f: Formation) => !!f.id && purchasedIds.includes(f.id);
  const isFav = (f: Formation) => !!f.id && favorites.includes(f.id);
  const discount = (f: Formation) => f.originalPrice && f.originalPrice > f.price ? Math.round((1 - f.price / f.originalPrice) * 100) : 0;

  const categories = ['all', ...Array.from(new Set(formations.map(f => f.category).filter(Boolean) as string[]))];
  const filtered = formations.filter(f => {
    const matchLevel = filterLevel === 'all' || f.level === filterLevel;
    const matchCat = filterCategory === 'all' || f.category === filterCategory;
    const matchSearch = !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase()) || (f.instructor || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchCat && matchSearch;
  });
  const myCourses = formations.filter(f => f.id && purchasedIds.includes(f.id));
  const freeCourses = formations.filter(f => f.price === 0);
  const popularCourses = [...formations].sort((a, b) => (b.studentsCount || 0) - (a.studentsCount || 0)).slice(0, 6);
  const newCourses = formations.slice(0, 6);
  const moncashNumber = settings?.moncashNumber || '—';
  const natcashNumber = settings?.natcashNumber || '—';

  // ── Favorites toggle ────────────────────────────────────────────────────────
  const toggleFavorite = (f: Formation, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = f.id!;
    const newFavs = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavoritesState(newFavs);
    setFavorites(newFavs);
  };

  // ── Login prompt ─────────────────────────────────────────────────────────────
  const [pendingFormation, setPendingFormation] = useState<Formation | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setShowLoginPrompt(false);
    await new Promise(r => setTimeout(r, 120));
    setGoogleLoading(true);
    try {
      const result = await loginClientWithGoogle();
      if ((result as any).noAccount) {
        toast.error('Aucun compte trouvé. Créez un compte via le Wallet.');
        onOpenWallet();
        return;
      }
      if ((result as any).client) {
        onClientLogin?.((result as any).client);
        toast.success('Connexion réussie !');
        setTimeout(() => {
          if (pendingFormation) { openDetail(pendingFormation); setPendingFormation(null); }
        }, 200);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Open detail ─────────────────────────────────────────────────────────────
  const openDetail = (f: Formation) => {
    if (!loggedClient) {
      setPendingFormation(f);
      setShowLoginPrompt(true);
      return;
    }
    setSelected(f);
    setPaymentStep('detail');
    setSelectedPayMethod(null);
    setPayFormData({ name: loggedClient?.name || '', email: loggedClient?.email || '', transactionCode: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeDetail = () => { setSelected(null); setPaymentStep('detail'); setSelectedPayMethod(null); };

  // ── Purchase ─────────────────────────────────────────────────────────────────
  const handleWalletPurchase = async (formation: Formation) => {
    if (!loggedClient) { onOpenWallet(); return; }
    const rate = settings?.exchangeRate || 146;
    const balanceHTG = Math.round((loggedClient.balance ?? 0) * rate);
    if (balanceHTG < (formation.price ?? 0)) {
      toast.error(`Solde insuffisant. Vous avez ${balanceHTG.toLocaleString()} HTG.`); return;
    }
    setPurchasing(true);
    const priceUSD = (formation.price ?? 0) / rate;
    try {
      const res = await fetch('/api/formations/purchases/wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: loggedClient.id, clientName: loggedClient.name, formationId: formation.id, formationTitle: formation.title, amount: priceUSD }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de l\'achat.');
      setPurchasedIds(prev => [...prev, formation.id!]);
      toast.success(`✅ Accès à "${formation.title}" activé !`);
      setSelected(null);
    } catch (err: any) { toast.error(err.message); } finally { setPurchasing(false); }
  };

  const handleExternalPaymentSubmit = async () => {
    if (!loggedClient || !selected || !selectedPayMethod) return;
    if (!payFormData.transactionCode.trim()) { toast.error('Veuillez saisir le code de transaction.'); return; }
    if (!payFormData.name.trim() || !payFormData.email.trim()) { toast.error('Veuillez renseigner votre nom et email.'); return; }
    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/formations/payment-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: loggedClient.id, userEmail: payFormData.email, userName: payFormData.name,
          formationId: selected.id, formationTitle: selected.title, amount: selected.price,
          method: selectedPayMethod === 'moncash' ? 'MonCash' : 'NatCash',
          transactionCode: payFormData.transactionCode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la soumission.');
      if (json.alreadyOwned) { setPurchasedIds(prev => [...prev, selected.id!]); toast.success('Vous avez déjà accès à cette formation !'); closeDetail(); return; }
      setPaymentStep('done');
      const whatsappNum = settings?.whatsappAdminNumber?.replace(/\D/g, '') || '50944813185';
      const methodLabel = selectedPayMethod === 'moncash' ? 'MonCash' : 'NatCash';
      const msg = encodeURIComponent(
        `Bonjour Rena 👋\n\nJe viens d'effectuer un paiement pour une formation :\n\n` +
        `👤 Nom: *${payFormData.name}*\n📧 Email: *${payFormData.email}*\n` +
        `🎓 Cours: *${selected.title}*\n💳 Méthode: *${methodLabel}*\n` +
        `💰 Montant: *${(selected.price || 0).toLocaleString()} HTG*\n` +
        `🔖 Code transaction: *${payFormData.transactionCode}*\n\nMerci de valider mon accès.`
      );
      setTimeout(() => { window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank'); }, 800);
    } catch (err: any) { toast.error(err.message); } finally { setSubmittingPayment(false); }
  };

  // ── Player helpers ──────────────────────────────────────────────────────────
  const enterPlayer = (f: Formation) => {
    setPlayerFormation(f);
    onPlayerChange?.(true);
  };
  const exitPlayer = () => {
    setPlayerFormation(null);
    onPlayerChange?.(false);
  };

  // ── Render: Player ──────────────────────────────────────────────────────────
  if (playerFormation && loggedClient) {
    return <CoursePlayer formation={playerFormation} loggedClient={loggedClient} onBack={exitPlayer} />;
  }

  // ── Render: Detail Page ─────────────────────────────────────────────────────
  if (selected) {
    return (
      <FormationDetailPage
        formation={selected}
        isOwned={isOwned(selected)}
        isFav={isFav(selected)}
        loggedClient={loggedClient}
        onBack={closeDetail}
        onPlay={() => { closeDetail(); enterPlayer(selected); }}
        onFavorite={(e) => toggleFavorite(selected, e)}
        onOpenWallet={onOpenWallet}
        paymentStep={paymentStep}
        setPaymentStep={setPaymentStep}
        selectedPayMethod={selectedPayMethod}
        setSelectedPayMethod={setSelectedPayMethod}
        payFormData={payFormData}
        setPayFormData={setPayFormData}
        purchasing={purchasing}
        submittingPayment={submittingPayment}
        onWalletPurchase={() => handleWalletPurchase(selected)}
        onExternalSubmit={handleExternalPaymentSubmit}
        moncashNumber={moncashNumber}
        natcashNumber={natcashNumber}
        discount={discount(selected)}
        settings={settings}
        progressPct={progressMap[selected.id!] ?? 0}
      />
    );
  }

  // ── Render: Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
            <GraduationCap className="absolute inset-0 m-auto h-7 w-7 text-violet-600" />
          </div>
          <p className="text-gray-600 font-semibold">Chargement des formations...</p>
        </div>
      </div>
    );
  }

  // ── Render: Catalog ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9ff] relative overflow-x-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-28 -left-20 w-96 h-96 rounded-full bg-violet-500 opacity-[0.07] blur-3xl" />
        <div className="absolute top-1/2 -right-16 w-80 h-80 rounded-full bg-indigo-500 opacity-[0.07] blur-3xl" />
        <div className="absolute bottom-1/4 left-10 w-72 h-72 rounded-full bg-purple-500 opacity-[0.05] blur-3xl" />
      </div>

      {/* ── Login prompt dialog ─────────────────────────────────────────────── */}
      <Dialog open={showLoginPrompt} onOpenChange={open => { setShowLoginPrompt(open); if (!open) setPendingFormation(null); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-lg font-black text-white">Connexion requise</h2>
            <p className="text-white/70 text-xs mt-1">Connectez-vous pour accéder aux formations</p>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {pendingFormation && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <div className={`h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br ${levelGradients[pendingFormation.level] || 'from-violet-500 to-purple-700'} flex items-center justify-center`}>
                  {pendingFormation.coverImage
                    ? <img src={pendingFormation.coverImage} alt="" className="w-full h-full object-cover" />
                    : <GraduationCap className="h-5 w-5 text-white/40" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{pendingFormation.title}</p>
                  <p className="text-xs text-violet-600 font-semibold">
                    {pendingFormation.price === 0 ? 'Gratuit' : `${(pendingFormation.price || 0).toLocaleString()} HTG`}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-violet-500/20"
            >
              {googleLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              {googleLoading ? 'Connexion…' : 'Se connecter avec Google'}
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full h-10 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PREMIUM HERO CARD ─────────────────────────────────────────────────── */}
      {activeTab === 'all' && !searchQuery && (
        <div className="px-4 pt-5 pb-1">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-900 p-6 min-h-[186px] flex flex-col justify-between shadow-xl shadow-violet-900/20"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-300/15 rounded-full -ml-12 -mb-12 blur-xl" />

              <span className="inline-flex items-center bg-amber-400 text-amber-900 font-black text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider w-fit relative z-10">
                ✨ {formations.length > 0 ? `${formations.length}+` : ''} formations disponibles
              </span>

              <div className="relative z-10 mt-4">
                <h2 className="text-[22px] sm:text-2xl font-black text-white leading-snug mb-1.5">
                  Apprenez des compétences<br />concrètes et monétisables.
                </h2>
                <p className="text-white/60 text-xs font-semibold mb-4">
                  Formations professionnelles adaptées à vos objectifs.
                </p>
                <button
                  onClick={() => onTabChange('all')}
                  className="bg-white text-violet-700 font-black text-sm px-5 py-2.5 rounded-full w-fit shadow-md hover:bg-violet-50 active:scale-95 transition-all flex items-center gap-2 animate-[pulse-cta_2.5s_ease-in-out_infinite]"
                >
                  👉 Explorer les formations
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── TAB BAR ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => onTabChange('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'all' ? 'text-violet-700 bg-violet-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Grid className="h-4 w-4" /> Catalogue
            </button>
            <button
              onClick={() => onTabChange('my')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all relative ${activeTab === 'my' ? 'text-violet-700 bg-violet-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <BookMarked className="h-4 w-4" />
              Mes cours
              {myCourses.length > 0 && (
                <span className="bg-violet-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                  {myCourses.length}
                </span>
              )}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              <Filter className="h-3.5 w-3.5" /> Filtres
            </button>
          </div>
        </div>
      </div>

      {/* ── STUDENT FEATURES BAR ─────────────────────────────────────────── */}
      {loggedClient && (
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {/* Stats pills */}
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-violet-100 shrink-0">
                <BookMarked className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-black text-violet-700">{myCourses.length}</span>
                <span className="text-[10px] text-gray-400 font-semibold">inscrits</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-violet-100 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-black text-emerald-700">
                  {myCourses.filter(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100).length}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">en cours</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-violet-100 shrink-0">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-black text-amber-700">
                  {myCourses.filter(f => (progressMap[f.id!] ?? 0) >= 100).length}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">terminés</span>
              </div>
              {/* Continue learning shortcut */}
              {myCourses.find(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100) && (() => {
                const inProgress = myCourses.find(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100)!;
                return (
                  <button
                    onClick={() => { enterPlayer(inProgress); }}
                    className="flex items-center gap-2 ml-auto bg-violet-600 hover:bg-violet-700 text-white rounded-full px-3 py-1.5 text-xs font-black shrink-0 transition-colors"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Reprendre · {inProgress.title.slice(0, 20)}{inProgress.title.length > 20 ? '…' : ''}
                    <span className="ml-1 opacity-80">{progressMap[inProgress.id!]}%</span>
                  </button>
                );
              })()}
              {/* Favorites shortcut */}
              {favorites.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-rose-100 shrink-0">
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                  <span className="text-xs font-black text-rose-700">{favorites.length}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">favoris</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <AnimatePresence mode="wait">

          {/* ── ALL COURSES TAB ──────────────────────────────────────────── */}
          {activeTab === 'all' && (
            <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-7">

              {searchQuery ? (
                /* ── Search results */
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-5">
                    {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour "<span className="text-violet-600">{searchQuery}</span>"
                  </p>
                  {filtered.length === 0 ? (
                    <EmptyState icon={<Search className="h-10 w-10" />} title="Aucun résultat" sub="Essayez un autre mot-clé ou modifiez vos filtres." />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((f, i) => <CourseCard key={f.id} formation={f} i={i} owned={isOwned(f)} fav={isFav(f)} disc={discount(f)} onOpen={() => openDetail(f)} onFav={(e) => toggleFavorite(f, e)} />)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* ── 1. Categories with icon boxes */}
                  {categories.filter(c => c !== 'all').length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[15px] font-black text-gray-900">Catégories</h3>
                        <button
                          onClick={() => setShowFilters(v => !v)}
                          className={`text-xs font-bold flex items-center gap-1 transition-colors ${showFilters ? 'text-violet-700' : 'text-gray-400 hover:text-violet-600'}`}
                        >
                          <Filter className="h-3 w-3" /> {showFilters ? 'Fermer' : 'Filtres'}
                        </button>
                      </div>

                      {/* Filters panel */}
                      <AnimatePresence>
                        {showFilters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-4"
                          >
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-3">
                              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Niveau</p>
                              <div className="flex flex-wrap gap-1.5">
                                {['all', 'debutant', 'intermediaire', 'avance'].map(lvl => (
                                  <button key={lvl} onClick={() => setFilterLevel(lvl)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filterLevel === lvl ? 'bg-violet-600 text-white shadow-sm shadow-violet-400/30' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                    {lvl === 'all' ? 'Tous' : levelLabels[lvl]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Category icon boxes - horizontal scroll */}
                      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {['all', ...categories.filter(c => c !== 'all')].map(cat => {
                          const Icon = getCategoryIcon(cat);
                          const active = filterCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => setFilterCategory(cat)}
                              className="flex flex-col items-center gap-1.5 shrink-0 transition-all active:scale-95"
                            >
                              <div className={`w-[58px] h-[58px] rounded-[18px] flex items-center justify-center transition-all relative overflow-hidden ${
                                active
                                  ? 'bg-violet-600 shadow-lg shadow-violet-300/50'
                                  : 'bg-white shadow-sm hover:shadow-md hover:bg-violet-50'
                              }`}>
                                {active && <div className="absolute inset-0 bg-white/10 rounded-[18px]" />}
                                <Icon className={`h-6 w-6 relative z-10 ${active ? 'text-white' : 'text-violet-600'}`} />
                              </div>
                              <span className={`text-[10px] font-bold whitespace-nowrap leading-none ${active ? 'text-violet-700' : 'text-gray-400'}`}>
                                {cat === 'all' ? 'Tous' : cat.length > 9 ? cat.slice(0, 8) + '…' : cat}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── 2. Continue learning (if in-progress courses) */}
                  {loggedClient && myCourses.filter(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[15px] font-black text-gray-900">Continuer l'apprentissage</h3>
                        <button onClick={() => onTabChange('my')} className="text-xs text-violet-600 font-bold flex items-center gap-1 hover:gap-1.5 transition-all">
                          Voir tout <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {myCourses.filter(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100).slice(0, 2).map(f => (
                          <ContinueLearningMiniCard
                            key={f.id}
                            formation={f}
                            pct={progressMap[f.id!] ?? 0}
                            onResume={() => enterPlayer(f)}
                            onDetails={() => openDetail(f)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 3. Popular — featured card + horizontal scroll */}
                  {popularCourses.length > 0 && (
                    <div>
                      <h3 className="text-[15px] font-black text-gray-900 mb-3">Formations Populaires</h3>
                      <FeaturedCourseCard
                        formation={popularCourses[0]}
                        owned={isOwned(popularCourses[0])}
                        fav={isFav(popularCourses[0])}
                        disc={discount(popularCourses[0])}
                        onOpen={() => openDetail(popularCourses[0])}
                        onFav={e => toggleFavorite(popularCourses[0], e)}
                      />
                      {popularCourses.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4 pb-1">
                          {popularCourses.slice(1).map(f => (
                            <CompactCourseCard
                              key={f.id}
                              formation={f}
                              owned={isOwned(f)}
                              fav={isFav(f)}
                              disc={discount(f)}
                              onOpen={() => openDetail(f)}
                              onFav={e => toggleFavorite(f, e)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 4. Free courses — horizontal scroll */}
                  {freeCourses.filter(f => !popularCourses.find(p => p.id === f.id)).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Zap className="h-3.5 w-3.5 text-emerald-600" />
                        </span>
                        <h3 className="text-[15px] font-black text-gray-900">Cours gratuits</h3>
                      </div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {freeCourses.filter(f => !popularCourses.find(p => p.id === f.id)).slice(0, 8).map(f => (
                          <CompactCourseCard
                            key={f.id}
                            formation={f}
                            owned={isOwned(f)}
                            fav={isFav(f)}
                            disc={discount(f)}
                            onOpen={() => openDetail(f)}
                            onFav={e => toggleFavorite(f, e)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 5. New courses — 2-col grid */}
                  {(() => {
                    const shownIds = new Set([...popularCourses.map(f => f.id), ...freeCourses.map(f => f.id)]);
                    const novelties = newCourses.filter(f => !shownIds.has(f.id));
                    return novelties.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          </span>
                          <h3 className="text-[15px] font-black text-gray-900">Nouveautés</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {novelties.map((f, i) => (
                            <NewCourseGridCard
                              key={f.id}
                              formation={f}
                              i={i}
                              owned={isOwned(f)}
                              onOpen={() => openDetail(f)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* ── 6. Certificate banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-700 to-purple-900 p-6 text-white shadow-lg shadow-violet-900/20"
                  >
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-300/10 rounded-full -ml-10 -mt-10 blur-2xl" />
                    <div className="relative z-10">
                      <Award className="h-10 w-10 mb-3 text-amber-300" />
                      <h4 className="text-lg font-black mb-1.5">Certificats Rena Academy</h4>
                      <p className="text-white/70 text-sm mb-5 max-w-xs leading-relaxed">
                        Obtenez un certificat reconnu après chaque formation complétée.
                      </p>
                      <button
                        onClick={() => loggedClient ? onTabChange('my') : onOpenWallet()}
                        className="bg-white text-violet-700 font-black text-sm px-5 py-2.5 rounded-full hover:bg-violet-50 active:scale-95 transition-all inline-flex items-center gap-2 shadow-md"
                      >
                        👉 {loggedClient ? 'Voir mes certificats' : 'Se connecter'}
                      </button>
                    </div>
                  </motion.div>

                  {/* ── 7. User stats */}
                  {loggedClient && myCourses.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 pb-4">
                      {[
                        { value: myCourses.length, label: 'Formations' },
                        { value: myCourses.filter(f => (progressMap[f.id!] ?? 0) > 0 && (progressMap[f.id!] ?? 0) < 100).length, label: 'En cours' },
                        { value: myCourses.filter(f => (progressMap[f.id!] ?? 0) >= 100).length, label: 'Terminés' },
                      ].map(s => (
                        <motion.div
                          key={s.label}
                          whileTap={{ scale: 0.96 }}
                          className="bg-white p-4 rounded-2xl shadow-sm text-center border border-white/80 hover:shadow-md transition-all cursor-default"
                        >
                          <span className="block text-2xl font-black text-violet-700">{s.value}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{s.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── MY COURSES TAB ───────────────────────────────────────────── */}
          {activeTab === 'my' && (
            <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!loggedClient ? (
                <div className="text-center py-14">
                  <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-100">
                    <Lock className="h-7 w-7 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-1.5">Connectez-vous pour accéder à vos cours</h3>
                  <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">Votre espace personnel vous permet de retrouver tous vos cours achetés et votre progression.</p>
                  <Button onClick={onOpenWallet} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                    Se connecter
                  </Button>
                </div>
              ) : myCourses.length === 0 ? (
                <div className="text-center py-14">
                  <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-100">
                    <BookOpen className="h-7 w-7 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-1.5">Vous n'avez pas encore de cours</h3>
                  <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">Explorez notre catalogue et démarrez votre apprentissage dès aujourd'hui.</p>
                  <Button onClick={() => onTabChange('all')} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" /> Explorer le catalogue
                  </Button>
                </div>
              ) : (
                <StudentDashboard
                  loggedClient={loggedClient}
                  myCourses={myCourses}
                  progressMap={progressMap}
                  favorites={favorites.map(id => formations.find(f => f.id === id)).filter(Boolean) as Formation[]}
                  onPlay={(f) => { enterPlayer(f); }}
                  onDetails={openDetail}
                  onOpenWallet={onOpenWallet}
                  onTabChange={onTabChange}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-gray-100 rounded-lg p-1.5">{icon}</div>
        <h2 className="text-base font-black text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="mb-3 mx-auto opacity-30">{icon}</div>
      <p className="font-bold text-gray-700 mb-1">{title}</p>
      <p className="text-sm">{sub}</p>
    </div>
  );
}

function CourseCard({ formation, i, owned, fav, disc, onOpen, onFav }: {
  formation: Formation; i: number; owned: boolean; fav: boolean; disc: number;
  onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col"
    >
      {/* Cover */}
      <div className="relative h-48 overflow-hidden shrink-0">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-purple-700'}`}>
            <GraduationCap className="h-16 w-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {formation.price === 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">Gratuit</span>
          )}
          {disc > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30">-{disc}%</span>
          )}
          {formation.hasCertificate && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/90 text-amber-900 backdrop-blur-sm flex items-center gap-1 shadow-sm">
              <BadgeCheck className="h-2.5 w-2.5" /> Certifiant
            </span>
          )}
        </div>

        {/* Favorite */}
        <button onClick={onFav}
          className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm ${fav ? 'bg-rose-500 text-white scale-110' : 'bg-black/25 text-white/80 hover:bg-black/40 hover:scale-110'}`}>
          <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-white' : ''}`} />
        </button>

        {/* Owned badge */}
        {owned && (
          <div className="absolute bottom-3 left-3 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 fill-white" /> Accès activé
          </div>
        )}

        {/* Play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-6 w-6 text-violet-700 fill-violet-700" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        {formation.category && (
          <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-2">{formation.category}</span>
        )}
        <h3 className="font-black text-gray-900 text-sm mb-2 line-clamp-2 leading-snug">{formation.title}</h3>
        {formation.instructor && (
          <p className="text-xs text-gray-400 mb-2.5 truncate flex items-center gap-1">
            <span className="h-4 w-4 rounded-full bg-gray-100 inline-flex items-center justify-center shrink-0">
              <User className="h-2.5 w-2.5 text-gray-400" />
            </span>
            {formation.instructor}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2.5">
          {formation.totalDuration && <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full"><Clock className="h-3 w-3 text-violet-400" />{formation.totalDuration}</span>}
          <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full"><BookOpen className="h-3 w-3 text-violet-400" />{(formation.modules || []).length} modules</span>
        </div>
        <div className="mb-3">
          <StarRating rating={formation.rating || 0} size="xs" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
          <div>
            <span className="text-base font-black text-violet-700">
              {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
            </span>
            {formation.originalPrice && formation.originalPrice > formation.price && (
              <span className="text-xs text-gray-400 line-through ml-1.5">{formation.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <span className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 group-hover:scale-110 transition-all">
            <ChevronRight className="h-4 w-4 text-violet-600" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function InProgressCard({ formation, pct, onContinue, onDetails, i }: {
  formation: Formation; pct: number; onContinue: () => void; onDetails: () => void; i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="relative h-36 overflow-hidden shrink-0">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-purple-700'} flex items-center justify-center`}>
            <GraduationCap className="h-12 w-12 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {formation.category && (
          <span className="absolute top-3 left-3 text-[10px] font-black text-white/90 uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">{formation.category}</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-black text-gray-900 text-sm mb-1 line-clamp-2">{formation.title}</h4>
        <p className="text-xs text-gray-400 mb-3">{(formation.modules || []).length} modules</p>
        <div className="mb-1.5">
          <ProgressBar pct={pct} />
        </div>
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-gray-500">{pct}% complété</span>
          <span className="text-violet-600 font-bold">Continuer</span>
        </div>
        <button onClick={onContinue}
          className="w-full h-9 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5">
          <Play className="h-3.5 w-3.5 fill-white" /> Continuer
        </button>
      </div>
    </motion.div>
  );
}

function StudentDashboard({ loggedClient, myCourses, progressMap, favorites, onPlay, onDetails, onOpenWallet, onTabChange }: {
  loggedClient: Client; myCourses: Formation[]; progressMap: Record<string, number>;
  favorites: Formation[]; onPlay: (f: Formation) => void; onDetails: (f: Formation) => void;
  onOpenWallet: () => void; onTabChange: (t: 'all' | 'my') => void;
}) {
  const completedCount = myCourses.filter(f => (progressMap[f.id!] ?? 0) >= 100).length;
  const avgProgress = myCourses.length > 0 ? Math.round(myCourses.reduce((s, f) => s + (progressMap[f.id!] ?? 0), 0) / myCourses.length) : 0;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cours achetés', value: myCourses.length, icon: <BookOpen className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-50' },
          { label: 'Terminés', value: completedCount, icon: <Trophy className="h-5 w-5 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Progression moy.', value: `${avgProgress}%`, icon: <BarChart3 className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Favoris', value: favorites.length, icon: <Heart className="h-5 w-5 text-rose-500" />, bg: 'bg-rose-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
            <div className="mb-2">{s.icon}</div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* My courses in progress */}
      <div>
        <h3 className="text-base font-black text-gray-900 mb-4">Mes cours en cours</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCourses.map((f, i) => {
            const pct = progressMap[f.id!] ?? 0;
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="relative h-40 overflow-hidden shrink-0">
                  {f.coverImage ? (
                    <img src={f.coverImage} alt={f.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${levelGradients[f.level] || 'from-violet-500 to-purple-700'} flex items-center justify-center`}>
                      <GraduationCap className="h-12 w-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {f.category && (
                    <span className="absolute top-3 left-3 text-[10px] font-black text-violet-300 uppercase tracking-wider">{f.category}</span>
                  )}
                  {pct === 100 && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="h-2.5 w-2.5" /> Terminé
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h4 className="font-black text-gray-900 text-sm mb-1 line-clamp-2">{f.title}</h4>
                  {f.instructor && <p className="text-xs text-gray-400 mb-3">{f.instructor}</p>}
                  <div className="mb-1">
                    <ProgressBar pct={pct} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{pct}% complété</span>
                    <span>{(f.modules || []).length} modules</span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => onPlay(f)}
                      className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-white" /> {pct > 0 ? 'Continuer' : 'Commencer'}
                    </button>
                    <button onClick={() => onDetails(f)} className="h-9 px-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs transition-colors">
                      Détails
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" /> Mes favoris
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {favorites.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onDetails(f)}>
                <div className={`h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br ${levelGradients[f.level] || 'from-violet-500 to-purple-700'} flex items-center justify-center`}>
                  {f.coverImage ? <img src={f.coverImage} alt={f.title} className="w-full h-full object-cover" /> : <GraduationCap className="h-5 w-5 text-white/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{f.title}</p>
                  <p className="text-xs text-gray-400">{f.totalDuration || `${(f.modules || []).length} modules`}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formation Detail Page ──────────────────────────────────────────────────────

interface DetailPageProps {
  formation: Formation;
  isOwned: boolean;
  isFav: boolean;
  loggedClient: Client | null;
  onBack: () => void;
  onPlay: () => void;
  onFavorite: (e: React.MouseEvent) => void;
  onOpenWallet: () => void;
  paymentStep: PaymentStep;
  setPaymentStep: (s: PaymentStep) => void;
  selectedPayMethod: 'moncash' | 'natcash' | null;
  setSelectedPayMethod: (m: 'moncash' | 'natcash' | null) => void;
  payFormData: { name: string; email: string; transactionCode: string };
  setPayFormData: (d: any) => void;
  purchasing: boolean;
  submittingPayment: boolean;
  onWalletPurchase: () => void;
  onExternalSubmit: () => void;
  moncashNumber: string;
  natcashNumber: string;
  discount: number;
  settings: any;
  progressPct: number;
}

function FormationDetailPage({
  formation, isOwned, isFav, loggedClient, onBack, onPlay, onFavorite, onOpenWallet,
  paymentStep, setPaymentStep, selectedPayMethod, setSelectedPayMethod,
  payFormData, setPayFormData, purchasing, submittingPayment,
  onWalletPurchase, onExternalSubmit, moncashNumber, natcashNumber, discount, progressPct, settings
}: DetailPageProps) {

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [showAllModules, setShowAllModules] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    (formation.chapters || []).forEach((c, i) => { map[c.id] = i < 2; });
    if (!(formation.chapters || []).length) map['__all'] = true;
    setExpandedChapters(map);
  }, [formation.id]);

  const modules = [...(formation.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const visibleModules = showAllModules ? modules : modules.slice(0, 6);

  // Group modules by chapter
  const chapterModules: Record<string, FormationModule[]> = {};
  const noChapter: FormationModule[] = [];
  modules.forEach(m => {
    if (m.chapterId) { chapterModules[m.chapterId] = [...(chapterModules[m.chapterId] || []), m]; }
    else { noChapter.push(m); }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 bg-gray-900 overflow-hidden">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-600 to-purple-800'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <button onClick={onBack}
            className="flex items-center gap-2 text-white/80 hover:text-white bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2 text-sm font-semibold transition-colors">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
        </div>

        {/* Favorite */}
        <div className="absolute top-4 right-4">
          <button onClick={onFavorite}
            className={`h-9 w-9 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all ${isFav ? 'bg-rose-500 text-white' : 'bg-black/30 text-white/70 hover:bg-black/50'}`}>
            <Heart className={`h-4 w-4 ${isFav ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          {formation.category && (
            <span className="inline-block px-3 py-1 bg-violet-500/30 text-violet-300 text-xs font-bold rounded-full border border-violet-400/30 mb-3">
              {formation.category}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight max-w-2xl">{formation.title}</h1>
          <p className="text-gray-400 text-sm mt-2 line-clamp-2 max-w-xl">{formation.shortDescription || formation.description}</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Meta stats */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: <Clock className="h-4 w-4 text-violet-500" />, label: 'Durée', value: formation.totalDuration || `${modules.length * 15} min` },
                  { icon: <BookOpen className="h-4 w-4 text-violet-500" />, label: 'Modules', value: modules.length },
                  { icon: <Users className="h-4 w-4 text-violet-500" />, label: 'Étudiants', value: (formation.studentsCount || 0).toLocaleString() },
                  { icon: <Star className="h-4 w-4 text-amber-500" />, label: 'Note', value: formation.rating > 0 ? formation.rating.toFixed(1) : '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex justify-center mb-1.5">{icon}</div>
                    <p className="font-black text-gray-900 text-sm">{value}</p>
                    <p className="text-[11px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formation.hasCertificate && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                    <BadgeCheck className="h-3.5 w-3.5" /> Certification incluse
                  </span>
                )}
                {formation.level && (
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${levelColors[formation.level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {levelLabels[formation.level] || formation.level}
                  </span>
                )}
                {formation.language && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    <Globe className="h-3 w-3" /> {formation.language}
                  </span>
                )}
              </div>
            </div>

            {/* Preview Video */}
            {formation.previewVideoUrl && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">Aperçu gratuit du cours</h2>
                    <p className="text-[11px] text-gray-400">Regardez sans inscription</p>
                  </div>
                </div>
                {(() => {
                  const ytMatch = formation.previewVideoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                  const vimeoMatch = formation.previewVideoUrl?.match(/vimeo\.com\/(\d+)/);
                  if (ytMatch) {
                    return (
                      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen title="Aperçu du cours"
                        />
                      </div>
                    );
                  }
                  if (vimeoMatch) {
                    return (
                      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?color=7C3AED`}
                          className="absolute inset-0 w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen title="Aperçu du cours"
                        />
                      </div>
                    );
                  }
                  return (
                    <video controls playsInline className="w-full aspect-video">
                      <source src={formation.previewVideoUrl} />
                    </video>
                  );
                })()}
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-black text-gray-900 text-base mb-3">À propos de cette formation</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{formation.description}</p>
            </div>

            {/* Instructor */}
            {formation.instructor && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-black text-gray-900 text-base mb-4">Votre Instructeur</h2>
                <div className="flex items-start gap-4">
                  {formation.instructorAvatar ? (
                    <img src={formation.instructorAvatar} alt={formation.instructor}
                      className="h-16 w-16 rounded-full object-cover border-2 border-violet-200 shrink-0"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center border-2 border-violet-200 shrink-0">
                      <User className="h-8 w-8 text-violet-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-gray-900 text-base">{formation.instructor}</p>
                    {formation.instructorBio && (
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{formation.instructorBio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Curriculum */}
            {modules.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-gray-900 text-base">Curriculum du cours</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {modules.length} module{modules.length > 1 ? 's' : ''} · {(formation.chapters || []).length > 0 ? `${(formation.chapters || []).length} chapitres` : ''}
                    </p>
                  </div>
                  {isOwned && progressPct > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">{progressPct}% complété</p>
                      <div className="w-24">
                        <ProgressBar pct={progressPct} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chapters */}
                {(formation.chapters || []).length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {(formation.chapters || []).map((chapter, ci) => {
                      const cms = chapterModules[chapter.id] || [];
                      const expanded = expandedChapters[chapter.id];
                      return (
                        <div key={chapter.id}>
                          <button
                            onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${expanded ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                              {ci + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-900 text-sm">{chapter.title}</p>
                              <p className="text-[11px] text-gray-400">{cms.length} leçon{cms.length !== 1 ? 's' : ''}</p>
                            </div>
                            {!isOwned && <Lock className="h-4 w-4 text-gray-300 shrink-0" />}
                            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                          </button>
                          {expanded && cms.map((mod, mi) => (
                            <ModuleRow key={mod.id} mod={mod} idx={mi} isOwned={isOwned} />
                          ))}
                        </div>
                      );
                    })}
                    {noChapter.map((mod, mi) => <ModuleRow key={mod.id} mod={mod} idx={mi} isOwned={isOwned} />)}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {visibleModules.map((mod, mi) => <ModuleRow key={mod.id} mod={mod} idx={mi} isOwned={isOwned} />)}
                    {modules.length > 6 && (
                      <button onClick={() => setShowAllModules(v => !v)}
                        className="w-full py-3.5 text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5">
                        {showAllModules ? <><ChevronUp className="h-3.5 w-3.5" /> Réduire</> : <><ChevronDown className="h-3.5 w-3.5" /> Voir {modules.length - 6} modules de plus</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PDF Resources */}
            {formation.pdfUrl && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" /> Ressources
                </h2>
                {isOwned ? (
                  <a href={formation.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl hover:bg-violet-100 transition-colors">
                    <div className="h-10 w-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-violet-800 text-sm">Support de cours PDF</p>
                      <p className="text-xs text-violet-500">Télécharger</p>
                    </div>
                    <Download className="h-4 w-4 text-violet-500 shrink-0" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-400">Support PDF — disponible après achat</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (Purchase Card) ────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <PurchaseCard
                formation={formation}
                isOwned={isOwned}
                loggedClient={loggedClient}
                paymentStep={paymentStep}
                setPaymentStep={setPaymentStep}
                selectedPayMethod={selectedPayMethod}
                setSelectedPayMethod={setSelectedPayMethod}
                payFormData={payFormData}
                setPayFormData={setPayFormData}
                purchasing={purchasing}
                submittingPayment={submittingPayment}
                onPlay={onPlay}
                onWalletPurchase={onWalletPurchase}
                onExternalSubmit={onExternalSubmit}
                onOpenWallet={onOpenWallet}
                moncashNumber={moncashNumber}
                natcashNumber={natcashNumber}
                discount={discount}
                progressPct={progressPct}
                settings={settings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ mod, idx, isOwned }: { mod: FormationModule; idx: number; isOwned: boolean }) {
  const hasVideo = !!mod.videoUrl;
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isOwned ? 'bg-violet-100' : 'bg-gray-100'}`}>
        {isOwned ? (
          hasVideo ? <Play className="h-3.5 w-3.5 text-violet-600 fill-violet-600" /> : <FileText className="h-3.5 w-3.5 text-violet-600" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{mod.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {mod.duration && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{mod.duration}</span>}
          {mod.pdfUrl && <span className="text-[11px] text-violet-500 flex items-center gap-1"><FileText className="h-2.5 w-2.5" />PDF</span>}
        </div>
      </div>
      {!isOwned && <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
    </div>
  );
}

// ── Purchase Card ──────────────────────────────────────────────────────────────

function PurchaseCard({
  formation, isOwned, loggedClient, paymentStep, setPaymentStep,
  selectedPayMethod, setSelectedPayMethod, payFormData, setPayFormData,
  purchasing, submittingPayment, onPlay, onWalletPurchase, onExternalSubmit,
  onOpenWallet, moncashNumber, natcashNumber, discount, progressPct, settings
}: any) {

  const rate = settings?.exchangeRate || 146;
  const hasWalletFunds = loggedClient && Math.round((loggedClient.balance ?? 0) * rate) >= (formation.price ?? 0);

  if (paymentStep === 'done') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 text-center">
        <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="font-black text-gray-900 text-lg mb-2">Paiement envoyé !</h3>
        <p className="text-sm text-gray-500 mb-5">Votre demande est en cours de validation. Vous recevrez un accès dès confirmation.</p>
        <div className="bg-emerald-50 rounded-xl p-4 text-left space-y-1 text-xs text-gray-600 mb-4">
          <p>✅ Transaction soumise avec succès</p>
          <p>⏳ Validation sous 24–48h ouvrables</p>
          <p>📲 WhatsApp ouvert pour notifier l'admin</p>
        </div>
        <button onClick={() => setPaymentStep('detail')}
          className="w-full h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          Retour
        </button>
      </div>
    );
  }

  if (paymentStep === 'form' && selectedPayMethod) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
        <button onClick={() => setPaymentStep('external-method')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-xs font-semibold mb-4 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <h3 className="font-black text-gray-900 text-base mb-1">Finaliser le paiement</h3>
        <p className="text-xs text-gray-500 mb-5">via {selectedPayMethod === 'moncash' ? 'MonCash' : 'NatCash'}</p>

        <div className="space-y-3 mb-5">
          <input type="text" placeholder="Votre nom complet" value={payFormData.name}
            onChange={e => setPayFormData((d: any) => ({ ...d, name: e.target.value }))}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all" />
          <input type="email" placeholder="Votre email" value={payFormData.email}
            onChange={e => setPayFormData((d: any) => ({ ...d, email: e.target.value }))}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all" />
          <input type="text" placeholder="Code de transaction" value={payFormData.transactionCode}
            onChange={e => setPayFormData((d: any) => ({ ...d, transactionCode: e.target.value }))}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all" />
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Formation</span><span className="font-bold text-gray-800 truncate max-w-[140px]">{formation.title}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-black text-violet-700">{(formation.price || 0).toLocaleString()} HTG</span></div>
        </div>

        <button onClick={onExternalSubmit} disabled={submittingPayment}
          className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Confirmer le paiement
        </button>
      </div>
    );
  }

  if (paymentStep === 'external-method') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
        <button onClick={() => setPaymentStep('detail')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-xs font-semibold mb-4 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
        <h3 className="font-black text-gray-900 text-base mb-4">Mode de paiement</h3>

        <div className="space-y-3 mb-5">
          {/* MonCash */}
          <div onClick={() => setSelectedPayMethod('moncash')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPayMethod === 'moncash' ? 'border-rose-400 bg-rose-50' : 'border-gray-200 bg-white hover:border-rose-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Smartphone className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-sm">MonCash</p>
                <p className="text-[10px] text-gray-400">Paiement mobile sécurisé par Digicel</p>
              </div>
              {selectedPayMethod === 'moncash' && <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0" />}
            </div>
            <div className="bg-white rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Numéro</span><span className="font-black text-gray-800">{moncashNumber}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Montant exact</span><span className="font-black text-violet-700">{(formation.price || 0).toLocaleString()} HTG</span></div>
            </div>
          </div>

          {/* NatCash */}
          <div onClick={() => setSelectedPayMethod('natcash')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPayMethod === 'natcash' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-sm">NatCash</p>
                <p className="text-[10px] text-gray-400">Sécurisé et rapide</p>
              </div>
              {selectedPayMethod === 'natcash' && <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />}
            </div>
            <div className="bg-white rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Numéro</span><span className="font-black text-gray-800">{natcashNumber}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Montant exact</span><span className="font-black text-violet-700">{(formation.price || 0).toLocaleString()} HTG</span></div>
            </div>
          </div>
        </div>

        <button onClick={() => { if (selectedPayMethod) setPaymentStep('form'); else toast.error('Choisissez un mode de paiement.'); }}
          disabled={!selectedPayMethod}
          className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
          Continuer <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Default: detail card
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
      {/* Price header */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl font-black text-violet-700">
            {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
          </span>
          {formation.originalPrice && formation.originalPrice > formation.price && (
            <span className="text-sm text-gray-400 line-through">{formation.originalPrice.toLocaleString()}</span>
          )}
          {discount > 0 && (
            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-black rounded-full">-{discount}%</span>
          )}
        </div>
        {loggedClient && formation.price > 0 && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Votre solde : <span className={`font-bold ml-0.5 ${hasWalletFunds ? 'text-emerald-600' : 'text-rose-500'}`}>
              {(loggedClient.balance ?? 0).toLocaleString()} HTG
            </span>
          </p>
        )}
      </div>

      <div className="p-5 space-y-3">
        {isOwned ? (
          <>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-emerald-700">Accès activé — Prêt à commencer !</p>
            </div>
            {progressPct > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progression</span><span className="font-bold text-violet-600">{progressPct}%</span>
                </div>
                <ProgressBar pct={progressPct} />
              </div>
            )}
            <button onClick={onPlay}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-violet-500/20">
              <Play className="h-4 w-4 fill-white" />
              {progressPct > 0 ? 'Continuer le cours' : 'Commencer le cours'}
            </button>
          </>
        ) : loggedClient ? (
          <>
            {formation.price === 0 ? (
              <button onClick={onWalletPurchase} disabled={purchasing}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Accéder gratuitement
              </button>
            ) : (
              <>
                {hasWalletFunds && (
                  <button onClick={onWalletPurchase} disabled={purchasing}
                    className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-violet-500/20">
                    {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    Acheter avec mon Wallet
                  </button>
                )}
                <button onClick={() => setPaymentStep('external-method')}
                  className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 ${hasWalletFunds ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-lg shadow-violet-500/20'}`}>
                  <Smartphone className="h-4 w-4" />
                  Payer par MonCash / NatCash
                </button>
                {!hasWalletFunds && (
                  <button onClick={onOpenWallet} className="w-full text-xs text-violet-600 font-semibold hover:underline flex items-center justify-center gap-1 py-1">
                    <TrendingUp className="h-3 w-3" /> Recharger mon wallet
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <button onClick={onOpenWallet}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
            <Lock className="h-4 w-4" /> Se connecter pour acheter
          </button>
        )}

        {/* Trust badges */}
        <div className="pt-3 border-t border-gray-50 space-y-2">
          {[
            { icon: <Shield className="h-3.5 w-3.5 text-emerald-500" />, text: 'Paiement 100% sécurisé' },
            { icon: <Award className="h-3.5 w-3.5 text-amber-500" />, text: 'Accès à vie aux mises à jour' },
            { icon: <BadgeCheck className="h-3.5 w-3.5 text-violet-500" />, text: formation.hasCertificate ? 'Certificat d\'achèvement inclus' : 'Support d\'instructeur inclus' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2 text-xs text-gray-500">
              {b.icon} {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Premium catalog sub-components ─────────────────────────────────────────────

function getCategoryIcon(cat: string): React.FC<{ className?: string }> {
  const l = cat.toLowerCase();
  if (l === 'all' || l === 'tous' || l === 'toutes') return Grid;
  if (l.includes('ia') || l.includes('intelligence') || l.includes('ai') || l.includes('tech')) return Cpu;
  if (l.includes('marketing') || l.includes('publicité') || l.includes('ads')) return TrendingUp;
  if (l.includes('business') || l.includes('entreprise') || l.includes('gestion')) return Briefcase;
  if (l.includes('trading') || l.includes('finance') || l.includes('bourse') || l.includes('crypto')) return BarChart3;
  if (l.includes('design') || l.includes('ui') || l.includes('ux') || l.includes('graphi')) return Palette;
  if (l.includes('ecommerce') || l.includes('e-commerce') || l.includes('dropship') || l.includes('vente')) return ShoppingBag;
  if (l.includes('dev') || l.includes('code') || l.includes('web') || l.includes('program')) return Globe;
  if (l.includes('photo') || l.includes('vidéo') || l.includes('video') || l.includes('créa')) return Sparkles;
  return GraduationCap;
}

function FeaturedCourseCard({ formation, owned, fav, disc, onOpen, onFav }: {
  formation: Formation; owned: boolean; fav: boolean; disc: number;
  onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="bg-white rounded-3xl overflow-hidden shadow-[0px_10px_32px_rgba(0,0,0,0.06)] border border-gray-50 group cursor-pointer"
    >
      {/* Cover image */}
      <div className="relative h-48 w-full overflow-hidden">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-600 to-indigo-800'} flex items-center justify-center`}>
            <GraduationCap className="h-20 w-20 text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {formation.category && (
          <span className="absolute top-4 left-4 bg-violet-600/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full">
            {formation.category}
          </span>
        )}
        {formation.price === 0 && (
          <span className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full">Gratuit</span>
        )}
        {disc > 0 && (
          <span className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full">-{disc}%</span>
        )}
        <button onClick={onFav} className={`absolute bottom-4 right-4 h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md ${fav ? 'bg-rose-500 text-white' : 'bg-black/30 backdrop-blur-sm text-white hover:bg-rose-500'}`}>
          <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-white' : ''}`} />
        </button>
        {owned && (
          <div className="absolute bottom-4 left-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 fill-white" /> Accès activé
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {formation.rating ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-black text-gray-800">{formation.rating.toFixed(1)}</span>
            {formation.studentsCount ? (
              <span className="text-[11px] text-gray-400">({formation.studentsCount.toLocaleString()} étudiants)</span>
            ) : null}
          </div>
        ) : null}

        <h5 className="text-base font-black text-gray-900 mb-1 leading-snug line-clamp-2">{formation.title}</h5>
        {formation.instructor && (
          <p className="text-xs font-semibold text-gray-400 mb-4 flex items-center gap-1">
            <span className="h-4 w-4 rounded-full bg-gray-100 inline-flex items-center justify-center shrink-0">
              <User className="h-2.5 w-2.5 text-gray-400" />
            </span>
            {formation.instructor}
          </p>
        )}

        <div className="flex items-center gap-4 mb-5">
          {formation.totalDuration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-[11px] text-gray-500 font-semibold">{formation.totalDuration}</span>
            </div>
          )}
          {formation.level && (
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-[11px] text-gray-500 font-semibold">{levelLabels[formation.level] || formation.level}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-[11px] text-gray-500 font-semibold">{(formation.modules || []).length} modules</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-violet-700">
              {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
            </span>
            {formation.originalPrice && formation.originalPrice > formation.price && (
              <span className="text-xs text-gray-400 line-through">{formation.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onOpen(); }}
            className="flex-1 max-w-[160px] bg-violet-600 text-white font-black text-xs py-2.5 rounded-xl hover:bg-violet-700 active:scale-95 transition-all shadow-sm shadow-violet-400/30 flex items-center justify-center gap-1.5"
          >
            {owned ? '▶ Continuer' : '👉 Voir le cours'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CompactCourseCard({ formation, owned, fav, disc, onOpen, onFav }: {
  formation: Formation; owned: boolean; fav: boolean; disc: number;
  onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      className="min-w-[200px] max-w-[200px] bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group shrink-0 border border-gray-50"
    >
      <div className="relative h-[108px] overflow-hidden">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-indigo-700'} flex items-center justify-center`}>
            <GraduationCap className="h-8 w-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {formation.price === 0 && (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">Gratuit</span>
        )}
        {disc > 0 && (
          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-{disc}%</span>
        )}
        {owned && (
          <span className="absolute bottom-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5 fill-white" /> Accès
          </span>
        )}
        <button onClick={onFav} className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center transition-all ${fav ? 'bg-rose-500 text-white' : 'bg-black/25 backdrop-blur-sm text-white/80'}`}>
          <Heart className={`h-3 w-3 ${fav ? 'fill-white' : ''}`} />
        </button>
      </div>
      <div className="p-3">
        <h6 className="text-[11px] font-black text-gray-900 line-clamp-2 leading-snug mb-2">{formation.title}</h6>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-violet-700">
            {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
          </span>
          {formation.rating ? (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black text-gray-700">{formation.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function NewCourseGridCard({ formation, i, owned, onOpen }: {
  formation: Formation; i: number; owned: boolean; onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      className="flex flex-col gap-2 group cursor-pointer active:scale-[0.97] transition-transform"
    >
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-indigo-700'} flex items-center justify-center`}>
            <GraduationCap className="h-8 w-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
          Nouveau
        </div>
        {owned && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            Accès
          </div>
        )}
      </div>
      <h6 className="text-[11px] font-black text-gray-900 leading-tight line-clamp-2">{formation.title}</h6>
      <span className="text-sm font-black text-violet-700">
        {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
      </span>
    </motion.div>
  );
}

function ContinueLearningMiniCard({ formation, pct, onResume, onDetails }: {
  formation: Formation; pct: number; onResume: () => void; onDetails: () => void;
}) {
  return (
    <div className="bg-white border border-violet-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3 mb-3">
        <div className="w-[60px] h-[60px] rounded-xl overflow-hidden shrink-0">
          {formation.coverImage ? (
            <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-purple-700'} flex items-center justify-center`}>
              <GraduationCap className="h-6 w-6 text-white/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h5
            className="font-black text-gray-900 text-sm leading-tight mb-0.5 line-clamp-2 cursor-pointer hover:text-violet-700 transition-colors"
            onClick={onDetails}
          >
            {formation.title}
          </h5>
          <p className="text-[11px] text-gray-400 font-semibold">{100 - pct}% restant</p>
          <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
            />
          </div>
          <p className="text-right text-[10px] font-black text-violet-600 mt-0.5">{pct}% complété</p>
        </div>
      </div>
      <button
        onClick={onResume}
        className="w-full bg-violet-50 text-violet-700 border border-violet-100 font-black text-xs py-2.5 rounded-xl hover:bg-violet-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
      >
        <Play className="h-3.5 w-3.5 fill-violet-700" /> Reprendre
      </button>
    </div>
  );
}
