import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Youtube, Instagram, Facebook, TrendingUp, Star, ChevronDown,
  Check, ArrowRight, Users, BarChart3, Zap, Shield, Clock,
  MessageCircle, Play, Target, Award, Globe, Sparkles,
  ChevronLeft, Home, ClipboardList, User, LogIn, Package,
  CheckCircle2, Circle, XCircle,
} from 'lucide-react';
import { Client } from '../types';
import UserAuthModal from './UserAuthModal';

// TikTok icon
const TikTokIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

const PLATFORMS = [
  {
    key: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    iconClass: 'h-5 w-5',
    gradient: 'from-red-500 to-rose-600',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    services: [
      { name: 'Abonnés YouTube', desc: 'Vrais abonnés organiques', price: 2500, per: '500 abonnés', popular: false },
      { name: 'Vues Vidéo', desc: 'Vues de haute rétention', price: 1200, per: '10,000 vues', popular: true },
      { name: 'Likes & Réactions', desc: 'Engagements authentiques', price: 800, per: '1,000 likes', popular: false },
      { name: 'Campagne Ads', desc: 'Publicité sponsorisée ciblée', price: 5000, per: 'campagne', popular: false },
    ],
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: null,
    iconClass: 'h-5 w-5',
    gradient: 'from-gray-800 to-gray-900',
    lightBg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    services: [
      { name: 'Abonnés TikTok', desc: 'Vrais followers actifs', price: 1800, per: '500 abonnés', popular: false },
      { name: 'Vues TikTok', desc: 'Boost de visibilité rapide', price: 900, per: '10,000 vues', popular: true },
      { name: 'Cœurs & Likes', desc: 'Interactions authentiques', price: 600, per: '1,000 likes', popular: false },
      { name: 'Promotion Ads', desc: 'TikTok Ads sponsorisés', price: 4500, per: 'campagne', popular: false },
    ],
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    iconClass: 'h-5 w-5',
    gradient: 'from-pink-500 to-purple-600',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-600',
    services: [
      { name: 'Abonnés Instagram', desc: 'Followers réels et actifs', price: 2000, per: '500 abonnés', popular: false },
      { name: 'Likes & Réactions', desc: 'Engagements de qualité', price: 700, per: '1,000 likes', popular: true },
      { name: 'Vues Stories', desc: 'Visibilité maximale', price: 500, per: '5,000 vues', popular: false },
      { name: 'Instagram Ads', desc: 'Publicités Meta ciblées', price: 4000, per: 'campagne', popular: false },
    ],
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    iconClass: 'h-5 w-5',
    gradient: 'from-blue-500 to-blue-700',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    services: [
      { name: 'Abonnés Page', desc: 'Fans réels engagés', price: 1500, per: '500 abonnés', popular: false },
      { name: 'Likes & Partages', desc: 'Interactions organiques', price: 650, per: '1,000 likes', popular: false },
      { name: 'Portée de Post', desc: 'Boost de publication', price: 800, per: '20,000 portée', popular: true },
      { name: 'Facebook Ads', desc: 'Campagnes Meta ciblées', price: 3500, per: 'campagne', popular: false },
    ],
  },
];

