import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Truck, Users, ArrowRight,
  ShoppingBag, Globe, GraduationCap, Wallet,
  MessageCircle, ArrowUp, ChevronRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import {
  useSliderImages, useNavButtons, useSettings,
  useProducts, useGames, useCardTopups,
} from '../services/parcelService';
import { useClientData, useClientTransactions } from '../services/clientService';
import { Client } from '../types';

const SLIDER_IMAGES = [
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1614850523296-62c09279446a?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
];

const HelpCircle = LucideIcons.Circle;
const LucideIcon = ({ name, className, color }: { name: string; className?: string; color?: string }) => {
  const Icon = (LucideIcons as any)[name] || HelpCircle;
  return <Icon className={className} style={{ color }} />;
};

interface HomeViewProps {
  onTrackingClick: () => void;
  onViewChange: (view: any) => void;
  loggedClient?: Client | null;
  onOpenWallet?: () => void;
}

const SECTION_CARDS = [
  {
    key: 'products',
    title: 'Produits',
    subtitle: 'Cartes, jeux, services digitaux',
    icon: ShoppingBag,
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    glow: 'shadow-purple-200',
  },
  {
    key: 'services',
    title: 'Services',
    subtitle: 'Suivi colis, expédition, en ligne',
    icon: Globe,
    gradient: 'from-teal-500 via-emerald-500 to-cyan-400',
    glow: 'shadow-emerald-200',
  },
  {
    key: 'formations',
    title: 'Formations',
    subtitle: 'Développez vos compétences',
    icon: GraduationCap,
    gradient: 'from-amber-500 via-orange-500 to-rose-400',
    glow: 'shadow-orange-200',
  },
];

