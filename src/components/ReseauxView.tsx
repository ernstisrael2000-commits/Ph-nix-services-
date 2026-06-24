import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { useSettings } from '../services/parcelService';
import {
  Youtube, Instagram, Facebook, TrendingUp, Star, ChevronLeft,
  Check, ArrowRight, Users, BarChart3, Zap, Shield, Clock,
  MessageCircle, Play, Target, Award, Globe, Sparkles,
  Home, ClipboardList, User, Package, CheckCircle2, XCircle,
  Search, X, Wallet, Volume2, VolumeX, AlertCircle, Loader2,
  Heart, Eye, Share2, ShoppingCart, ChevronRight,
} from 'lucide-react';
import { Client } from '../types';
import { toast } from 'sonner';

// ─── TikTok icon ──────────────────────────────────────────────────────────────
const TikTokIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

const SpotifyIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const TelegramIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const XTwitterIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const GoogleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─── Static platform config ───────────────────────────────────────────────────
const STATIC_PLATFORMS = [
  { key: 'youtube',   label: 'YouTube',   icon: Youtube,      gradient: 'from-red-500 to-rose-600',    lightBg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-600',   iconBg: 'bg-red-50',   iconColor: 'text-red-600' },
  { key: 'tiktok',    label: 'TikTok',    icon: null,         gradient: 'from-gray-800 to-gray-900',   lightBg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-800',  iconBg: 'bg-gray-100', iconColor: 'text-gray-800' },
  { key: 'instagram', label: 'Instagram', icon: Instagram,    gradient: 'from-pink-500 to-purple-600', lightBg: 'bg-pink-50',   border: 'border-pink-200',  text: 'text-pink-600',  iconBg: 'bg-pink-50',  iconColor: 'text-pink-600' },
  { key: 'facebook',  label: 'Facebook',  icon: Facebook,     gradient: 'from-blue-500 to-blue-700',   lightBg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-600',  iconBg: 'bg-blue-50',  iconColor: 'text-blue-600' },
  { key: 'spotify',   label: 'Spotify',   icon: SpotifyIcon,  gradient: 'from-emerald-500 to-teal-600',lightBg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',iconBg:'bg-emerald-50',iconColor:'text-emerald-600'},
  { key: 'telegram',  label: 'Telegram',  icon: TelegramIcon, gradient: 'from-sky-400 to-blue-500',    lightBg: 'bg-sky-50',    border: 'border-sky-200',   text: 'text-sky-600',   iconBg: 'bg-sky-50',   iconColor: 'text-sky-600' },
  { key: 'twitter',   label: 'Twitter/X', icon: XTwitterIcon, gradient: 'from-gray-600 to-gray-800',   lightBg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-800',  iconBg: 'bg-gray-100', iconColor: 'text-gray-700' },
  { key: 'google',    label: 'Google',    icon: GoogleIcon,   gradient: 'from-red-400 to-yellow-400',  lightBg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-700',iconBg: 'bg-orange-50',iconColor: 'text-orange-600'},
];

const STATIC_SERVICES: Record<string, Record<string, Array<{ name: string; description: string; pricePerUnit: number; unit: string; minQty: number; maxQty: number; popular: boolean }>>> = {
  youtube: {
    Abonnés:      [{ name: 'Abonnés Organiques', description: 'Vrais abonnés actifs', pricePerUnit: 5, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:         [{ name: 'Vues Haute Rétention', description: 'Vues longue durée', pricePerUnit: 0.12, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:        [{ name: 'Likes Authentiques', description: 'Likes réels', pricePerUnit: 1, unit: 'likes', minQty: 100, maxQty: 10000, popular: false }],
    Commentaires: [{ name: 'Commentaires Personnalisés', description: 'Commentaires en créole/français', pricePerUnit: 20, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  tiktok: {
    Abonnés:      [{ name: 'Followers TikTok', description: 'Vrais followers actifs', pricePerUnit: 3.6, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:         [{ name: 'Vues Rapides', description: 'Boost de visibilité immédiat', pricePerUnit: 0.09, unit: 'vues', minQty: 1000, maxQty: 1000000, popular: false }],
    Likes:        [{ name: 'Cœurs TikTok', description: 'Likes authentiques', pricePerUnit: 0.6, unit: 'likes', minQty: 100, maxQty: 50000, popular: false }],
    Commentaires: [{ name: 'Commentaires TikTok', description: 'Commentaires en créole/français', pricePerUnit: 18, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  instagram: {
    Abonnés:      [{ name: 'Abonnés Instagram', description: 'Followers réels', pricePerUnit: 4, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: true }],
    Vues:         [{ name: 'Vues Stories/Reels', description: 'Vues de qualité', pricePerUnit: 0.1, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:        [{ name: 'Likes Instagram', description: 'Engagements authentiques', pricePerUnit: 0.7, unit: 'likes', minQty: 100, maxQty: 20000, popular: false }],
    Commentaires: [{ name: 'Commentaires Personnalisés', description: 'Commentaires réels', pricePerUnit: 18, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
  },
  facebook: {
    Abonnés:      [{ name: 'Abonnés Page', description: 'Fans engagés', pricePerUnit: 3, unit: 'abonnés', minQty: 100, maxQty: 10000, popular: false }],
    Vues:         [{ name: 'Vues Vidéo', description: 'Boost de publication', pricePerUnit: 0.08, unit: 'vues', minQty: 1000, maxQty: 500000, popular: false }],
    Likes:        [{ name: 'Likes & Réactions', description: 'Engagements de qualité', pricePerUnit: 0.65, unit: 'likes', minQty: 100, maxQty: 20000, popular: true }],
    Commentaires: [{ name: 'Commentaires Facebook', description: 'Commentaires en créole/français', pricePerUnit: 15, unit: 'commentaires', minQty: 10, maxQty: 500, popular: false }],
    Partages:     [{ name: 'Partages Organiques', description: 'Partages réels', pricePerUnit: 5, unit: 'partages', minQty: 50, maxQty: 5000, popular: false }],
  },
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; gradient: string; lightBg: string; text: string; desc: string }> = {
  'Abonnés':      { icon: Users,         gradient: 'from-violet-500 to-indigo-600',  lightBg: 'bg-violet-50',  text: 'text-violet-700', desc: 'Augmentez votre base de fans' },
  'Followers':    { icon: Users,         gradient: 'from-violet-500 to-indigo-600',  lightBg: 'bg-violet-50',  text: 'text-violet-700', desc: 'Augmentez votre base de fans' },
  'Likes':        { icon: Heart,         gradient: 'from-pink-500 to-rose-600',       lightBg: 'bg-pink-50',    text: 'text-pink-700',   desc: 'Boostez vos engagements' },
  'Cœurs':        { icon: Heart,         gradient: 'from-pink-500 to-rose-600',       lightBg: 'bg-pink-50',    text: 'text-pink-700',   desc: 'Boostez vos engagements' },
  'Vues':         { icon: Eye,           gradient: 'from-blue-500 to-cyan-600',       lightBg: 'bg-blue-50',    text: 'text-blue-700',   desc: 'Maximisez votre visibilité' },
  'Commentaires': { icon: MessageCircle, gradient: 'from-amber-500 to-orange-600',   lightBg: 'bg-amber-50',   text: 'text-amber-700',  desc: 'Générez des interactions' },
  'Boostage':     { icon: Zap,           gradient: 'from-emerald-500 to-teal-600',   lightBg: 'bg-emerald-50', text: 'text-emerald-700',desc: 'Propulsez votre contenu' },
  'Partages':     { icon: Share2,        gradient: 'from-emerald-500 to-teal-600',   lightBg: 'bg-emerald-50', text: 'text-emerald-700',desc: 'Étendez votre portée' },
  'Impressions':  { icon: BarChart3,     gradient: 'from-slate-500 to-gray-700',     lightBg: 'bg-gray-50',    text: 'text-gray-700',   desc: 'Augmentez vos impressions' },
  'Réactions':    { icon: Sparkles,      gradient: 'from-yellow-500 to-amber-600',   lightBg: 'bg-yellow-50',  text: 'text-yellow-700', desc: 'Multipliez les réactions' },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || { icon: Star, gradient: 'from-gray-500 to-gray-700', lightBg: 'bg-gray-50', text: 'text-gray-700', desc: 'Services disponibles' };
}

// ─── Package pricing helper ────────────────────────────────────────────────────
function buildPackages(svc: any): Array<{ qty: number; price: number }> {
  const min = svc.minQty || 100;
  const max = svc.maxQty || 100000;
  const tiers = [1, 5, 10].map(m => min * m).filter(q => q <= max);
  return tiers.map(qty => ({ qty, price: Math.round(svc.pricePerUnit * qty) }));
}

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
      const eased = 1 - Math.pow(1 - rawProgress, 5);
      const jitter = rawProgress < 0.85 ? Math.random() * 0.04 - 0.02 : 0;
      const val = Math.floor(Math.max(0, Math.min(eased + jitter, 1)) * target);
      setCount(val);
      if (rawProgress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Normalise une URL vidéo vers le format embed ────────────────────────────
function normalizeVideoUrl(url: string): string {
  if (!url) return url;
  // youtu.be/VIDEO_ID
  const short = url.match(/youtu\.be\/([^?&]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // youtube.com/watch?v=VIDEO_ID
  const watch = url.match(/youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  // youtube.com/shorts/VIDEO_ID
  const shorts = url.match(/youtube\.com\/shorts\/([^?&]+)/);
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
  return url;
}

// ─── Video section component ──────────────────────────────────────────────────
function VideoSection({ videoUrl }: { videoUrl?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const rawSrc = videoUrl || '';
  const src = normalizeVideoUrl(rawSrc);
  const isEmbed = src.includes('youtube.com/embed') || src.includes('vimeo.com') || src.includes('youtube-nocookie.com');

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  if (isEmbed) {
    return (
      <div className="rounded-3xl overflow-hidden relative aspect-video bg-gray-900 shadow-lg mb-5">
        <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen title="Vidéo d'explication" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden relative aspect-video bg-gray-900 group shadow-lg mb-5">
      <video ref={videoRef} src={src} className="w-full h-full object-cover" loop muted={muted} playsInline onEnded={() => setPlaying(false)} />
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />
      <button onClick={toggle} className="absolute inset-0 flex items-center justify-center" aria-label={playing ? 'Pause' : 'Play'}>
        <motion.div animate={{ scale: playing ? 0.85 : 1, opacity: playing ? 0 : 1 }}
          className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
          <Play className="h-7 w-7 text-gray-900 ml-0.5" />
        </motion.div>
      </button>
      <button onClick={e => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }}
        className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all">
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
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
  if (pKey === 'spotify') return <SpotifyIcon className={className} />;
  if (pKey === 'telegram') return <TelegramIcon className={className} />;
  if (pKey === 'twitter') return <XTwitterIcon className={className} />;
  if (pKey === 'google') return <GoogleIcon className={className} />;
  const plt = STATIC_PLATFORMS.find(p => p.key === pKey);
  if (!plt?.icon) return <span className="font-black text-xs">{pKey.charAt(0).toUpperCase()}</span>;
  const Icon = plt.icon as any;
  return <Icon className={className} />;
}

// ─── Get static config for a platform ────────────────────────────────────────
function getPlatformConfig(pKey: string) {
  return STATIC_PLATFORMS.find(p => p.key === pKey) || {
    key: pKey, label: pKey, icon: null,
    gradient: 'from-indigo-500 to-purple-600', lightBg: 'bg-indigo-50',
    border: 'border-indigo-200', text: 'text-indigo-600',
    iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
  };
}

// ─── Platform grid card ───────────────────────────────────────────────────────
function PlatformCard({ platform, svcCount, onClick }: { platform: any; svcCount: number; onClick: () => void }) {
  const cfg = getPlatformConfig(platform.key);
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all text-center"
    >
      <div className={`h-14 w-14 rounded-2xl ${cfg.iconBg || 'bg-gray-100'} flex items-center justify-center`}>
        <PlatformIcon pKey={platform.key} className={`h-8 w-8 ${cfg.iconColor || 'text-gray-600'}`} />
      </div>
      <div>
        <p className="font-black text-gray-900 text-sm leading-tight">{platform.label || platform.name}</p>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{svcCount} SÉVIS</p>
      </div>
    </motion.button>
  );
}

// ─── Catalog service card ──────────────────────────────────────────────────────
function ServiceCard({ svc, plt, catCfg, onOrder }: { svc: any; plt: any; catCfg: any; onOrder: (s: any) => void }) {
  if (!plt) return null;
  const packages = buildPackages(svc);
  const gradient = catCfg?.gradient || plt.gradient;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-3xl border overflow-hidden transition-all hover:shadow-lg ${svc.popular ? 'border-primary/30 ring-1 ring-primary/20' : 'border-gray-100'}`}
    >
      {svc.popular && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient}`} />
      )}
      {svc.popular && (
        <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase flex items-center gap-1">
          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Populaire
        </span>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 shadow-md`}>
            <PlatformIcon pKey={plt.key} className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm leading-tight">{svc.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{svc.description}</p>
          </div>
        </div>

        {/* Package pricing pills */}
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Packages disponibles</p>
          <div className="space-y-2">
            {packages.map((pkg, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl ${i === 0 ? `${catCfg?.lightBg || 'bg-primary/5'} border border-current/10` : 'bg-gray-50'}`}>
                <span className={`text-xs font-bold ${i === 0 ? catCfg?.text || 'text-primary' : 'text-gray-500'}`}>
                  {pkg.qty.toLocaleString()} {svc.unit}
                </span>
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3 text-gray-300" />
                  <span className={`text-sm font-black ${i === 0 ? catCfg?.text || 'text-primary' : 'text-gray-700'}`}>
                    {pkg.price.toLocaleString()} HTG
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price per unit */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-gray-400 font-semibold">
            {svc.pricePerUnit} HTG / {svc.unit} · max {(svc.maxQty || 100000).toLocaleString()}
          </p>
        </div>

        {/* CTA */}
        <button onClick={() => onOrder(svc)}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white bg-gradient-to-r ${gradient} hover:opacity-90 transition-all active:scale-95 shadow-md`}>
          <ShoppingCart className="h-4 w-4" />
          Choisir ce service
        </button>
      </div>
    </motion.div>
  );
}

// ─── Dashboard for logged-in users ────────────────────────────────────────────
function PromotionDashboard({ client, onOpenWallet }: { client: Client; onOpenWallet: () => void }) {
  const [tab, setTab] = useState<'home' | 'orders' | 'profile'>('home');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [apiServices, setApiServices] = useState<any[]>([]);
  const [apiPlatforms, setApiPlatforms] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderModal, setOrderModal] = useState<{
    svc: any;
    qty: number;
    customFieldValues: Record<string, string>;
    submitting: boolean;
    success: boolean;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const { settings } = useSettings();
  const exchangeRate = settings?.exchangeRate || 146;

  // Listen for tab switch events from burger menu
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.tab) setTab(e.detail.tab);
    };
    window.addEventListener('promotion-nav', handler);
    return () => window.removeEventListener('promotion-nav', handler);
  }, []);

  useEffect(() => {
    setLoadingServices(true);
    Promise.all([
      fetch('/api/promotion/platforms').then(r => r.json()).catch(() => ({ platforms: [] })),
      fetch('/api/promotion/services').then(r => r.json()).catch(() => ({ services: [] })),
      fetch('/api/promotion/settings').then(r => r.json()).catch(() => ({})),
    ]).then(([pData, sData, sett]) => {
      setApiPlatforms(pData.platforms || []);
      setApiServices(sData.services || []);
      if (sett.mainVideoUrl) setMainVideoUrl(sett.mainVideoUrl);
    }).finally(() => setLoadingServices(false));
  }, []);

  const loadMyOrders = useCallback(async () => {
    if (!client.id) return;
    setLoadingOrders(true);
    try {
      const r = await fetch('/api/admin/promotion/orders', { headers: { 'x-admin-secret': 'rena-admin-2024' } });
      const d = await r.json();
      const all = d.orders || [];
      setMyOrders(all.filter((o: any) => o.clientId === client.id));
    } catch {}
    setLoadingOrders(false);
  }, [client.id]);

  useEffect(() => {
    if (tab === 'orders') loadMyOrders();
  }, [tab, loadMyOrders]);

  // Merge API platforms with static config
  const platforms = apiPlatforms.length > 0
    ? apiPlatforms.filter(ap => ap.active !== false).map(ap => ({ ...getPlatformConfig(ap.key), ...ap }))
    : STATIC_PLATFORMS;

  const getCategories = (pKey: string): string[] => {
    if (apiServices.length > 0) {
      const cats = [...new Set(apiServices.filter(s => s.platformKey === pKey && s.active !== false).map(s => s.category))];
      return cats.length > 0 ? cats : Object.keys(STATIC_SERVICES[pKey] || {});
    }
    return Object.keys(STATIC_SERVICES[pKey] || {});
  };

  const getServices = (pKey: string, cat: string) => {
    if (apiServices.length > 0) {
      return apiServices.filter(s => s.platformKey === pKey && s.category === cat && s.active !== false);
    }
    return (STATIC_SERVICES[pKey]?.[cat] || []).map((s, i) => ({ ...s, id: `${pKey}-${cat}-${i}` }));
  };

  const getServiceCount = (pKey: string) => {
    if (apiServices.length > 0) return apiServices.filter(s => s.platformKey === pKey && s.active !== false).length;
    return Object.values(STATIC_SERVICES[pKey] || {}).flat().length;
  };

  const getPlatformCustomFields = (pKey: string): any[] => {
    const p = apiPlatforms.find(ap => ap.key === pKey);
    return p?.customFields || [];
  };

  const getPlatformVideoUrl = (pKey: string): string => {
    const p = apiPlatforms.find(ap => ap.key === pKey);
    return p?.videoUrl || '';
  };

  const activePlatformData = selectedPlatform ? platforms.find(p => p.key === selectedPlatform) || getPlatformConfig(selectedPlatform) : null;
  const categories = selectedPlatform ? getCategories(selectedPlatform) : [];
  const currentServices = selectedPlatform && activeCategory ? getServices(selectedPlatform, activeCategory) : [];

  const openOrderModal = (svc: any) => {
    const fields = selectedPlatform ? getPlatformCustomFields(selectedPlatform) : [];
    const initValues: Record<string, string> = {};
    fields.forEach((f: any) => { initValues[f.label] = ''; });
    setOrderModal({ svc, qty: svc.minQty || 100, customFieldValues: initValues, submitting: false, success: false });
  };

  const submitOrder = async () => {
    if (!orderModal || !client) return;
    const fields = selectedPlatform ? getPlatformCustomFields(selectedPlatform) : [];
    const missing = fields.filter((f: any) => f.required && !orderModal.customFieldValues[f.label]?.trim());
    if (missing.length > 0) {
      toast.error(`Remplissez les champs obligatoires : ${missing.map((f: any) => f.label).join(', ')}`);
      return;
    }

    const totalPriceHTG = Math.round(orderModal.svc.pricePerUnit * orderModal.qty);
    const clientBalanceHTG = Math.round((client.balance ?? 0) * exchangeRate);
    if (clientBalanceHTG < totalPriceHTG) {
      toast.error(`Solde insuffisant — vous avez ${clientBalanceHTG.toLocaleString()} HTG, mais la commande coûte ${totalPriceHTG.toLocaleString()} HTG. Veuillez recharger votre wallet.`);
      onOpenWallet();
      return;
    }

    setOrderModal(m => m ? { ...m, submitting: true } : null);
    try {
      const plt = activePlatformData;
      await fetch('/api/promotion/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.name,
          clientPhone: (client as any).phone || '',
          platformId: plt?.id || '',
          platformKey: selectedPlatform || '',
          platformName: plt?.name || plt?.label || selectedPlatform || '',
          serviceId: orderModal.svc.id || '',
          serviceName: orderModal.svc.name,
          serviceCategory: orderModal.svc.category || '',
          unit: orderModal.svc.unit,
          qty: orderModal.qty,
          totalPrice: totalPriceHTG,
          customFieldValues: orderModal.customFieldValues,
        }),
      });
      setOrderModal(m => m ? { ...m, submitting: false, success: true } : null);
      toast.success('Commande soumise ! Notre équipe la traitera sous 24h.');
    } catch {
      setOrderModal(m => m ? { ...m, submitting: false } : null);
      toast.error('Erreur lors de la soumission.');
    }
  };

  const totalPrice = orderModal ? Math.round(orderModal.svc.pricePerUnit * orderModal.qty) : 0;
  const platformVideoUrl = selectedPlatform ? getPlatformVideoUrl(selectedPlatform) : '';

  // Search
  const searchResults = search.length >= 2
    ? Object.entries(STATIC_SERVICES).flatMap(([pKey, cats]) =>
        Object.entries(cats).flatMap(([cat, svcs]) =>
          svcs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase()))
            .map(s => ({ ...s, pKey, cat, id: `search-${pKey}-${cat}-${s.name}` }))
        )
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab bar */}
      <div className="bg-white border-b sticky top-14 z-10 shadow-sm">
        <div className="flex items-center justify-around max-w-2xl mx-auto px-2">
          {[
            { key: 'home' as const, icon: Home, label: 'Accueil' },
            { key: 'orders' as const, icon: Package, label: 'Commandes' },
            { key: 'profile' as const, icon: User, label: 'Profil' },
          ].map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => { setTab(key); if (key === 'home') setSelectedPlatform(null); }}
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

              {/* ── Step 2: Category selection ── */}
              {selectedPlatform && activePlatformData && !activeCategory ? (
                <div>
                  {/* Back + header */}
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => { setSelectedPlatform(null); setActiveCategory(''); }}
                      className="h-9 w-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0">
                      <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${activePlatformData.gradient} flex items-center justify-center text-white shrink-0`}>
                      <PlatformIcon pKey={selectedPlatform} className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 text-base leading-tight">{activePlatformData.label || activePlatformData.name}</h2>
                      <p className="text-[11px] text-gray-400">{getServiceCount(selectedPlatform)} services disponibles</p>
                    </div>
                  </div>

                  {/* Platform video */}
                  {platformVideoUrl && <VideoSection videoUrl={platformVideoUrl} />}

                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Que souhaitez-vous booster ?</p>

                  {/* Category cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => {
                      const catCfg = getCategoryConfig(cat);
                      const Icon = catCfg.icon;
                      const svcCount = getServices(selectedPlatform, cat).length;
                      return (
                        <motion.button key={cat} whileTap={{ scale: 0.96 }}
                          onClick={() => setActiveCategory(cat)}
                          className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all text-center group">
                          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${catCfg.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm leading-tight">{cat}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-snug">{catCfg.desc}</p>
                            {svcCount > 0 && (
                              <p className={`text-[10px] font-black mt-1.5 ${catCfg.text}`}>
                                {svcCount} service{svcCount > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

              ) : selectedPlatform && activePlatformData && activeCategory ? (
                /* ── Step 3: Service catalog ── */
                <div>
                  {/* Breadcrumb back */}
                  <div className="flex items-center gap-2 mb-5">
                    <button onClick={() => setActiveCategory('')}
                      className="h-9 w-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0">
                      <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${activePlatformData.gradient} flex items-center justify-center text-white shrink-0`}>
                      <PlatformIcon pKey={selectedPlatform} className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-bold">
                      <span>{activePlatformData.label || activePlatformData.name}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className={`font-black ${getCategoryConfig(activeCategory).text}`}>{activeCategory}</span>
                    </div>
                  </div>

                  {/* Category badge hero */}
                  {(() => {
                    const catCfg = getCategoryConfig(activeCategory);
                    const Icon = catCfg.icon;
                    return (
                      <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${catCfg.gradient} text-white mb-5`}>
                        <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-base leading-tight">{activeCategory}</p>
                          <p className="text-white/75 text-xs mt-0.5">{catCfg.desc}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="font-black text-lg leading-none">{currentServices.length}</p>
                          <p className="text-white/70 text-[10px]">services</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Services */}
                  <AnimatePresence mode="wait">
                    <motion.div key={`${selectedPlatform}-${activeCategory}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-4">
                      {loadingServices ? (
                        <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
                      ) : currentServices.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                          <p className="text-sm text-gray-400 font-semibold">Aucun service dans cette catégorie</p>
                        </div>
                      ) : (
                        currentServices.map((svc: any, i: number) => (
                          <ServiceCard key={svc.id || i} svc={svc} plt={activePlatformData} catCfg={getCategoryConfig(activeCategory)} onOrder={openOrderModal} />
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

              ) : (
                /* ── Platform grid home view ── */
                <div>
                  {/* Video section */}
                  {mainVideoUrl && <VideoSection videoUrl={mainVideoUrl} />}

                  {/* Search */}
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un service..."
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
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
                          searchResults.map((svc, i) => (
                            <ServiceCard key={i} svc={svc} plt={getPlatformConfig(svc.pKey)} catCfg={getCategoryConfig((svc as any).cat || '')} onOrder={openOrderModal} />
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {search.length < 2 && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Choisissez une plateforme</p>
                      {loadingServices ? (
                        <div className="grid grid-cols-2 gap-3">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {platforms.map((p: any) => (
                            <PlatformCard
                              key={p.key}
                              platform={p}
                              svcCount={getServiceCount(p.key)}
                              onClick={() => {
                                setSelectedPlatform(p.key);
                                setActiveCategory('');
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ─ Orders tab ─ */}
          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 text-base">Mes Commandes</h2>
                <button onClick={loadMyOrders} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <Loader2 className={`h-4 w-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loadingOrders ? (
                <div className="flex justify-center py-12"><div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune commande</p>
                  <button onClick={() => setTab('home')} className="mt-4 text-primary text-sm font-black hover:underline">Passer une commande →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(order => {
                    const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    const plt = getPlatformConfig(order.platformKey || '');
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-black text-gray-900 text-sm">{order.serviceName}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{order.qty?.toLocaleString()} {order.unit} · {order.platformName}</p>
                          </div>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black ${status.color}`}>
                            {status.icon}{status.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl ${plt.lightBg} ${plt.text} text-[10px] font-bold border ${plt.border}`}>
                            <PlatformIcon pKey={order.platformKey || ''} className="h-3 w-3" />
                            {order.platformName || plt.label}
                          </span>
                          <p className="font-black text-gray-900 text-sm">{order.totalPrice?.toLocaleString()} HTG</p>
                        </div>
                        {order.createdAt && (
                          <p className="text-[10px] text-gray-300 mt-2">
                            {new Date(order.createdAt._seconds ? order.createdAt._seconds * 1000 : order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
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
                {[
                  { val: myOrders.length, label: 'Commandes' },
                  { val: myOrders.filter(o => o.status === 'completed').length, label: 'Complétées' },
                  { val: myOrders.filter(o => o.status === 'active').length, label: 'En cours' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{s.val}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <button onClick={onOpenWallet}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
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
                <button onClick={() => { setTab('orders'); loadMyOrders(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center"><Package className="h-4 w-4 text-blue-600" /></div>
                  Mes commandes
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
                </button>
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
            onClick={() => !orderModal.submitting && setOrderModal(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">

              {orderModal.success ? (
                /* Success state */
                <div className="p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">Commande soumise !</h3>
                  <p className="text-sm text-gray-500 mb-6">Notre équipe traitera votre commande sous 24h. Suivez son statut dans l'onglet "Commandes".</p>
                  <button onClick={() => { setOrderModal(null); setTab('orders'); loadMyOrders(); }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-lg">
                    Voir mes commandes →
                  </button>
                  <button onClick={() => setOrderModal(null)} className="w-full mt-2 py-2 text-sm text-gray-400">Fermer</button>
                </div>
              ) : (
                <div className="p-6">
                  <h3 className="font-black text-gray-900 text-base mb-1">{orderModal.svc.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{orderModal.svc.description}</p>

                  {/* Custom form fields */}
                  {selectedPlatform && getPlatformCustomFields(selectedPlatform).length > 0 && (
                    <div className="mb-4 space-y-3">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Informations requises</p>
                      {getPlatformCustomFields(selectedPlatform).map((field: any) => (
                        <div key={field.id}>
                          <label className="text-xs font-bold text-gray-700 block mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={orderModal.customFieldValues[field.label] || ''}
                              onChange={e => setOrderModal(m => m ? { ...m, customFieldValues: { ...m.customFieldValues, [field.label]: e.target.value } } : null)}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={orderModal.customFieldValues[field.label] || ''}
                              onChange={e => setOrderModal(m => m ? { ...m, customFieldValues: { ...m.customFieldValues, [field.label]: e.target.value } } : null)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                              <option value="">-- Choisir --</option>
                              {(field.options || '').split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'url' ? 'url' : 'text'}
                              value={orderModal.customFieldValues[field.label] || ''}
                              onChange={e => setOrderModal(m => m ? { ...m, customFieldValues: { ...m.customFieldValues, [field.label]: e.target.value } } : null)}
                              placeholder={field.placeholder}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="mb-4">
                    <label className="text-xs font-black text-gray-600 uppercase tracking-widest block mb-2">
                      Quantité ({orderModal.svc.unit})
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setOrderModal(m => m ? { ...m, qty: Math.max(m.svc.minQty || 100, m.qty - Math.ceil((m.svc.minQty || 100) / 5)) } : null)}
                        className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-colors text-lg">−</button>
                      <input type="number" value={orderModal.qty}
                        onChange={e => {
                          const v = Math.max(orderModal.svc.minQty || 0, Math.min(orderModal.svc.maxQty || 999999, Number(e.target.value) || 0));
                          setOrderModal(m => m ? { ...m, qty: v } : null);
                        }}
                        min={orderModal.svc.minQty} max={orderModal.svc.maxQty}
                        className="flex-1 text-center font-black text-gray-900 text-base border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <button onClick={() => setOrderModal(m => m ? { ...m, qty: Math.min(m.svc.maxQty || 999999, m.qty + Math.ceil((m.svc.minQty || 100) / 5)) } : null)}
                        className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-colors text-lg">+</button>
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-semibold">
                      <span>Min: {(orderModal.svc.minQty || 100).toLocaleString()}</span>
                      <span>Max: {(orderModal.svc.maxQty || 100000).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Price */}
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

                  <button onClick={submitOrder} disabled={orderModal.submitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">
                    {orderModal.submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement en cours...</>
                      : <><ShoppingCart className="h-4 w-4" /> Acheter le service — {totalPrice.toLocaleString()} HTG</>
                    }
                  </button>
                  <button onClick={() => setOrderModal(null)} disabled={orderModal.submitting}
                    className="w-full mt-2 py-2.5 text-sm text-gray-400 font-semibold">Annuler</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Public landing page ──────────────────────────────────────────────────────
function PromotionLanding({ onLogin }: { onLogin: () => void }) {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [apiPlatforms, setApiPlatforms] = useState<any[]>([]);
  const [apiServices, setApiServices] = useState<any[]>([]);
  const [mainVideoUrl, setMainVideoUrl] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/promotion/platforms').then(r => r.json()).catch(() => ({ platforms: [] })),
      fetch('/api/promotion/services').then(r => r.json()).catch(() => ({ services: [] })),
      fetch('/api/promotion/settings').then(r => r.json()).catch(() => ({})),
    ]).then(([pData, sData, sett]) => {
      setApiPlatforms(pData.platforms || []);
      setApiServices(sData.services || []);
      if (sett.mainVideoUrl) setMainVideoUrl(sett.mainVideoUrl);
    });
  }, []);

  const platforms = apiPlatforms.length > 0
    ? apiPlatforms.filter(ap => ap.active !== false).map(ap => ({ ...getPlatformConfig(ap.key), ...ap }))
    : STATIC_PLATFORMS;

  const getServiceCount = (pKey: string) => {
    if (apiServices.length > 0) return apiServices.filter(s => s.platformKey === pKey && s.active !== false).length;
    return Object.values(STATIC_SERVICES[pKey] || {}).flat().length;
  };

  const plt = getPlatformConfig(activePlatform);
  const cats = Object.keys(STATIC_SERVICES[activePlatform] || {});

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 40%, #ea580c 70%, #7c3aed 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 left-1/4 w-80 h-80 bg-yellow-400/15 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1.1, 0.9, 1.1], rotate: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl" />
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
            Augmentez votre visibilité sur YouTube, TikTok, Instagram, Facebook et plus — campagnes 100% authentiques.
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            {[{ target: 128000, suffix: '+', label: 'Abonnés livrés' }, { target: 85000, suffix: '+', label: 'Clients satisfaits' }, { target: 53000, suffix: '+', label: 'Campagnes' }].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white"><AnimatedCounter target={s.target} suffix={s.suffix} /></p>
                <p className="text-[10px] sm:text-xs text-white/50 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" className="w-full" preserveAspectRatio="none">
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Platform grid ── */}
      <section id="promo-services" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Platfòm Nou Sipòte</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choisissez votre plateforme</h2>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {platforms.map((p: any) => {
            const cfg = getPlatformConfig(p.key);
            const cnt = getServiceCount(p.key);
            const isActive = activePlatform === p.key;
            return (
              <motion.button key={p.key} whileTap={{ scale: 0.97 }} onClick={() => setActivePlatform(p.key)}
                className={`flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border-2 transition-all ${
                  isActive
                    ? `border-transparent bg-gradient-to-br ${cfg.gradient} text-white shadow-lg`
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                }`}>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : cfg.iconBg || 'bg-gray-100'}`}>
                  <PlatformIcon pKey={p.key} className={`h-7 w-7 ${isActive ? 'text-white' : cfg.iconColor || 'text-gray-600'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-black text-sm leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>{p.label || p.name}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{cnt} SÉVIS</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Preview services for selected platform */}
        <AnimatePresence mode="wait">
          <motion.div key={activePlatform} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
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

        {Object.values(STATIC_SERVICES[activePlatform] || {}).flat().length > 4 && (
          <div className="text-center mt-6">
            <button onClick={onLogin}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-black shadow-lg hover:opacity-90 transition-all">
              Voir tous les services →
            </button>
          </div>
        )}
      </section>

      {/* ── Stats banner ── */}
      <section style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)' }} className="text-white py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[{ target: 25000, suffix: '+', label: 'Commandes' }, { target: 500, suffix: '+', label: 'Campagnes actives' }, { target: 49, prefix: '4.', label: 'Note ★' }, { target: 24, suffix: '/7', label: 'Support' }].map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-black"><AnimatedCounter target={s.target} prefix={s.prefix} suffix={s.suffix} /></p>
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
        {mainVideoUrl && (
          <div className="max-w-2xl mx-auto mb-10">
            <VideoSection videoUrl={mainVideoUrl} />
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-6">
          {[{ n: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement. Aucune carte bancaire requise.', icon: Users },
            { n: '02', title: 'Choisissez un service', desc: 'Sélectionnez la plateforme, catégorie et remplissez le formulaire.', icon: Target },
            { n: '03', title: 'Recevez vos résultats', desc: 'Votre campagne démarre sous 24h. Suivez-la en temps réel.', icon: BarChart3 }].map((step, i) => (
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
                <ChevronLeft className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? '-rotate-90' : 'rotate-180'}`} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Prêt à booster votre présence ?</h2>
          <p className="text-white/70 text-sm mb-8">Rejoignez des milliers de créateurs haïtiens qui font confiance à Phénix Réseaux.</p>
          <button onClick={onLogin}
            className="px-10 py-4 rounded-2xl bg-white text-purple-700 font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-all">
            Créer mon compte gratuit →
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function ReseauxView({
  loggedClient,
  onRequestAuth,
  onOpenWallet,
  onBack,
  onClientLogin,
}: {
  loggedClient: Client | null;
  onRequestAuth: () => void;
  onOpenWallet: () => void;
  onBack: () => void;
  onClientLogin: (c: Client) => void;
}) {
  if (loggedClient) {
    return <PromotionDashboard client={loggedClient} onOpenWallet={onOpenWallet} />;
  }
  return <PromotionLanding onLogin={onRequestAuth} />;
}
