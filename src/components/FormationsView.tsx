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
  BookMarked, ArrowRight, Shield
} from 'lucide-react';
import CoursePlayer from './CoursePlayer';
import { Button } from './ui/button';
import { Formation, FormationModule, FormationChapter } from '../types';
import { Client } from '../types';
import { toast } from 'sonner';
import { useSettings } from '../services/parcelService';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FormationsViewProps {
  loggedClient: Client | null;
  onOpenWallet: () => void;
  activeTab: 'all' | 'my';
  onTabChange: (tab: 'all' | 'my') => void;
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
  try { return JSON.parse(localStorage.getItem('neopay_favorites') || '[]'); } catch { return []; }
}
function setFavorites(ids: string[]) {
  try { localStorage.setItem('neopay_favorites', JSON.stringify(ids)); } catch {}
}

type PaymentStep = 'detail' | 'external-method' | 'form' | 'done';

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FormationsView({ loggedClient, onOpenWallet, activeTab, onTabChange }: FormationsViewProps) {
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

  // ── Open detail ─────────────────────────────────────────────────────────────
  const openDetail = (f: Formation) => {
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
    if ((loggedClient.balance ?? 0) < (formation.price ?? 0)) {
      toast.error(`Solde insuffisant. Vous avez ${(loggedClient.balance ?? 0).toLocaleString()} HTG.`); return;
    }
    setPurchasing(true);
    try {
      const res = await fetch('/api/formations/purchases/wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: loggedClient.id, clientName: loggedClient.name, formationId: formation.id, formationTitle: formation.title, amount: formation.price }),
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
        `Bonjour Neopay 👋\n\nJe viens d'effectuer un paiement pour une formation :\n\n` +
        `👤 Nom: *${payFormData.name}*\n📧 Email: *${payFormData.email}*\n` +
        `🎓 Cours: *${selected.title}*\n💳 Méthode: *${methodLabel}*\n` +
        `💰 Montant: *${(selected.price || 0).toLocaleString()} HTG*\n` +
        `🔖 Code transaction: *${payFormData.transactionCode}*\n\nMerci de valider mon accès.`
      );
      setTimeout(() => { window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank'); }, 800);
    } catch (err: any) { toast.error(err.message); } finally { setSubmittingPayment(false); }
  };

  // ── Render: Player ──────────────────────────────────────────────────────────
  if (playerFormation && loggedClient) {
    return <CoursePlayer formation={playerFormation} loggedClient={loggedClient} onBack={() => setPlayerFormation(null)} />;
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
        onPlay={() => { closeDetail(); setPlayerFormation(selected); }}
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
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #7C3AED 0%, transparent 50%), radial-gradient(circle at 75% 20%, #3B82F6 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-violet-500/20 text-violet-300 text-xs font-bold rounded-full border border-violet-500/30 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Formations Neopay
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
              Élevez vos compétences<br />
              <span className="text-violet-400">vers l'excellence</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl">
              Accédez à des formations de classe mondiale conçues par les meilleurs experts de l'industrie.
            </p>

            {/* Search bar */}
            <div className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Design, Tech, Business..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:bg-white/15 transition-all"
                />
              </div>
              <button
                onClick={() => { if (searchQuery) {} }}
                className="h-12 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors text-sm shrink-0"
              >
                Chercher
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-8 text-sm">
              {[
                { label: 'Formations', value: formations.length + '+' },
                { label: 'Cours gratuits', value: freeCourses.length + '' },
                { label: 'Apprenants', value: formations.reduce((s, f) => s + (f.studentsCount || 0), 0).toLocaleString() + '+' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-gray-400">
                  <span className="text-white font-black text-lg">{s.value}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">

          {/* ── ALL COURSES TAB ──────────────────────────────────────────── */}
          {activeTab === 'all' && (
            <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Filters panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Niveau</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['all', 'debutant', 'intermediaire', 'avance'].map(lvl => (
                              <button key={lvl} onClick={() => setFilterLevel(lvl)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filterLevel === lvl ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'}`}>
                                {lvl === 'all' ? 'Tous' : levelLabels[lvl]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {categories.length > 2 && (
                          <div>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Catégorie</p>
                            <div className="flex flex-wrap gap-1.5">
                              {categories.map(cat => (
                                <button key={cat} onClick={() => setFilterCategory(cat)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filterCategory === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200 hover:border-slate-300'}`}>
                                  {cat === 'all' ? 'Toutes' : cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── My courses in progress (if logged) */}
              {loggedClient && myCourses.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-gray-900">Continuer l'apprentissage</h2>
                    <button onClick={() => onTabChange('my')} className="text-sm text-violet-600 font-bold hover:underline flex items-center gap-1">
                      Voir tout <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myCourses.slice(0, 3).map((f, i) => (
                      <InProgressCard key={f.id} formation={f} pct={progressMap[f.id!] ?? 0} onContinue={() => { closeDetail(); setPlayerFormation(f); }} onDetails={() => openDetail(f)} i={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Search results mode */}
              {searchQuery ? (
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-5">
                    {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour "<span className="text-violet-600">{searchQuery}</span>"
                  </p>
                  {filtered.length === 0 ? (
                    <EmptyState icon={<Search className="h-10 w-10" />} title="Aucun résultat" sub="Essayez un autre mot-clé ou modifiez vos filtres." />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filtered.map((f, i) => <CourseCard key={f.id} formation={f} i={i} owned={isOwned(f)} fav={isFav(f)} disc={discount(f)} onOpen={() => openDetail(f)} onFav={(e) => toggleFavorite(f, e)} />)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* ── Les plus populaires */}
                  <Section title="Les plus populaires" icon={<TrendingUp className="h-5 w-5 text-violet-600" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {popularCourses.map((f, i) => <CourseCard key={f.id} formation={f} i={i} owned={isOwned(f)} fav={isFav(f)} disc={discount(f)} onOpen={() => openDetail(f)} onFav={(e) => toggleFavorite(f, e)} />)}
                    </div>
                  </Section>

                  {/* ── Cours gratuits */}
                  {freeCourses.length > 0 && (
                    <Section title="Cours gratuits" icon={<Zap className="h-5 w-5 text-emerald-500" />}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {freeCourses.slice(0, 6).map((f, i) => <CourseCard key={f.id} formation={f} i={i} owned={isOwned(f)} fav={isFav(f)} disc={discount(f)} onOpen={() => openDetail(f)} onFav={(e) => toggleFavorite(f, e)} />)}
                      </div>
                    </Section>
                  )}

                  {/* ── Nouveautés */}
                  {newCourses.length > 0 && (
                    <Section title="Nouveautés" icon={<Sparkles className="h-5 w-5 text-amber-500" />}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newCourses.map((f, i) => <CourseCard key={f.id} formation={f} i={i} owned={isOwned(f)} fav={isFav(f)} disc={discount(f)} onOpen={() => openDetail(f)} onFav={(e) => toggleFavorite(f, e)} />)}
                      </div>
                    </Section>
                  )}

                  {/* ── CTA Banner */}
                  <div className="mt-12 bg-gradient-to-br from-slate-900 to-violet-950 rounded-3xl p-8 sm:p-12 text-center text-white">
                    <h3 className="text-2xl sm:text-3xl font-black mb-3">Prêt à transformer votre carrière ?</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Rejoignez plus de {formations.reduce((s, f) => s + (f.studentsCount || 0), 0).toLocaleString()} apprenants et accédez à l'intégralité du catalogue.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button onClick={() => setSearchQuery('')} className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold transition-colors">
                        Commencer maintenant
                      </button>
                      {!loggedClient && (
                        <button onClick={onOpenWallet} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors border border-white/20">
                          Se connecter
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── MY COURSES TAB ───────────────────────────────────────────── */}
          {activeTab === 'my' && (
            <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!loggedClient ? (
                <div className="text-center py-24">
                  <div className="bg-violet-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-violet-100">
                    <Lock className="h-9 w-9 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Connectez-vous pour accéder à vos cours</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Votre espace personnel vous permet de retrouver tous vos cours achetés et votre progression.</p>
                  <Button onClick={onOpenWallet} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                    Se connecter
                  </Button>
                </div>
              ) : myCourses.length === 0 ? (
                <div className="text-center py-24">
                  <div className="bg-violet-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-violet-100">
                    <BookOpen className="h-9 w-9 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Vous n'avez pas encore de cours</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Explorez notre catalogue et démarrez votre apprentissage dès aujourd'hui.</p>
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
                  onPlay={(f) => { setPlayerFormation(f); }}
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
    <div className="mb-12">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="bg-gray-100 rounded-lg p-1.5">{icon}</div>
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <div className="mb-4 mx-auto opacity-30">{icon}</div>
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.35 }}
      onClick={onOpen}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col"
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden shrink-0">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${levelGradients[formation.level] || 'from-violet-500 to-purple-700'}`}>
            <GraduationCap className="h-16 w-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {formation.price === 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white">Gratuit</span>
          )}
          {disc > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white">-{disc}%</span>
          )}
          {formation.hasCertificate && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
              <BadgeCheck className="h-2.5 w-2.5" /> Certifiant
            </span>
          )}
        </div>

        {/* Favorite */}
        <button onClick={onFav}
          className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${fav ? 'bg-rose-500 text-white' : 'bg-black/30 text-white/70 hover:bg-black/50'}`}>
          <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-white' : ''}`} />
        </button>

        {/* Owned badge */}
        {owned && (
          <div className="absolute bottom-3 left-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" /> Accès activé
          </div>
        )}

        {/* Play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3.5 shadow-xl">
            <Play className="h-6 w-6 text-violet-700 fill-violet-700" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {formation.category && (
          <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1.5">{formation.category}</span>
        )}
        <h3 className="font-black text-gray-900 text-sm mb-1.5 line-clamp-2 leading-snug">{formation.title}</h3>
        {formation.instructor && (
          <p className="text-xs text-gray-500 mb-2 truncate">{formation.instructor}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          {formation.totalDuration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formation.totalDuration}</span>}
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{(formation.modules || []).length} modules</span>
        </div>
        <div className="mb-3">
          <StarRating rating={formation.rating || 0} size="xs" />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-base font-black text-violet-700">
              {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
            </span>
            {formation.originalPrice && formation.originalPrice > formation.price && (
              <span className="text-xs text-gray-400 line-through ml-1.5">{formation.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <span className="text-xs font-bold text-violet-600 flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            Voir <ChevronRight className="h-3.5 w-3.5" />
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
  onWalletPurchase, onExternalSubmit, moncashNumber, natcashNumber, discount, progressPct
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
  onOpenWallet, moncashNumber, natcashNumber, discount, progressPct
}: any) {

  const hasWalletFunds = loggedClient && (loggedClient.balance ?? 0) >= (formation.price ?? 0);

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
