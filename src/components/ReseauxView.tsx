import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Youtube, Instagram, Facebook, TrendingUp, Star, ChevronDown,
  Check, ArrowRight, Users, BarChart3, Zap, Shield, Clock,
  MessageCircle, Play, Target, Award, Globe, Sparkles,
} from 'lucide-react';

// TikTok icon (not in lucide)
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);

const PLATFORMS = [
  {
    key: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    active: 'bg-red-600',
    gradient: 'from-red-500 to-rose-600',
    services: [
      { name: 'Abonnés YouTube', desc: 'Vrais abonnés organiques', price: '2,500 HTG', per: '500 abonnés', popular: false },
      { name: 'Vues Vidéo', desc: 'Vues de haute rétention', price: '1,200 HTG', per: '10,000 vues', popular: true },
      { name: 'Likes & Réactions', desc: 'Engagements authentiques', price: '800 HTG', per: '1,000 likes', popular: false },
      { name: 'Campagne Ads', desc: 'Publicité sponsorisée ciblée', price: '5,000 HTG', per: 'campagne', popular: false },
    ],
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: TikTokIcon,
    color: 'text-gray-900',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    active: 'bg-gray-900',
    gradient: 'from-gray-800 to-gray-900',
    services: [
      { name: 'Abonnés TikTok', desc: 'Vrais followers actifs', price: '1,800 HTG', per: '500 abonnés', popular: false },
      { name: 'Vues TikTok', desc: 'Boost de visibilité rapide', price: '900 HTG', per: '10,000 vues', popular: true },
      { name: 'Cœurs & Likes', desc: 'Interactions authentiques', price: '600 HTG', per: '1,000 likes', popular: false },
      { name: 'Promotion Ads', desc: 'TikTok Ads sponsorisés', price: '4,500 HTG', per: 'campagne', popular: false },
    ],
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    active: 'bg-gradient-to-r from-pink-500 to-purple-600',
    gradient: 'from-pink-500 to-purple-600',
    services: [
      { name: 'Abonnés Instagram', desc: 'Followers réels et actifs', price: '2,000 HTG', per: '500 abonnés', popular: false },
      { name: 'Likes & Réactions', desc: 'Engagements de qualité', price: '700 HTG', per: '1,000 likes', popular: true },
      { name: 'Vues Stories', desc: 'Visibilité maximale', price: '500 HTG', per: '5,000 vues', popular: false },
      { name: 'Instagram Ads', desc: 'Publicités Meta ciblées', price: '4,000 HTG', per: 'campagne', popular: false },
    ],
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    active: 'bg-blue-600',
    gradient: 'from-blue-500 to-blue-700',
    services: [
      { name: 'Abonnés Page', desc: 'Fans réels engagés', price: '1,500 HTG', per: '500 abonnés', popular: false },
      { name: 'Likes & Partages', desc: 'Interactions organiques', price: '650 HTG', per: '1,000 likes', popular: false },
      { name: 'Portée de Post', desc: 'Boost de publication', price: '800 HTG', per: '20,000 portée', popular: true },
      { name: 'Facebook Ads', desc: 'Campagnes Meta ciblées', price: '3,500 HTG', per: 'campagne', popular: false },
    ],
  },
];