export default function HomeView({ onTrackingClick, onViewChange, loggedClient, onOpenWallet }: HomeViewProps) {
  const { sliderImages } = useSliderImages();
  const { buttons, loading: buttonsLoading } = useNavButtons();
  const { settings } = useSettings();

  const { products, loading: productsLoading } = useProducts();
  const { games, loading: gamesLoading } = useGames();
  const { cards, loading: cardsLoading } = useCardTopups();

  const { client: liveClient } = useClientData(loggedClient?.id || null);
  const { transactions: clientTx } = useClientTransactions(loggedClient?.id || null);
  const effectiveClient = liveClient || loggedClient;

  const exchangeRate = settings?.exchangeRate || 146;
  const balanceHTG = Math.round((effectiveClient?.balance ?? 0) * exchangeRate);
  const balanceUSD = (effectiveClient?.balance ?? 0).toFixed(2);
  const recentTx = clientTx.slice(0, 3);

  React.useEffect(() => {
    if (settings?.whatsappAdminNumber) (window as any).__renaAdminPhone = settings.whatsappAdminNumber;
  }, [settings?.whatsappAdminNumber]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const imagesToDisplay = sliderImages.length > 0
    ? sliderImages.map(img => ({ url: img.url, description: img.description || '' }))
    : SLIDER_IMAGES.map(url => ({ url, description: 'Rena Digital Services' }));

  useEffect(() => {
    if (imagesToDisplay.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % imagesToDisplay.length), 6000);
    return () => clearInterval(timer);
  }, [imagesToDisplay.length]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const resolveRedirection = (btn: any) => {
    const target = btn.targetUrl?.trim();
    const instruction = btn.redirectionInstruction?.toLowerCase() || '';

    if (target) {
      if (['tracking', 'shipping', 'affiliate'].includes(target)) { onViewChange(target); return; }
      if (['products', 'services', 'formations'].includes(target)) { onViewChange(target); return; }
      if (target.startsWith('#')) { document.getElementById(target.substring(1))?.scrollIntoView({ behavior: 'smooth' }); return; }
      if (!target.includes('.') && !target.startsWith('/')) {
        const el = document.getElementById(target);
        if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
      }
      window.location.href = target;
      return;
    }

    if (instruction.includes('jeu'))                                              { onViewChange('products'); return; }
    if (instruction.includes('carte') || instruction.includes('recharge'))        { onViewChange('products'); return; }
    if (instruction.includes('produit') || instruction.includes('service'))       { onViewChange('products'); return; }
    if (instruction.includes('suivi') || instruction.includes('colis'))           { onViewChange('tracking'); return; }
    if (instruction.includes('shipping') || instruction.includes('envoi'))        { onViewChange('shipping'); return; }
    if (instruction.includes('formation'))                                        { onViewChange('formations'); return; }
  };

  const openWhatsApp = () => {
    const num = settings?.whatsappAdminNumber || '+50944813185';
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent('Bonjour Rena, je souhaite avoir plus de renseignements.')}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-28 space-y-8">

      {/* ── Hero: Wallet card or Slider ── */}
      <AnimatePresence mode="wait">
        {loggedClient ? (
          <motion.section
            key="wallet-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              onClick={onOpenWallet}
              className="relative w-full rounded-[32px] overflow-hidden cursor-pointer group"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #4f46e5 100%)' }}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

              <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0 group-hover:scale-105 transition-transform backdrop-blur-sm">
                    {(effectiveClient?.name || loggedClient.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">Bonjour 👋</p>
                    <p className="text-xl font-black text-white leading-tight truncate">{effectiveClient?.name || loggedClient.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl font-black text-white tabular-nums">{balanceHTG.toLocaleString()} <span className="text-lg font-bold text-white/70">HTG</span></span>
                      <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-xs font-bold">≈ ${balanceUSD}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onOpenWallet?.(); }}
                    className="flex items-center gap-2 shrink-0 h-10 px-5 rounded-2xl bg-white hover:bg-white/90 active:scale-95 text-primary font-black text-sm transition-all shadow-xl"
                  >
                    <Wallet className="h-4 w-4" />
                    Mon Wallet
                  </button>
                </div>

                {/* Recent transactions */}
                {recentTx.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
                    {recentTx.map(tx => {
                      const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'refund';
                      const usdAmt = tx.usdAmount ?? tx.amount;
                      return (
                        <div key={tx.id} className="flex flex-col gap-0.5 bg-white/10 rounded-xl p-2.5 border border-white/10">
                          <span className={`text-xs font-black ${isCredit ? 'text-emerald-300' : 'text-red-300'}`}>
                            {isCredit ? '+' : '-'}${usdAmt.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-white/50 truncate capitalize">
                            {tx.type === 'deposit' ? 'Dépôt' : tx.type === 'withdrawal' ? 'Retrait' : tx.type === 'purchase' ? 'Achat' : 'Reçu'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full overflow-visible group px-1 md:px-0"
          >
            <div className="absolute -inset-4 bg-primary/20 rounded-[50px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative h-[220px] md:h-[340px] w-full rounded-[36px] overflow-hidden bg-black shadow-[0_40px_60px_-15px_rgba(0,0,0,0.35)] border border-white/5">
              <div className="absolute inset-0 w-full h-full z-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${imagesToDisplay[currentSlide]?.url || ''})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/30 to-transparent opacity-55" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="absolute bottom-6 right-6 z-30 flex gap-2.5 bg-black/20 backdrop-blur-md p-1.5 px-2.5 rounded-full border border-white/10">
                {imagesToDisplay.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)} className="relative h-2 flex items-center justify-center transition-all duration-500">
                    <div className={`h-full rounded-full transition-all duration-500 ${currentSlide === i ? 'bg-primary w-8' : 'bg-white/30 w-2 hover:bg-white/50'}`} />
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Quick nav buttons (DB-driven) ── */}
      {!buttonsLoading && buttons.length > 0 && (
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 px-0.5 no-scrollbar">
            {buttons.map(btn => (
              <Button
                key={btn.id}
                variant="ghost"
                className="flex-shrink-0 bg-white border border-gray-100 rounded-[16px] px-5 h-12 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all group"
                onClick={() => resolveRedirection(btn)}
              >
                <div className="flex items-center gap-2">
                  <LucideIcon name={btn.iconName} className="h-4 w-4 transition-colors group-hover:text-primary" color={btn.color || '#2563EB'} />
                  <span className="font-bold text-sm transition-colors group-hover:text-primary" style={{ color: btn.color || '#2563EB' }}>
                    {btn.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
      {buttonsLoading && (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[1, 2, 3].map(i => <div key={i} className="h-12 w-28 bg-gray-100 animate-pulse rounded-2xl shrink-0" />)}
        </div>
      )}

      {/* ── Section access cards ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark">Accès rapide</h2>
          <div className="h-0.5 w-12 bg-primary rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECTION_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => onViewChange(card.key)}
                className={`relative group w-full text-left rounded-3xl overflow-hidden shadow-lg ${card.glow} shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 p-5">
                  <div className="h-11 w-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-white leading-none">{card.title}</h3>
                  <p className="text-white/70 text-xs mt-1 leading-relaxed">{card.subtitle}</p>
                  <div className="flex items-center gap-1 mt-3 text-white/90 text-xs font-black">
                    Explorer
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Nos Produits — real catalog preview ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark">Nos Produits</h2>
          <button
            onClick={() => onViewChange('products')}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {(productsLoading || gamesLoading || cardsLoading) ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-32 shrink-0 h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          (() => {
            const allItems = [
              ...products.map(p => ({ id: p.id, name: p.name, image: p.image, price: p.price, type: 'product' })),
              ...games.map(g => ({ id: g.id, name: g.name, image: g.image, price: g.priceRange, type: 'game' })),
              ...cards.map(c => ({ id: c.id, name: c.name, image: c.image, price: c.price, type: 'card' })),
            ].slice(0, 12);

            if (allItems.length === 0) return (
              <div className="text-center py-8 text-gray-400 text-sm">Aucun produit disponible.</div>
            );

            const handleItemClick = () => {
              if (!loggedClient) {
                onOpenWallet?.();
              } else {
                onViewChange('products');
              }
            };

            return (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                {allItems.map((item, i) => (
                  <motion.button
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, scale: 0.93 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={handleItemClick}
                    className="relative w-32 shrink-0 snap-start rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group bg-white text-left"
                  >
                    <div className="relative h-24 bg-gray-100 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/rena/200/200'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {!loggedClient && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <LucideIcons.Lock className="h-3.5 w-3.5 text-gray-700" />
                          </div>
                        </div>
                      )}
                      {item.price && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-primary text-white shadow-sm leading-none">
                          {item.price}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-black text-dark leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{item.type === 'game' ? 'Jeu' : item.type === 'card' ? 'Carte' : 'Produit'}</p>
                    </div>
                  </motion.button>
                ))}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => onViewChange('products')}
                  className="w-28 shrink-0 snap-start rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <ArrowRight className="h-5 w-5" />
                  <span className="text-[10px] font-black">Voir tout</span>
                </motion.button>
              </div>
            );
          })()
        )}
      </section>

      {/* ── Why Rena ── */}
      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-black text-dark mb-4">Pourquoi choisir Rena ?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: LucideIcons.Zap, label: 'Rapide', desc: 'Traitement en quelques minutes', color: 'text-amber-500 bg-amber-50' },
            { icon: LucideIcons.ShieldCheck, label: 'Sécurisé', desc: 'Transactions protégées', color: 'text-emerald-500 bg-emerald-50' },
            { icon: LucideIcons.Clock, label: '24/7', desc: 'Support disponible en tout temps', color: 'text-blue-500 bg-blue-50' },
            { icon: LucideIcons.Star, label: 'Fiable', desc: 'Des milliers de clients satisfaits', color: 'text-purple-500 bg-purple-50' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center text-center gap-2 p-3 rounded-2xl bg-gray-50">
              <div className={`h-9 w-9 rounded-xl ${item.color} flex items-center justify-center`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-black text-dark text-sm leading-none">{item.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scroll to top ── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-24 right-4 z-50"
          >
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="h-11 w-11 rounded-full bg-primary hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating WhatsApp chat ── */}
      <div className="fixed bottom-24 right-4 z-40 pointer-events-none">
        <Button
          onClick={openWhatsApp}
          className="pointer-events-auto h-13 w-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-center p-0 h-[52px] w-[52px]"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