const STEPS = [
  { n: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement. Aucune carte bancaire requise.', icon: Users },
  { n: '02', title: 'Choisissez un service', desc: 'Sélectionnez la plateforme et définissez votre budget.', icon: Target },
  { n: '03', title: 'Recevez vos résultats', desc: 'Votre campagne démarre immédiatement. Suivez en temps réel.', icon: BarChart3 },
];

const TESTIMONIALS = [
  { name: 'Jean-Marc D.', role: 'Créateur de contenu', text: 'Phénix Réseaux a boosté ma chaîne YouTube de 0 à 15K abonnés en 2 mois. Service vraiment professionnel !', stars: 5, avatar: 'J' },
  { name: 'Marie S.', role: 'Business Owner', text: 'Mes ventes ont doublé grâce aux campagnes Instagram. Le retour sur investissement est incroyable.', stars: 5, avatar: 'M' },
  { name: 'Patrick L.', role: 'Influenceur TikTok', text: 'Les vues sont réelles et l\'engagement est authentique. Je recommande à 100% !', stars: 5, avatar: 'P' },
];

const FAQS = [
  { q: 'Èske kont mwen sè otantik ?', a: 'Wi, tout abonnés ak engagements nou livre yo soti nan vrèman kont reyèl. Nou pa janm itilize bots oswa faux comptes.' },
  { q: 'Konbyen tan li pran pou wè rezilta ?', a: 'Rezilta yo kòmanse parèt nan 24 a 72 èdtan apre konfirmasyon lòd ou.' },
  { q: 'Èske sèvis ou yo an sekirite pou kont mwen ?', a: 'Absoliman. Metòd nou yo respekte tout règleman platefòm yo. Kont ou pa an risk.' },
  { q: 'Ki metòd peman ou aksepte ?', a: 'Nou aksepte MonCash, SafacilPay, ak Wallet Phénix.' },
  { q: 'Èske gen garanti rembourseman ?', a: 'Wi, si ou pa resevwa sèvis ou nan 7 jou, nou ofri rembourseman konplè.' },
];

const FEATURES = [
  { icon: Shield, title: 'Résultats garantis', desc: '100% authentique, conforme aux règles des plateformes.' },
  { icon: Zap, title: 'Livraison rapide', desc: 'Démarrage en moins de 24h après confirmation.' },
  { icon: BarChart3, title: 'Analytics en temps réel', desc: 'Dashboard de suivi complet de vos campagnes.' },
  { icon: Clock, title: 'Support 24/7', desc: 'Notre équipe est disponible à tout moment.' },
  { icon: Globe, title: 'Multi-plateforme', desc: 'YouTube, TikTok, Instagram, Facebook et plus.' },
  { icon: Award, title: 'Prix compétitifs', desc: 'Meilleurs tarifs du marché haïtien.' },
];

// Mock orders for logged-in dashboard
const MOCK_ORDERS = [
  { id: 'ORD-001', service: 'Abonnés YouTube', platform: 'youtube', amount: 2500, status: 'completed', date: '2026-06-20', qty: '500 abonnés' },
  { id: 'ORD-002', service: 'Vues TikTok', platform: 'tiktok', amount: 900, status: 'active', date: '2026-06-22', qty: '10K vues' },
  { id: 'ORD-003', service: 'Likes Instagram', platform: 'instagram', amount: 700, status: 'pending', date: '2026-06-24', qty: '1K likes' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente',  color: 'text-amber-600 bg-amber-50 border-amber-200',  icon: <Circle className="h-3 w-3" /> },
  active:    { label: 'En cours',    color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: <Zap className="h-3 w-3" /> },
  completed: { label: 'Terminé',     color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Annulé',      color: 'text-red-500 bg-red-50 border-red-200',        icon: <XCircle className="h-3 w-3" /> },
};

interface ReseauxViewProps {
  loggedClient: Client | null;
  onRequestAuth: () => void;
  onOpenWallet: () => void;
  onBack: () => void;
  onClientLogin: (client: Client) => void;
}

// ─── Inner dashboard for logged-in users ─────────────────────────────────────
function PromotionDashboard({ client, onOpenWallet, onBack }: { client: Client; onOpenWallet: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<'home' | 'orders' | 'profile'>('home');
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [selectedService, setSelectedService] = useState<null | typeof PLATFORMS[0]['services'][0] & { platform: string }>(null);

  const platform = PLATFORMS.find(p => p.key === activePlatform)!;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Inner header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-1">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-gray-900 text-sm">Phénix Réseaux</span>
        </div>
        <button onClick={onOpenWallet} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white font-black text-[9px]">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-primary hidden sm:block">{client.name.split(' ')[0]}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">

          {/* ── Home tab ── */}
          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4">

              {/* Welcome banner */}
              <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-5 mb-5">
                <p className="text-xs font-bold text-white/70 mb-1">Bonjou,</p>
                <h2 className="text-lg font-black mb-2">{client.name.split(' ')[0]} 👋</h2>
                <p className="text-xs text-white/80 leading-relaxed">Choisissez une plateforme et boostez votre présence en ligne dès aujourd'hui.</p>
              </div>

              {/* Platform selector */}
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Platfòm</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-5">
                {PLATFORMS.map((p) => {
                  const active = activePlatform === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setActivePlatform(p.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border font-bold text-xs shrink-0 transition-all ${
                        active
                          ? `bg-gradient-to-r ${p.gradient} text-white border-transparent shadow-md`
                          : `${p.lightBg} ${p.border} ${p.text}`
                      }`}
                    >
                      {p.key === 'tiktok' ? <TikTokIcon className="h-4 w-4" /> : p.icon && <p.icon className="h-4 w-4" />}
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Services */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlatform}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {platform.services.map((svc, i) => (
                    <div
                      key={i}
                      className={`relative bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                        svc.popular ? 'border-primary/30 ring-1 ring-primary/20' : 'border-gray-100'
                      }`}
                    >
                      {svc.popular && (
                        <span className="absolute -top-2 left-3 px-2.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-black uppercase">
                          Populaire
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-sm">{svc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{svc.desc}</p>
                          <p className="text-xs text-gray-400 mt-1">Pour {svc.per}</p>
                        </div>
                        <div className="ml-3 text-right shrink-0">
                          <p className="text-base font-black text-gray-900">{svc.price.toLocaleString()} HTG</p>
                          <button
                            onClick={() => {
                              setSelectedService({ ...svc, platform: activePlatform });
                            }}
                            className={`mt-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black text-white bg-gradient-to-r ${platform.gradient} hover:opacity-90 transition-all active:scale-95 shadow-sm`}
                          >
                            Commander
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Orders tab ── */}
          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              <h2 className="font-black text-gray-900 text-base mb-4">Mes Commandes</h2>
              {MOCK_ORDERS.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune commande pour l'instant</p>
                  <button onClick={() => setTab('home')} className="mt-4 text-primary text-sm font-black hover:underline">
                    Passer une commande →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_ORDERS.map((order) => {
                    const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    const plt = PLATFORMS.find(p => p.key === order.platform)!;
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-black text-gray-900 text-sm">{order.service}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{order.qty} · {order.date}</p>
                          </div>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl ${plt.lightBg} ${plt.text} text-[10px] font-bold border ${plt.border}`}>
                            {order.platform === 'tiktok' ? <TikTokIcon className="h-3 w-3" /> : plt.icon && <plt.icon className="h-3 w-3" />}
                            {plt.label}
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

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
              {/* Avatar */}
              <div className="flex flex-col items-center py-8">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-indigo-200 mb-3">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-black text-gray-900 text-lg">{client.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Membre Phénix Réseaux</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { val: MOCK_ORDERS.length, label: 'Commandes' },
                  { val: MOCK_ORDERS.filter(o => o.status === 'completed').length, label: 'Complétées' },
                  { val: MOCK_ORDERS.filter(o => o.status === 'active').length, label: 'En cours' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{s.val}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button onClick={onOpenWallet} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  Voir mon portefeuille
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
                </button>
                <a
                  href="https://wa.me/50944009339"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  Contacter le support
                  <ArrowRight className="h-4 w-4 text-gray-300 ml-auto" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inner bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch justify-around max-w-md mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
          {[
            { key: 'home' as const,    icon: Home,          label: 'Accueil'    },
            { key: 'orders' as const,  icon: Package,       label: 'Commandes'  },
            { key: 'profile' as const, icon: User,          label: 'Profil'     },
          ].map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 min-h-[58px] group"
              >
                {active && (
                  <motion.span
                    layoutId="inner-nav-bg"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl bg-primary/8"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-[20px] w-[20px] transition-all ${active ? 'text-primary scale-110' : 'text-gray-400'}`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span className={`relative z-10 text-[9.5px] font-bold leading-none transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && (
                  <motion.span
                    layoutId="inner-nav-dot"
                    className="absolute bottom-0 w-4 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order modal */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
            onClick={() => setSelectedService(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="font-black text-gray-900 text-base mb-1">{selectedService.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedService.desc}</p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Quantité</span>
                  <span className="font-bold">{selectedService.per}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Prix total</span>
                  <span className="font-black text-gray-900">{selectedService.price.toLocaleString()} HTG</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedService(null); onOpenWallet(); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:opacity-90 transition-all active:scale-95"
              >
                Payer avec mon Wallet
              </button>
              <button onClick={() => setSelectedService(null)} className="w-full mt-2 py-2.5 text-sm text-gray-400 font-semibold">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Public landing page ──────────────────────────────────────────────────────
function PromotionLanding({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const platform = PLATFORMS.find(p => p.key === activePlatform)!;

  return (
    <div className="min-h-screen bg-white">

      {/* Mini header for Promotion mode */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-1">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-gray-900 text-sm">Phénix Réseaux</span>
          </div>
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" />
            Connexion
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-10 pb-14">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              Marketing Digital
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-center text-3xl sm:text-5xl font-black leading-tight mb-4">
            Boost Présentasyon Ou Sou<br />
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Rézo Sosyal Ou !
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-center text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Augmentez votre visibilité sur YouTube, TikTok, Instagram et Facebook avec des campagnes 100% authentiques.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button onClick={onLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              Kreye kont gratis <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => document.getElementById('platforms-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              <Play className="h-4 w-4" /> Voir les services
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[{ val: '128K+', label: 'Abonnés livrés' }, { val: '85K+', label: 'Clients satisfaits' }, { val: '53K+', label: 'Campagnes actives' }].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">{s.val}</p>
                <p className="text-[10px] sm:text-xs text-white/50 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms-section" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Platfòm Nou Sipòte</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choisissez votre plateforme</h2>
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
          {PLATFORMS.map((p) => {
            const active = activePlatform === p.key;
            return (
              <button key={p.key} onClick={() => setActivePlatform(p.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                  active ? `border-transparent text-white shadow-lg bg-gradient-to-r ${p.gradient}` : `${p.border} ${p.lightBg} ${p.text}`
                }`}>
                {p.key === 'tiktok' ? <TikTokIcon /> : p.icon && <p.icon className="h-5 w-5" />}
                {p.label}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activePlatform} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
            className="grid sm:grid-cols-2 gap-4">
            {platform.services.map((svc, i) => (
              <div key={i} className={`relative rounded-3xl border p-5 transition-all hover:shadow-lg ${svc.popular ? 'border-primary/30 bg-primary/3 ring-1 ring-primary/20' : 'border-gray-100 bg-white'}`}>
                {svc.popular && (
                  <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm">Populaire</span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">{svc.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{svc.desc}</p>
                  </div>
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-white shrink-0 ml-3`}>
                    {platform.key === 'tiktok' ? <TikTokIcon className="h-4 w-4" /> : platform.icon && <platform.icon className="h-4 w-4" />}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-black text-gray-900">{svc.price.toLocaleString()} HTG</p>
                    <p className="text-[10px] text-gray-400 font-semibold">pour {svc.per}</p>
                  </div>
                  <button onClick={onLogin}
                    className={`px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${platform.gradient} hover:opacity-90 transition-all active:scale-95 shadow-sm`}>
                    Commander
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Stats bar */}
      <section className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[{ val: '25K+', label: 'Commandes complétées' }, { val: '500+', label: 'Campagnes actives' }, { val: '4.9★', label: 'Note moyenne' }, { val: '24/7', label: 'Support disponible' }].map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-black">{s.val}</p>
                <p className="text-xs text-white/70 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">3 Etap Fasil</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Kijan li travay ?</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
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

      {/* Features */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Avantaj ak garèt</p>
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

      {/* Testimonials */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Kouman yo di li</p>
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

      {/* Affiliate */}
      <section className="py-12 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-y border-emerald-100">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">Pwogram Referans</span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Fa Lajan ak Phénix Réseaux !</h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto mb-6 leading-relaxed">Parrainz vos amis et gagnez une commission sur chaque commande qu'ils passent.</p>
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-8">
            {[{ val: '10%', label: 'Commission' }, { val: 'Instant', label: 'Paiement' }, { val: '∞', label: 'Filleuls' }].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-3 border border-emerald-100 text-center">
                <p className="text-xl font-black text-emerald-600">{s.val}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={onLogin}
            className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2">
            Rejoindre le programme <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Kèvyon Moun Poze Souvan</p>
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

      {/* Final CTA */}
      <section className="py-14 px-4 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white text-center">
        <div className="max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-yellow-400 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Pare a kòmanse grandi ?</h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">Rejoignez des milliers de créateurs qui ont boosté leur présence avec Phénix Réseaux.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onLogin}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2">
              Démarrer maintenant <ArrowRight className="h-4 w-4" />
            </button>
            <a href="https://wa.me/50944009339" target="_blank" rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all inline-flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {[{ icon: Shield, text: '100% Sécurisé' }, { icon: Check, text: 'Résultats garantis' }, { icon: TrendingUp, text: 'Croissance réelle' }].map(b => (
              <div key={b.text} className="flex items-center gap-1.5 text-white/50 text-xs font-semibold">
                <b.icon className="h-3.5 w-3.5" />{b.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function ReseauxView({ loggedClient, onRequestAuth, onOpenWallet, onBack, onClientLogin }: ReseauxViewProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogin = () => setShowAuthModal(true);

  if (loggedClient) {
    return (
      <PromotionDashboard
        client={loggedClient}
        onOpenWallet={onOpenWallet}
        onBack={onBack}
      />
    );
  }

  return (
    <>
      <PromotionLanding onLogin={handleLogin} onBack={onBack} />
      <UserAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onClientLogin={(client) => { onClientLogin(client); setShowAuthModal(false); }}
        onAdminLogin={() => setShowAuthModal(false)}
        onAffiliateAccess={() => setShowAuthModal(false)}
        onAdminPasswordLogin={() => setShowAuthModal(false)}
      />
    </>
  );
}