const STEPS = [
  { n: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement en quelques secondes. Aucune carte bancaire requise pour commencer.', icon: Users },
  { n: '02', title: 'Choisissez un service', desc: 'Sélectionnez la plateforme et le type de promotion. Définissez votre budget et vos objectifs.', icon: Target },
  { n: '03', title: 'Recevez vos résultats', desc: 'Votre campagne démarre immédiatement. Suivez vos statistiques en temps réel depuis votre dashboard.', icon: BarChart3 },
];

const TESTIMONIALS = [
  { name: 'Jean-Marc D.', role: 'Créateur de contenu', text: 'Phénix Réseaux a boosté ma chaîne YouTube de 0 à 15K abonnés en 2 mois. Service vraiment professionnel !', stars: 5, avatar: 'J' },
  { name: 'Marie S.', role: 'Business Owner', text: 'Mes ventes ont doublé grâce aux campagnes Instagram. Le retour sur investissement est incroyable.', stars: 5, avatar: 'M' },
  { name: 'Patrick L.', role: 'Influenceur TikTok', text: 'Les vues sont réelles et l\'engagement est authentique. Je recommande à 100% !', stars: 5, avatar: 'P' },
];

const FAQS = [
  { q: 'Èske kont mwen sè otantik ?', a: 'Wi, tout abonnés ak engagements nou livre yo soti nan vrèman kont reyèl. Nou pa janm itilize bots oswa faux comptes.' },
  { q: 'Konbyen tan li pran pou wè rezilta ?', a: 'Rezilta yo kòmanse parèt nan 24 a 72 èdtan apre konfirmasyon lòd ou. Kèk sèvis yo kapab kòmanse pi vit.' },
  { q: 'Èske sèvis ou yo an sekirite pou kont mwen ?', a: 'Absoliman. Metòd nou yo respekte tout règleman platefòm yo. Kont ou pa an risk.' },
  { q: 'Ki metòd peman ou aksepte ?', a: 'Nou aksepte MonCash, SafacilPay, ak lòt metòd peman lokal yo. Peman via Wallet Phénix disponib.' },
  { q: 'Èske gen garanti rembourseman ?', a: 'Wi, si ou pa resevwa sèvis ou te peye a nan 7 jou, nou ofri rembourseman konplè oswa ranplasman.' },
];

const FEATURES = [
  { icon: Shield, title: 'Résultats garantis', desc: '100% authentique, conforme aux règles des plateformes.' },
  { icon: Zap, title: 'Livraison rapide', desc: 'Démarrage en moins de 24h après confirmation.' },
  { icon: BarChart3, title: 'Analytics en temps réel', desc: 'Dashboard de suivi complet de vos campagnes.' },
  { icon: Clock, title: 'Support 24/7', desc: 'Notre équipe est disponible à tout moment.' },
  { icon: Globe, title: 'Multi-plateforme', desc: 'YouTube, TikTok, Instagram, Facebook et plus.' },
  { icon: Award, title: 'Prix compétitifs', desc: 'Meilleurs tarifs du marché haïtien.' },
];

interface ReseauxViewProps {
  loggedClient: any | null;
  onRequestAuth: () => void;
  onOpenWallet: () => void;
}

export default function ReseauxView({ loggedClient, onRequestAuth, onOpenWallet }: ReseauxViewProps) {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const platform = PLATFORMS.find(p => p.key === activePlatform)!;

  const handleGetStarted = () => {
    if (!loggedClient) { onRequestAuth(); return; }
    onOpenWallet();
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-10 pb-14">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              Phénix Réseaux — Marketing Digital
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center text-3xl sm:text-5xl font-black leading-tight mb-4"
          >
            Boost Présentasyon Ou Sou<br />
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Rézo Sosyal Ou !
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-8"
          >
            Augmentez votre visibilité sur YouTube, TikTok, Instagram et Facebook avec des campagnes 100% authentiques et des résultats mesurables.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              Kreye kont gratis
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Voir les services
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            {[
              { val: '128K+', label: 'Abonnés livrés' },
              { val: '85K+', label: 'Clients satisfaits' },
              { val: '53K+', label: 'Campagnes actives' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">{s.val}</p>
                <p className="text-[10px] sm:text-xs text-white/50 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Platform tabs + Services ──────────────────────────────────────── */}
      <section id="platforms" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Platfòm Nou Sipòte</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choisissez votre plateforme</h2>
        </div>

        {/* Platform selector */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
          {PLATFORMS.map((p) => {
            const active = activePlatform === p.key;
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => setActivePlatform(p.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                  active
                    ? `border-transparent text-white shadow-lg bg-gradient-to-r ${p.gradient}`
                    : `${p.border} ${p.bg} ${p.color} hover:border-current`
                }`}
              >
                <Icon />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Services grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePlatform}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            {platform.services.map((svc, i) => (
              <div
                key={i}
                className={`relative rounded-3xl border p-5 transition-all hover:shadow-lg ${
                  svc.popular
                    ? 'border-primary/30 bg-primary/3 ring-1 ring-primary/20'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {svc.popular && (
                  <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                    Populaire
                  </span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">{svc.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{svc.desc}</p>
                  </div>
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-white shrink-0 ml-3`}>
                    <platform.icon />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-black text-gray-900">{svc.price}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">pour {svc.per}</p>
                  </div>
                  <button
                    onClick={handleGetStarted}
                    className={`px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${platform.gradient} hover:opacity-90 transition-all active:scale-95 shadow-sm`}
                  >
                    Commander
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { val: '25K+', label: 'Commandes complétées' },
              { val: '500+', label: 'Campagnes actives' },
              { val: '4.9★', label: 'Note moyenne' },
              { val: '24/7', label: 'Support disponible' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-black">{s.val}</p>
                <p className="text-xs text-white/70 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">3 Etap Fasil</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Kijan li travay ?</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center p-6 rounded-3xl border border-gray-100 bg-white hover:shadow-md transition-all"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black">
                {step.n}
              </div>
              <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-black text-gray-900 text-sm mb-2">{step.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Avantaj ak garèt</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Poukisa chwazi Phénix Réseaux ?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-sm transition-all"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <feat.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="font-black text-gray-900 text-xs mb-1">{feat.title}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Kouman yo di li</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Témoignages clients</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-md transition-all"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Affiliate / Earn section ─────────────────────────────────────── */}
      <section className="py-12 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-y border-emerald-100">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">
            Pwogram Referans
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Fa Lajan ak Phénix Réseaux !
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto mb-6 leading-relaxed">
            Parrainz vos amis et gagnez une commission sur chaque commande qu'ils passent. Programme d'affiliation disponible pour tous les membres.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-8">
            {[
              { val: '10%', label: 'Commission' },
              { val: 'Instant', label: 'Paiement' },
              { val: '∞', label: 'Filleuls' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 border border-emerald-100 text-center">
                <p className="text-xl font-black text-emerald-600">{s.val}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleGetStarted}
            className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
          >
            Rejoindre le programme
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Kèvyon Moun Poze Souvan</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Questions fréquentes</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-gray-900 text-sm hover:bg-gray-50 transition-colors"
              >
                <span>{faq.q}</span>
                <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white text-center">
        <div className="max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-yellow-400 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Pare a kòmanse grandi ?
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            Rejoignez des milliers de créateurs et entrepreneurs qui ont déjà boosté leur présence en ligne avec Phénix Réseaux.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
            >
              Démarrer maintenant
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="https://wa.me/50944009339"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter via WhatsApp
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {[
              { icon: Shield, text: '100% Sécurisé' },
              { icon: Check, text: 'Résultats garantis' },
              { icon: TrendingUp, text: 'Croissance réelle' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5 text-white/50 text-xs font-semibold">
                <b.icon className="h-3.5 w-3.5" />
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
