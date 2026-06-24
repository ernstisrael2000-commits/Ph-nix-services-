import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Youtube, Instagram, Facebook, TrendingUp, Star, ChevronDown,
  Check, ArrowRight, Users, BarChart3, Zap, Shield, Clock,
  MessageCircle, Play, Target, Award, Globe, Sparkles,
  Home, ClipboardList, User, Package, CheckCircle2, XCircle,
  Search, X, ChevronLeft, Wallet, Pause, Volume2, VolumeX,
} from 'lucide-react';
import { Client } from '../types';
import UserAuthModal from './UserAuthModal';

// ─── TikTok icon ──────────────────────────────────────────────────────────────
const TikTokIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

// ─── Static platform config ───────────────────────────────────────────────────
const STATIC_PLATFORMS = [
  { key: 'youtube',  label: 'YouTube',   icon: Youtube,   gradient: 'from-red-500 to-rose-600',    lightBg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-600' },
  { key: 'tiktok',   label: 'TikTok',    icon: null,      gradient: 'from-gray-800 to-gray-900',   lightBg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-800' },
  { key: 'instagram',label: 'Instagram', icon: Instagram, gradient: 'from-pink-500 to-purple-600', lightBg: 'bg-pink-50',   border: 'border-pink-200',  text: 'text-pink-600' },
  { key: 'facebook', label: 'Facebook',  icon: Facebook,  gradient: 'from-blue-500 to-blue-700',   lightBg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-600' },
];

const STATIC_SERVICES: Record<string, Record<string, Array<{ name: string; description: string; pricePerUnit: number; unit: string; minQty: number; maxQty: number; popular: boolean }>>> = {
  youtube: {
    Abonnés:     [{ name: 'Abonnés Organiques', description: 'Vrais abonnés actifs', pricePerUnit: 5, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:        [{ name: 'Vues Haute Rétention', description: 'Vues longue durée', pricePerUnit: 0.12, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:       [{ name: 'Likes Authentiques', description: 'Likes réels', pricePerUnit: 1, unit: 'likes', minQty: 100, maxQty: 10000, popular: false }],
    Commentaires:[{ name: 'Commentaires Personnalisés', description: 'Commentaires en créole/français', pricePerUnit: 20, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  tiktok: {
    Abonnés:     [{ name: 'Followers TikTok', description: 'Vrais followers actifs', pricePerUnit: 3.6, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:        [{ name: 'Vues Rapides', description: 'Boost de visibilité immédiat', pricePerUnit: 0.09, unit: 'vues', minQty: 1000, maxQty: 1000000, popular: false }],
    Likes:       [{ name: 'Cœurs TikTok', description: 'Likes authentiques', pricePerUnit: 0.6, unit: 'likes', minQty: 100, maxQty: 50000, popular: false }],
    Commentaires:[{ name: 'Commentaires TikTok', description: 'Commentaires en créole/français', pricePerUnit: 18, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  instagram: {
    Abonnés:     [{ name: 'Abonnés Instagram', description: 'Followers réels', pricePerUnit: 4, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:        [{ name: 'Vues Stories/Reels', description: 'Vues de qualité', pricePerUnit: 0.1, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:       [{ name: 'Likes Instagram', description: 'Engagements authentiques', pricePerUnit: 0.7, unit: 'likes', minQty: 100, maxQty: 20000, popular: false }],
    Commentaires:[{ name: 'Commentaires Personnalisés', description: 'Commentaires réels', pricePerUnit: 18, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  facebook: {
    Abonnés:     [{ name: 'Abonnés Page', description: 'Fans engagés', pricePerUnit: 3, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: false }],
    Vues:        [{ name: 'Vues Vidéo', description: 'Boost de publication', pricePerUnit: 0.08, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:       [{ name: 'Likes & Réactions', description: 'Engagements de qualité', pricePerUnit: 0.65, unit: 'likes', minQty: 100, maxQty: 20000, popular: true }],
    Commentaires:[{ name: 'Commentaires Facebook', description: 'Commentaires en créole/français', pricePerUnit: 15, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
    Partages:    [{ name: 'Partages Organiques', description: 'Partages réels', pricePerUnit: 5, unit: 'partages', minQty: 50, maxQty: 5000, popular: false }],
  },
};

const CATEGORIES_BY_PLATFORM: Record<string, string[]> = {
  youtube:   ['Abonnés', 'Vues', 'Likes', 'Commentaires'],
  tiktok:    ['Abonnés', 'Vues', 'Likes', 'Commentaires'],
  instagram: ['Abonnés', 'Vues', 'Likes', 'Commentaires'],
  facebook:  ['Abonnés', 'Vues', 'Likes', 'Commentaires', 'Partages'],
};

const TESTIMONIALS = [
  { name: 'Jean-Marc D.', role: 'Créateur YouTube', text: 'Phénix Réseaux a boosté ma chaîne de 0 à 15K abonnés en 2 mois. Incroyable !', stars: 5, avatar: 'J' },
  { name: 'Marie S.', role: 'Business Owner', text: 'Mes ventes ont doublé grâce aux campagnes Instagram. ROI exceptionnel.', stars: 5, avatar: 'M' },
  { name: 'Patrick L.', role: 'Influenceur TikTok', text: 'Les vues sont réelles, l\'engagement authentique. Je recommande à 100% !', stars: 5, avatar: 'P' },
];

const FEATURES = [
  { icon: Shield, title: 'Résultats garantis', desc: '100% authentique, conforme aux règles des plateformes.' },
  { icon: Zap, title: 'Livraison rapide', desc: 'Démarrage en moins de 24h après confirmation.' },
  { icon: BarChart3, title: 'Analytics temps réel', desc: 'Dashboard de suivi complet de vos campagnes.' },
  { icon: Clock, title: 'Support 24/7', desc: 'Notre équipe est disponible à tout moment.' },
  { icon: Globe, title: 'Multi-plateforme', desc: 'YouTube, TikTok, Instagram, Facebook et plus.' },
  { icon: Award, title: 'Prix compétitifs', desc: 'Meilleurs tarifs du marché haïtien.' },
];

const FAQS = [
  { q: 'Èske kont mwen sè otantik ?', a: 'Wi, tout abonnés ak engagements nou livre yo soti nan vrèman kont reyèl. Nou pa janm itilize bots oswa faux comptes.' },
  { q: 'Konbyen tan li pran pou wè rezilta ?', a: 'Rezilta yo kòmanse parèt nan 24 a 72 èdtan apre konfirmasyon lòd ou.' },
  { q: 'Èske sèvis ou yo an sekirite pou kont mwen ?', a: 'Absoliman. Metòd nou yo respekte tout règleman platefòm yo. Kont ou pa an risk.' },
  { q: 'Ki metòd peman ou aksepte ?', a: 'Nou aksepte MonCash, SafacilPay, ak Wallet Phénix.' },
  { q: 'Èske gen garanti rembourseman ?', a: 'Wi, si ou pa resevwa sèvis ou nan 7 jou, nou ofri rembourseman konplè.' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: 'text-amber-600 bg-amber-50 border-amber-200',       icon: <Clock className="h-3 w-3" /> },
  active:    { label: 'En cours',   color: 'text-blue-600 bg-blue-50 border-blue-200',           icon: <Zap className="h-3 w-3" /> },
  completed: { label: 'Terminé',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',  icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Annulé',     color: 'text-red-500 bg-red-50 border-red-200',              icon: <XCircle className="h-3 w-3" /> },
};

const MOCK_ORDERS = [
  { id: 'ORD-001', service: 'Abonnés YouTube', platform: 'youtube', amount: 2500, status: 'completed', date: '2026-06-20', qty: '500 abonnés' },
  { id: 'ORD-002', service: 'Vues TikTok', platform: 'tiktok', amount: 900, status: 'active', date: '2026-06-22', qty: '10K vues' },
];

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 2200, prefix = '', suffix = '' }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    let startTs: number | null = null;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const rawProgress = Math.min(elapsed / duration, 1);
      // Ease out quintic with micro-jitter for odometer feel
      const eased = 1 - Math.pow(1 - rawProgress, 5);
      const jitter = rawProgress < 0.85 ? Math.random() * 0.04 - 0.02 : 0;
      const val = Math.floor(Math.max(0, Math.min(eased + jitter, 1)) * target);
      setCount(val);
      if (rawProgress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Video section component ──────────────────────────────────────────────────
function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  return (
    <div className="rounded-3xl overflow-hidden relative aspect-video bg-gray-900 group shadow-lg mb-5">
      <video
        ref={videoRef}
        src="/intro-platform.mp4"
        className="w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        onEnded={() => setPlaying(false)}
      />
      {/* Overlay gradient */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />
      
      {/* Play/pause */}
      <button
        onClick={toggle}
        className="absolute inset-0 flex items-center justify-center"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        <motion.div
          animate={{ scale: playing ? 0.85 : 1, opacity: playing ? 0 : 1 }}
          className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl"
        >
          <Play className="h-7 w-7 text-gray-900 ml-0.5" />
        </motion.div>
      </button>

      {/* Mute toggle */}
      <button
        onClick={e => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
        className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-black text-sm drop-shadow">Comment ça marche ?</p>
        <p className="text-white/70 text-xs drop-shadow mt-0.5">Découvrez Phénix Réseaux en 60 secondes</p>
      </div>
    </div>
  );
}

// ─── Platform icon helper ─────────────────────────────────────────────────────
function PlatformIcon({ pKey, className = 'h-5 w-5' }: { pKey: string; className?: string }) {
  if (pKey === 'tiktok') return <TikTokIcon className={className} />;
  const plt = STATIC_PLATFORMS.find(p => p.key === pKey);
  if (!plt?.icon) return null;
  const Icon = plt.icon;
  return <Icon className={className} />;
}

// ─── Dashboard for logged-in users ───────────────────────────────────────────
function PromotionDashboard({ client, onOpenWallet }: { client: Client; onOpenWallet: () => void }) {
  const [tab, setTab] = useState<'home' | 'orders' | 'profile'>('home');
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [activeCategory, setActiveCategory] = useState('Abonnés');
  const [apiServices, setApiServices] = useState<any[]>([]);
  const [apiPlatforms, setApiPlatforms] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [orderModal, setOrderModal] = useState<{ svc: any; qty: number } | null>(null);

  // Load platforms + services from API
  useEffect(() => {
    setLoadingServices(true);
    Promise.all([
      fetch('/api/promotion/platforms').then(r => r.json()).catch(() => ({ platforms: [] })),
      fetch('/api/promotion/services').then(r => r.json()).catch(() => ({ services: [] })),
    ]).then(([pData, sData]) => {
      setApiPlatforms(pData.platforms || []);
      setApiServices(sData.services || []);
    }).finally(() => setLoadingServices(false));
  }, []);

  // Merge API data with static config
  const platforms = apiPlatforms.length > 0
    ? apiPlatforms.map(ap => ({ ...STATIC_PLATFORMS.find(sp => sp.key === ap.key), ...ap }))
    : STATIC_PLATFORMS;

  const getPlatformConfig = (pKey: string) => STATIC_PLATFORMS.find(p => p.key === pKey) || STATIC_PLATFORMS[0];

  // Get categories for current platform
  const getCategories = (pKey: string): string[] => {
    if (apiServices.length > 0) {
      const cats = [...new Set(apiServices.filter(s => s.platformKey === pKey).map(s => s.category))];
      return cats.length > 0 ? cats : (CATEGORIES_BY_PLATFORM[pKey] || ['Abonnés', 'Vues', 'Likes']);
    }
    return CATEGORIES_BY_PLATFORM[pKey] || ['Abonnés', 'Vues', 'Likes'];
  };

  // Get services for current platform + category
  const getServices = (pKey: string, cat: string) => {
    if (apiServices.length > 0) {
      return apiServices.filter(s => s.platformKey === pKey && s.category === cat);
    }
    return (STATIC_SERVICES[pKey]?.[cat] || []).map((s, i) => ({ ...s, id: `${pKey}-${cat}-${i}` }));
  };

  // Search filter across all platforms/categories
  const searchResults = search.length >= 2
    ? Object.entries(STATIC_SERVICES).flatMap(([pKey, cats]) =>
        Object.entries(cats).flatMap(([cat, svcs]) =>
          svcs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase()))
            .map(s => ({ ...s, pKey, cat, id: `search-${pKey}-${cat}-${s.name}` }))
        )
      )
    : [];

  const categories = getCategories(activePlatform);
  const currentServices = getServices(activePlatform, activeCategory);
  const activePlt = getPlatformConfig(activePlatform);

  const totalPrice = orderModal ? Math.round(orderModal.svc.pricePerUnit * orderModal.qty) : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top tab bar */}
      <div className="bg-white border-b sticky top-14 z-10 shadow-sm">
        <div className="flex items-center justify-around max-w-2xl mx-auto px-2">
          {[
            { key: 'home' as const, icon: Home, label: 'Accueil' },
            { key: 'orders' as const, icon: Package, label: 'Commandes' },
            { key: 'profile' as const, icon: User, label: 'Profil' },
          ].map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`relative flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-primary' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 1.75} />
                <span className={`text-[10px] font-bold leading-none ${active ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
                {active && (
                  <motion.div layoutId="promotion-tab-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6">
        <AnimatePresence mode="wait">

          {/* ─ Home tab ─ */}
          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="pt-4">

              {/* Video section */}
              <VideoSection />

              {/* Search bar */}
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un service..."
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search results */}
              <AnimatePresence>
                {search.length >= 2 && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5 space-y-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      {searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    {searchResults.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400">Aucun service trouvé</div>
                    ) : (
                      searchResults.map((svc, i) => {
                        const plt = getPlatformConfig(svc.pKey);
                        return (
                          <ServiceCard key={i} svc={{ ...svc, pricePerUnit: svc.pricePerUnit }} plt={plt} onOrder={(s) => setOrderModal({ svc: s, qty: s.minQty || 100 })} />
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {search.length < 2 && (
                <>
                  {/* Platform selector */}
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Plateforme</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                    {platforms.map((p: any) => {
                      const cfg = getPlatformConfig(p.key);
                      const isActive = activePlatform === p.key;
                      return (
                        <button key={p.key} onClick={() => { setActivePlatform(p.key); setActiveCategory(getCategories(p.key)[0]); }}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border font-bold text-xs shrink-0 transition-all ${
                            isActive ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent shadow-md` : `${cfg.lightBg} ${cfg.border} ${cfg.text}`
                          }`}>
                          <PlatformIcon pKey={p.key} className="h-3.5 w-3.5" />
                          {p.label || p.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Category selector */}
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Catégorie</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all ${
                          activeCategory === cat
                            ? `bg-gradient-to-r ${activePlt.gradient} text-white border-transparent shadow-sm`
                            : `${activePlt.lightBg} ${activePlt.border} ${activePlt.text}`
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Services */}
                  <AnimatePresence mode="wait">
                    <motion.div key={`${activePlatform}-${activeCategory}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3">
                      {loadingServices ? (
                        <div className="flex justify-center py-8"><div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
                      ) : currentServices.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                          <p className="text-sm text-gray-400 font-semibold">Aucun service disponible</p>
                        </div>
                      ) : (
                        currentServices.map((svc: any, i: number) => (
                          <ServiceCard key={svc.id || i} svc={svc} plt={activePlt} onOrder={(s) => setOrderModal({ svc: s, qty: s.minQty || 100 })} />
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {/* ─ Orders tab ─ */}
          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-4">
              <h2 className="font-black text-gray-900 text-base mb-4">Mes Commandes</h2>
              {MOCK_ORDERS.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune commande</p>
                  <button onClick={() => setTab('home')} className="mt-4 text-primary text-sm font-black hover:underline">Passer une commande →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_ORDERS.map(order => {
                    const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    const plt = getPlatformConfig(order.platform);
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-black text-gray-900 text-sm">{order.service}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{order.qty} · {order.date}</p>
                          </div>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black ${status.color}`}>
                            {status.icon}{status.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl ${plt.lightBg} ${plt.text} text-[10px] font-bold border ${plt.border}`}>
                            <PlatformIcon pKey={order.platform} className="h-3 w-3" />{plt.label}
                          </span>
                          <p className="font-black text-gray-900 text-sm">{order.amount.toLocaleString()} HTG</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─ Profile tab ─ */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-4">
              <div className="flex flex-col items-center py-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-indigo-200 mb-3">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-black text-gray-900 text-lg">{client.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Membre Phénix Réseaux</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[{ val: MOCK_ORDERS.length, label: 'Commandes' }, { val: MOCK_ORDERS.filter(o => o.status === 'completed').length, label: 'Complétées' }, { val: MOCK_ORDERS.filter(o => o.status === 'active').length, label: 'En cours' }].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{s.val}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <button onClick={onOpenWallet} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-primary" /></div>
                  Voir mon portefeuille
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
                </button>
                <a href="https://wa.me/50944009339" target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center"><MessageCircle className="h-4 w-4 text-emerald-600" /></div>
                  Contacter le support
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Order modal ── */}
      <AnimatePresence>
        {orderModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
            onClick={() => setOrderModal(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-black text-gray-900 text-base mb-1">{orderModal.svc.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{orderModal.svc.description}</p>

              {/* Quantity input */}
              <div className="mb-4">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest block mb-2">
                  Quantité ({orderModal.svc.unit})
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setOrderModal(m => m ? { ...m, qty: Math.max(m.svc.minQty || 100, m.qty - Math.ceil(m.svc.minQty / 5 || 100)) } : null)}
                    className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-colors text-lg">−</button>
                  <input
                    type="number"
                    value={orderModal.qty}
                    onChange={e => {
                      const v = Math.max(orderModal.svc.minQty || 0, Math.min(orderModal.svc.maxQty || 999999, Number(e.target.value) || 0));
                      setOrderModal(m => m ? { ...m, qty: v } : null);
                    }}
                    min={orderModal.svc.minQty}
                    max={orderModal.svc.maxQty}
                    className="flex-1 text-center font-black text-gray-900 text-base border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button onClick={() => setOrderModal(m => m ? { ...m, qty: Math.min(m.svc.maxQty || 999999, m.qty + Math.ceil(m.svc.minQty / 5 || 100)) } : null)}
                    className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-colors text-lg">+</button>
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-semibold">
                  <span>Min: {(orderModal.svc.minQty || 100).toLocaleString()}</span>
                  <span>Max: {(orderModal.svc.maxQty || 100000).toLocaleString()}</span>
                </div>
              </div>

              {/* Price summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Prix unitaire</span>
                  <span className="font-bold">{orderModal.svc.pricePerUnit} HTG/{orderModal.svc.unit}</span>
                </div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Quantité</span>
                  <span className="font-bold">{orderModal.qty.toLocaleString()} {orderModal.svc.unit}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="font-black text-gray-900 text-base">{totalPrice.toLocaleString()} HTG</span>
                </div>
              </div>

              <button onClick={() => { setOrderModal(null); onOpenWallet(); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:opacity-90 transition-all active:scale-95">
                Payer {totalPrice.toLocaleString()} HTG avec mon Wallet
              </button>
              <button onClick={() => setOrderModal(null)} className="w-full mt-2 py-2.5 text-sm text-gray-400 font-semibold">Annuler</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({ svc, plt, onOrder }: { svc: any; plt: ReturnType<typeof STATIC_PLATFORMS.find>; onOrder: (s: any) => void }) {
  if (!plt) return null;
  return (
    <div className={`relative bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${svc.popular ? 'border-primary/30 ring-1 ring-primary/20' : 'border-gray-100'}`}>
      {svc.popular && (
        <span className="absolute -top-2 left-3 px-2.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-black uppercase">Populaire</span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-sm leading-tight">{svc.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{svc.description}</p>
        </div>
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${plt.gradient} flex items-center justify-center text-white shrink-0`}>
          <PlatformIcon pKey={plt.key} className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end justify-between mt-3">
        <div>
          <p className="text-base font-black text-gray-900">{svc.pricePerUnit} HTG<span className="text-xs font-semibold text-gray-400">/{svc.unit}</span></p>
          <p className="text-[10px] text-gray-400">Min {(svc.minQty || 100).toLocaleString()} {svc.unit}</p>
        </div>
        <button onClick={() => onOrder(svc)}
          className={`px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${plt.gradient} hover:opacity-90 transition-all active:scale-95 shadow-sm`}>
          Commander
        </button>
      </div>
    </div>
  );
}

// ─── Public landing page ──────────────────────────────────────────────────────
function PromotionLanding({ onLogin }: { onLogin: () => void }) {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 40%, #ea580c 70%, #7c3aed 100%)' }}>
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 left-1/4 w-80 h-80 bg-yellow-400/15 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1.1, 0.9, 1.1], rotate: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs font-bold uppercase tracking-widest text-white">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              Marketing Digital Haïti
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-center text-3xl sm:text-5xl font-black leading-tight mb-4 text-white">
            Boost Présentasyon Ou Sou<br />
            <span className="bg-gradient-to-r from-yellow-300 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
              Rézo Sosyal Ou !
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-center text-white/75 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Augmentez votre visibilité sur YouTube, TikTok, Instagram et Facebook avec des campagnes 100% authentiques.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button onClick={onLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-purple-700 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
              Kòmanse Gratis <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => document.getElementById('promo-services')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              <Play className="h-4 w-4" /> Voir les services
            </button>
          </motion.div>

          {/* Animated stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            {[{ target: 128000, suffix: '+', label: 'Abonnés livrés' }, { target: 85000, suffix: '+', label: 'Clients satisfaits' }, { target: 53000, suffix: '+', label: 'Campagnes' }].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </p>
                <p className="text-[10px] sm:text-xs text-white/50 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" className="w-full" preserveAspectRatio="none">
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Platform services ── */}
      <section id="promo-services" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Platfòm Nou Sipòte</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choisissez votre plateforme</h2>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {STATIC_PLATFORMS.map(p => {
            const active = activePlatform === p.key;
            return (
              <button key={p.key} onClick={() => setActivePlatform(p.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                  active ? `border-transparent text-white shadow-lg bg-gradient-to-r ${p.gradient}` : `${p.border} ${p.lightBg} ${p.text}`
                }`}>
                <PlatformIcon pKey={p.key} className="h-5 w-5" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Category tabs */}
        {(() => {
          const plt = STATIC_PLATFORMS.find(p => p.key === activePlatform)!;
          const cats = CATEGORIES_BY_PLATFORM[activePlatform] || [];
          return (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-5 justify-center flex-wrap">
                {cats.map(cat => (
                  <span key={cat} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${plt.lightBg} ${plt.border} ${plt.text}`}>{cat}</span>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={activePlatform} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                  className="grid sm:grid-cols-2 gap-4">
                  {Object.values(STATIC_SERVICES[activePlatform] || {}).flat().slice(0, 4).map((svc, i) => (
                    <div key={i} className={`relative rounded-3xl border p-5 transition-all hover:shadow-lg ${svc.popular ? 'border-primary/30 bg-primary/3 ring-1 ring-primary/20' : 'border-gray-100 bg-white'}`}>
                      {svc.popular && <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase shadow-sm">Populaire</span>}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-black text-gray-900 text-sm">{svc.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
                        </div>
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${plt.gradient} flex items-center justify-center text-white shrink-0 ml-3`}>
                          <PlatformIcon pKey={activePlatform} className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xl font-black text-gray-900">{svc.pricePerUnit} HTG<span className="text-xs text-gray-400 font-semibold">/{svc.unit}</span></p>
                          <p className="text-[10px] text-gray-400">Min {svc.minQty.toLocaleString()} {svc.unit}</p>
                        </div>
                        <button onClick={onLogin}
                          className={`px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${plt.gradient} hover:opacity-90 transition-all active:scale-95 shadow-sm`}>
                          Commander
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          );
        })()}
      </section>

      {/* ── Animated stats banner ── */}
      <section style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)' }} className="text-white py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[{ target: 25000, suffix: '+', label: 'Commandes' }, { target: 500, suffix: '+', label: 'Campagnes actives' }, { target: 49, prefix: '4.', label: 'Note ★' }, { target: 24, suffix: '/7', label: 'Support' }].map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-black">
                <AnimatedCounter target={s.target} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="text-xs text-white/70 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">3 Etap Fasil</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Kijan li travay ?</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[{ n: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement. Aucune carte bancaire requise.', icon: Users },
            { n: '02', title: 'Choisissez un service', desc: 'Sélectionnez la plateforme, catégorie et définissez votre budget.', icon: Target },
            { n: '03', title: 'Recevez vos résultats', desc: 'Votre campagne démarre immédiatement. Suivez en temps réel.', icon: BarChart3 }].map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative text-center p-6 rounded-3xl border border-gray-100 bg-white hover:shadow-md transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black">{step.n}</div>
              <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-black text-gray-900 text-sm mb-2">{step.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Poukisa chwazi Phénix Réseaux ?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <feat.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-black text-gray-900 text-xs mb-1">{feat.title}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Témoignages clients</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-md transition-all">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0">{t.avatar}</div>
                <div>
                  <p className="text-xs font-black text-gray-900">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Questions fréquentes</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-gray-900 text-sm hover:bg-gray-50 transition-colors">
                <span>{faq.q}</span>
                <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-14 px-4 text-white text-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #ea580c 100%)' }}>
        <div className="max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-yellow-300 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Pare a kòmanse grandi ?</h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">Rejoignez des milliers de créateurs qui ont boosté leur présence avec Phénix Réseaux.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onLogin}
              className="px-8 py-3.5 rounded-2xl bg-white text-purple-700 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
              Démarrer maintenant <ArrowRight className="h-4 w-4" />
            </button>
            <a href="https://wa.me/50944009339" target="_blank" rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-2xl border border-white/25 bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
interface ReseauxViewProps {
  loggedClient: Client | null;
  onRequestAuth: () => void;
  onOpenWallet: () => void;
  onBack: () => void;
  onClientLogin: (client: Client) => void;
}

export default function ReseauxView({ loggedClient, onRequestAuth, onOpenWallet, onBack, onClientLogin }: ReseauxViewProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loggedClient) {
    return <PromotionDashboard client={loggedClient} onOpenWallet={onOpenWallet} />;
  }

  return (
    <>
      <PromotionLanding onLogin={() => setShowAuthModal(true)} />
      <UserAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onClientLogin={client => { onClientLogin(client); setShowAuthModal(false); }}
        onAdminLogin={() => setShowAuthModal(false)}
        onAffiliateAccess={() => setShowAuthModal(false)}
        onAdminPasswordLogin={() => setShowAuthModal(false)}
      />
    </>
  );
}
