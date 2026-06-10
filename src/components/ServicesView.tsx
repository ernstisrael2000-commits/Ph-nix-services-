import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, CreditCard, ShieldCheck, Clock, Phone, MessageCircle,
  X, Wallet, Loader2, ChevronRight, Plus, RefreshCw, Check, Search,
} from 'lucide-react';
import { useCardTopups, useSettings } from '../services/parcelService';
import { submitClientPurchase, useClientData, useClientPendingPurchase } from '../services/clientService';
import { Client, findFeeTier } from '../types';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ServicesViewProps {
  loggedClient: Client | null;
  onOpenWallet: () => void;
  onRequestAuth: () => void;
}

const SERVICE_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
];

type ModalStep = 'choice' | 'create_pay' | 'recharge_form' | 'recharge_pay' | 'success';

export default function ServicesView({ loggedClient, onOpenWallet, onRequestAuth }: ServicesViewProps) {
  const { cards: services, loading } = useCardTopups();
  const { settings } = useSettings();
  const exchangeRate = settings?.exchangeRate || 146;
  const whatsapp = settings?.whatsappAdminNumber || '+50939442830';

  const { client: liveClient } = useClientData(loggedClient?.id || null);
  const effectiveClient = liveClient || loggedClient;
  const hasPendingPurchase = useClientPendingPurchase(loggedClient?.id || null);

  // Slideshow
  const [slideIdx, setSlideIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const SLIDES = [
    { gradient: 'from-indigo-600 via-blue-600 to-cyan-500', title: 'Cartes Virtuelles & Physiques', sub: 'Créez votre carte en quelques clics, rechargez à tout moment.' },
    { gradient: 'from-purple-600 via-violet-600 to-indigo-500', title: 'Recharge Instantanée', sub: 'Ajoutez des fonds à vos cartes facilement depuis votre portefeuille.' },
    { gradient: 'from-emerald-500 via-teal-500 to-cyan-600', title: 'Paiement 100% Sécurisé', sub: 'Vos transactions sont protégées et disponibles 24h/24, 7j/7.' },
  ];

  useEffect(() => {
    const id = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Modal state
  const [selected, setSelected] = useState<any>(null);
  const [step, setStep] = useState<ModalStep>('choice');

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});

  // Purchase loading
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);

  const openService = (svc: any) => {
    setSelected(svc);
    setStep('choice');
    setRechargeAmount(svc.presets?.[0]?.toString() || '');
    setCardNumber('');
    setHolderName('');
    setDynamicFieldValues({});
  };

  const computeRechargeFee = (svc: any, usd: number) => {
    if (!usd || usd <= 0) return { feeUsd: 0, totalUsd: usd, label: '' };
    const tier = findFeeTier(usd, svc.rechargeFeesTiers);
    if (tier) {
      const feeUsd = tier.feeType === 'fixed' ? tier.feeValue : parseFloat((usd * tier.feeValue / 100).toFixed(4));
      const label = tier.feeType === 'fixed' ? `Frais fixe $${tier.feeValue}` : `Frais ${tier.feeValue}%`;
      return { feeUsd, totalUsd: usd + feeUsd, label };
    }
    const globalFee = svc.rechargeFeePercent ?? 0;
    const feeUsd = globalFee > 0 ? parseFloat((usd * globalFee / 100).toFixed(4)) : 0;
    const label = globalFee > 0 ? `Frais ${globalFee}%` : '';
    return { feeUsd, totalUsd: usd + feeUsd, label };
  };

  const closeModal = () => setSelected(null);

  const openWhatsApp = (msg: string) => {
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Fire-and-forget admin notification ─────────────────────────────────────
  const sendOrderNotification = (payload: Record<string, any>) => {
    fetch('/api/admin/order-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  // ── Créer: wallet payment ──────────────────────────────────────────────────
  const handleWalletCreate = async () => {
    if (!effectiveClient || !selected) return;
    const numericPrice = parseFloat(String(selected.price ?? '0').replace(/[^\d.]/g, ''));
    const balanceHTG = Math.round((effectiveClient.balance ?? 0) * exchangeRate);
    if (balanceHTG < numericPrice) {
      toast.error(`Solde insuffisant — vous avez ${balanceHTG.toLocaleString()} HTG`);
      return;
    }
    setPurchaseLoading(true);
    try {
      const priceUSD = numericPrice / exchangeRate;
      await submitClientPurchase(effectiveClient, selected.name, String(selected.price), priceUSD);
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      openWhatsApp(`🎴 *CRÉATION SERVICE — Phénix Services*\n\n👤 Client: *${effectiveClient.name}*\n🔑 Wallet ID: *#${effectiveClient.walletId || '—'}*\n📱 Téléphone: *${effectiveClient.phone || '—'}*\n🛒 Service: *${selected.name}*\n💰 Montant payé: *${numericPrice.toLocaleString()} HTG*\n💳 Méthode: *Solde Wallet*\n📅 Date: *${now}*\n\n✅ Paiement traité. Veuillez activer le service.`);
      sendOrderNotification({
        orderType: 'create',
        serviceName: selected.name,
        servicePrice: String(selected.price),
        paymentMethod: 'Solde Wallet',
        txRef: '',
        clientId: effectiveClient.id,
        clientName: effectiveClient.name,
        clientWalletId: effectiveClient.walletId || '',
        amount: priceUSD,
        amountHTG: numericPrice,
        cardDetails: { Téléphone: effectiveClient.phone || '' },
      });
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  // ── Recharge: submit ───────────────────────────────────────────────────────
  const handleRechargeSubmit = () => {
    if (!rechargeAmount) { toast.error('Veuillez entrer un montant'); return; }
    setStep('recharge_pay');
  };

  // ── Recharge: wallet pay ───────────────────────────────────────────────────
  const handleWalletRecharge = async () => {
    if (!effectiveClient || !selected || !rechargeAmount) return;
    const usd = parseFloat(rechargeAmount);
    const { feeUsd, totalUsd } = computeRechargeFee(selected, usd);
    const totalHTG = Math.round(totalUsd * exchangeRate);
    if ((effectiveClient.balance ?? 0) < totalUsd) {
      toast.error(`Solde insuffisant — vous avez $${(effectiveClient.balance ?? 0).toFixed(2)} USD`);
      return;
    }
    const hasCustomFields = selected.rechargeFields?.length > 0;
    const cardDetails: Record<string, string> = {};
    if (hasCustomFields) {
      (selected.rechargeFields as { id: string; label: string }[]).forEach(f => {
        cardDetails[f.label] = dynamicFieldValues[f.id] || 'Non spécifié';
      });
    } else {
      if (holderName) cardDetails['Titulaire'] = holderName;
      if (cardNumber) cardDetails['Numéro carte'] = cardNumber;
    }
    setRechargeLoading(true);
    try {
      await submitClientPurchase(
        effectiveClient,
        `Recharge ${selected.name} — $${usd}${feeUsd > 0 ? ` + frais $${feeUsd.toFixed(2)}` : ''}`,
        String(totalHTG),
        totalUsd,
      );
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const dynamicLines = hasCustomFields
        ? (selected.rechargeFields as { id: string; label: string }[]).map(f => `${f.label}: *${dynamicFieldValues[f.id] || 'Non spécifié'}*`).join('\n')
        : `👤 Titulaire: *${holderName || 'Non spécifié'}*\n🔢 Numéro/Info: *${cardNumber || 'Non spécifié'}*`;
      openWhatsApp(`💳 *RECHARGE CARTE — Phénix Services*\n\n🎴 Carte: *${selected.name}*\n${dynamicLines}\n💵 Montant: *$${usd}*${feeUsd > 0 ? `\n💸 Frais: *$${feeUsd.toFixed(2)}*\n💵 Total: *$${totalUsd.toFixed(2)}*` : ''}\n🇭🇹 Équivalent: *${totalHTG.toLocaleString()} HTG*\n\n💳 Méthode: *Solde Wallet*\n👤 Client: *${effectiveClient.name}*\n🔑 Wallet: *#${effectiveClient.walletId || '—'}*\n📅 Date: *${now}*\n\n✅ Paiement traité. Veuillez activer.`);
      sendOrderNotification({
        orderType: 'recharge',
        serviceName: selected.name,
        servicePrice: '',
        paymentMethod: 'Solde Wallet',
        txRef: '',
        clientId: effectiveClient.id || '',
        clientName: effectiveClient.name || 'Anonyme',
        clientWalletId: effectiveClient.walletId || '',
        amount: totalUsd,
        amountHTG: totalHTG,
        cardDetails,
      });
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du paiement.');
    } finally {
      setRechargeLoading(false);
    }
  };

  const balanceHTG = effectiveClient ? Math.round((effectiveClient.balance ?? 0) * exchangeRate) : 0;
  const creationPriceNum = selected ? parseFloat(String(selected.price ?? '0').replace(/[^\d.]/g, '')) : 0;
  const hasEnoughBalance = balanceHTG >= creationPriceNum && creationPriceNum > 0;

  const filteredServices = services.filter(s =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-28">
      {/* Slideshow banner */}
      <div className="relative h-48 overflow-hidden">
        <AnimatePresence mode="wait">
          {SLIDES.map((slide, idx) => idx === slideIdx && (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} flex flex-col justify-center px-6`}
            >
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Services Phénix
              </p>
              <h2 className="text-2xl font-black text-white leading-tight mb-1">{slide.title}</h2>
              <p className="text-white/70 text-sm leading-snug max-w-xs">{slide.sub}</p>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/8 pointer-events-none" />
              <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full bg-white/6 pointer-events-none" />
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Dot indicators */}
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === slideIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un service…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-3xl mx-auto px-4 pt-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
            <CreditCard className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-semibold">{searchQuery ? 'Aucun service trouvé.' : 'Aucun service disponible pour le moment.'}</p>
            <p className="text-gray-300 text-xs mt-1">{searchQuery ? 'Essayez un autre terme de recherche.' : "L'administrateur peut en ajouter depuis le tableau de bord."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredServices.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <div className="w-full group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left">
                  {/* Image — clickable, opens choice */}
                  <button onClick={() => openService(svc)} className="w-full text-left">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={svc.image}
                        alt={svc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${svc.id}/400/300`; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${SERVICE_GRADIENTS[i % SERVICE_GRADIENTS.length]} text-white shadow-md`}>
                          {svc.price}
                        </span>
                      </div>
                    </div>

                    {/* Name + description */}
                    <div className="px-3 pt-3 pb-1">
                      <p className="font-black text-gray-900 text-sm leading-tight line-clamp-1">{svc.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{svc.description || 'Service disponible'}</p>
                    </div>
                  </button>

                  {/* Action buttons — each goes directly to the right step */}
                  <div className="px-3 pb-3 pt-1 flex items-center gap-1.5">
                    <button
                      onClick={() => { openService(svc); setStep('create_pay'); }}
                      className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" /> Créer
                    </button>
                    <button
                      onClick={() => { openService(svc); setStep('recharge_form'); }}
                      className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-full transition-colors"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Recharge
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-5 border border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-white text-base">Besoin d'aide ?</h3>
              <p className="text-gray-400 text-xs mt-0.5">Notre équipe est disponible 24h/24.</p>
            </div>
          </div>
          <button
            onClick={() => openWhatsApp('Bonjour, je souhaite avoir plus de renseignements sur vos services.')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 transition-colors text-white font-black text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter via WhatsApp
          </button>
        </motion.div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="relative">
                <div className="h-56 relative overflow-hidden">
                  <img src={selected.image} alt={selected.name} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selected.id}/800/300`; }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
                  <div className="absolute inset-0 p-4 flex items-end">
                    <div>
                      <p className="text-white font-black text-lg leading-tight">{selected.name}</p>
                      {selected.description && <p className="text-white/70 text-xs mt-0.5">{selected.description}</p>}
                    </div>
                  </div>
                </div>
                <button onClick={closeModal}
                  className="absolute top-3 right-3 h-8 w-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── STEP: choice ── */}
              {step === 'choice' && (
                <div className="p-5 space-y-3">
                  <p className="text-sm font-black text-gray-500 uppercase tracking-widest text-center mb-4">Que voulez-vous faire ?</p>

                  <button
                    onClick={() => setStep('create_pay')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-gray-900">Créer</p>
                      <p className="text-xs text-gray-500 mt-0.5">Obtenir ce service — <span className="font-black text-indigo-600">{selected.price}</span></p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-indigo-400" />
                  </button>

                  <button
                    onClick={() => setStep('recharge_form')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <RefreshCw className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-gray-900">Recharger</p>
                      <p className="text-xs text-gray-500 mt-0.5">Ajouter du crédit à votre carte</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-emerald-400" />
                  </button>
                </div>
              )}

              {/* ── STEP: create_pay ── */}
              {step === 'create_pay' && (
                <div className="p-5 space-y-4">
                  <button onClick={() => setStep('choice')} className="text-xs text-gray-400 hover:text-gray-600 font-bold flex items-center gap-1">
                    ← Retour
                  </button>

                  <div className="bg-indigo-50 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Total à payer</p>
                      <p className="text-2xl font-black text-indigo-600">{selected.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Votre solde</p>
                      <p className={`text-sm font-black ${hasEnoughBalance ? 'text-emerald-600' : 'text-red-400'}`}>{balanceHTG.toLocaleString()} HTG</p>
                    </div>
                  </div>

                  {effectiveClient ? (
                    <>
                      {hasPendingPurchase && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold">
                          ⏳ Vous avez déjà une commande en attente de traitement.
                        </div>
                      )}
                      <button
                        disabled={purchaseLoading || !hasEnoughBalance || hasPendingPurchase}
                        onClick={handleWalletCreate}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${hasEnoughBalance && !hasPendingPurchase ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4" /> Payer avec mon solde</>}
                      </button>
                      {!hasEnoughBalance && (
                        <button onClick={() => { closeModal(); onOpenWallet(); }} className="w-full py-3 rounded-2xl border-2 border-primary text-primary font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                          Recharger mon solde →
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={onRequestAuth}
                      className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                      <Wallet className="h-4 w-4" /> Se connecter pour payer
                    </button>
                  )}
                </div>
              )}

              {/* ── STEP: recharge_form ── */}
              {step === 'recharge_form' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => setStep('choice')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">
                      ← Retour
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Dynamic fields from admin config, or default fields */}
                    {selected.rechargeFields?.length > 0 ? (
                      selected.rechargeFields.map((f: { id: string; label: string; placeholder: string; required?: boolean }) => (
                        <div key={f.id}>
                          <Label className="text-xs font-black text-gray-600">
                            {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <Input
                            value={dynamicFieldValues[f.id] || ''}
                            onChange={e => setDynamicFieldValues(v => ({ ...v, [f.id]: e.target.value }))}
                            placeholder={f.placeholder || f.label}
                            className="mt-1 rounded-xl border-gray-200"
                          />
                        </div>
                      ))
                    ) : (
                      <>
                        <div>
                          <Label className="text-xs font-black text-gray-600">Nom du titulaire</Label>
                          <Input value={holderName} onChange={e => setHolderName(e.target.value)}
                            placeholder="Ex: Jean Dupont" className="mt-1 rounded-xl border-gray-200" />
                        </div>
                        <div>
                          <Label className="text-xs font-black text-gray-600">Numéro / Identifiant de la carte</Label>
                          <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                            placeholder="Ex: 4111 1111 1111 1111" className="mt-1 rounded-xl border-gray-200" />
                        </div>
                      </>
                    )}

                    {/* Presets */}
                    {selected.presets?.length > 0 && (
                      <div>
                        <Label className="text-xs font-black text-gray-600">Montant (USD)</Label>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {selected.presets.map((p: number) => (
                            <button key={p} onClick={() => setRechargeAmount(String(p))}
                              className={`px-3 py-1.5 rounded-xl text-sm font-black border-2 transition-all ${rechargeAmount === String(p) ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                              ${p}
                            </button>
                          ))}
                        </div>
                        <Input value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)}
                          placeholder="Ou entrer un montant personnalisé" type="number" min="1"
                          className="mt-2 rounded-xl border-gray-200" />
                      </div>
                    )}
                    {!selected.presets?.length && (
                      <div>
                        <Label className="text-xs font-black text-gray-600">Montant à recharger (USD)</Label>
                        <Input value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)}
                          placeholder="Ex: 25" type="number" min="1" className="mt-1 rounded-xl border-gray-200" />
                      </div>
                    )}

                    {rechargeAmount && (() => {
                      const usd = parseFloat(rechargeAmount || '0');
                      const { feeUsd, totalUsd, label } = computeRechargeFee(selected, usd);
                      const totalHtg = Math.round(totalUsd * exchangeRate);
                      return (
                        <div className="space-y-1.5">
                          {feeUsd > 0 && (
                            <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-between border border-amber-100">
                              <p className="text-xs text-amber-700 font-semibold">{label}</p>
                              <p className="font-black text-amber-700">${feeUsd.toFixed(2)}</p>
                            </div>
                          )}
                          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-semibold">{feeUsd > 0 ? 'Total à payer' : 'Équivalent HTG'}</p>
                            <p className="font-black text-emerald-600">
                              {feeUsd > 0 ? `$${totalUsd.toFixed(2)} = ` : ''}{totalHtg.toLocaleString()} HTG
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <Button onClick={handleRechargeSubmit}
                    disabled={!rechargeAmount}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm disabled:opacity-50">
                    Continuer →
                  </Button>
                </div>
              )}

              {/* ── STEP: recharge_pay ── */}
              {step === 'recharge_pay' && (() => {
                const usd = parseFloat(rechargeAmount || '0');
                const { feeUsd, totalUsd, label } = computeRechargeFee(selected, usd);
                const totalHTG = Math.round(totalUsd * exchangeRate);
                const walletUSD = effectiveClient?.balance ?? 0;
                const canPay = walletUSD >= totalUsd && totalUsd > 0;
                return (
                  <div className="p-5 space-y-4">
                    <button onClick={() => setStep('recharge_form')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">
                      ← Retour
                    </button>

                    <div className="rounded-2xl border border-emerald-100 overflow-hidden text-sm">
                      <div className="flex justify-between px-4 py-3 bg-white border-b border-emerald-50">
                        <span className="text-gray-500 font-semibold">Carte</span>
                        <span className="font-black">{selected.name}</span>
                      </div>
                      <div className="flex justify-between px-4 py-3 bg-white border-b border-emerald-50">
                        <span className="text-gray-500 font-semibold">Montant</span>
                        <span className="font-black">${usd.toFixed(2)}</span>
                      </div>
                      {feeUsd > 0 && (
                        <div className="flex justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                          <span className="text-amber-700 font-semibold">{label}</span>
                          <span className="font-black text-amber-700">+${feeUsd.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-3 bg-emerald-50">
                        <span className="font-black text-emerald-800 text-xs uppercase tracking-wide">Total</span>
                        <span className="font-black text-emerald-700">${totalUsd.toFixed(2)} = {totalHTG.toLocaleString()} HTG</span>
                      </div>
                    </div>

                    {effectiveClient ? (
                      <>
                        <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${canPay ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="flex items-center gap-2">
                            <Wallet className={`h-4 w-4 ${canPay ? 'text-emerald-600' : 'text-red-400'}`} />
                            <span className="text-sm font-semibold text-gray-700">Solde wallet</span>
                          </div>
                          <span className={`font-black text-sm ${canPay ? 'text-emerald-600' : 'text-red-500'}`}>
                            ${walletUSD.toFixed(2)} {canPay ? '✓' : '— insuffisant'}
                          </span>
                        </div>
                        <Button
                          disabled={rechargeLoading || !canPay}
                          onClick={handleWalletRecharge}
                          className={`w-full h-12 rounded-2xl font-black text-sm ${canPay ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          {rechargeLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Traitement...</> : <><Wallet className="h-4 w-4 mr-1" /> Payer avec mon solde</>}
                        </Button>
                        {!canPay && (
                          <button onClick={() => { closeModal(); onOpenWallet(); }} className="w-full py-3 rounded-2xl border-2 border-primary text-primary font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                            Recharger mon solde →
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={onRequestAuth}
                        className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                        <Wallet className="h-4 w-4" /> Se connecter pour payer
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* ── STEP: success ── */}
              {step === 'success' && (
                <div className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900">Demande envoyée !</p>
                    <p className="text-sm text-gray-500 mt-1">Notre équipe va traiter votre demande rapidement via WhatsApp.</p>
                  </div>
                  <Button onClick={closeModal}
                    className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black">
                    Fermer
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
