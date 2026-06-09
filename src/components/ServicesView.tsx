import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, CreditCard, ShieldCheck, Clock, Phone, MessageCircle,
  X, Wallet, Loader2, ChevronRight, Plus, RefreshCw, Check, Upload,
} from 'lucide-react';
import { useCardTopups, useSettings } from '../services/parcelService';
import { submitClientPurchase, useClientData, useClientPendingPurchase } from '../services/clientService';
import { Client } from '../types';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface ServicesViewProps {
  loggedClient: Client | null;
  onOpenWallet: () => void;
  onRequestAuth: () => void;
}

const PAYMENT_METHODS = [
  { id: 'moncash', label: 'MonCash', color: 'border-red-300 bg-red-50 text-red-700', activeColor: 'border-red-500 bg-red-100 text-red-800' },
  { id: 'natcash', label: 'NatCash', color: 'border-amber-300 bg-amber-50 text-amber-700', activeColor: 'border-amber-500 bg-amber-100 text-amber-800' },
  { id: 'paypal',  label: 'PayPal',  color: 'border-blue-300 bg-blue-50 text-blue-700',  activeColor: 'border-blue-500 bg-blue-100 text-blue-800'  },
];

function MoncashLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#E31D1C"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Arial,sans-serif">M</text>
    </svg>
  );
}
function NatcashLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#F59E0B"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Arial,sans-serif">N</text>
    </svg>
  );
}
function PaypalLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#003087"/>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="900" fontFamily="Arial,sans-serif">PP</text>
    </svg>
  );
}
const METHOD_LOGOS: Record<string, React.FC<{size?: number}>> = {
  moncash: MoncashLogo,
  natcash: NatcashLogo,
  paypal:  PaypalLogo,
};

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
  const whatsapp = settings?.whatsappAdminNumber || '+50944813185';

  const { client: liveClient } = useClientData(loggedClient?.id || null);
  const effectiveClient = liveClient || loggedClient;
  const hasPendingPurchase = useClientPendingPurchase(loggedClient?.id || null);

  // Modal state
  const [selected, setSelected] = useState<any>(null);
  const [step, setStep] = useState<ModalStep>('choice');

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [payMethod, setPayMethod] = useState<string>('moncash');
  const [txInfo, setTxInfo] = useState('');
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});

  // Creation pay
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Proof of payment upload
  const [proofFile, setProofFile]       = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const handleProofSelect = (file: File | null) => {
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = e => setProofPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;
    setProofUploading(true);
    try {
      const path = `proofs/services/${Date.now()}_${proofFile.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, proofFile);
      await new Promise<void>((res, rej) => task.on('state_changed', null, rej, res));
      return await getDownloadURL(sRef);
    } catch {
      toast.error('Impossible de télécharger le justificatif.');
      return null;
    } finally {
      setProofUploading(false);
    }
  };

  const openService = (svc: any) => {
    setSelected(svc);
    setStep('choice');
    setRechargeAmount(svc.presets?.[0]?.toString() || '');
    setCardNumber('');
    setHolderName('');
    setTxInfo('');
    setPayMethod('moncash');
    setDynamicFieldValues({});
    setProofFile(null);
    setProofPreview(null);
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

  // ── Créer: payment method (WhatsApp) ──────────────────────────────────────
  const handleMethodCreate = async () => {
    if (!selected) return;
    const method = PAYMENT_METHODS.find(m => m.id === payMethod);
    const proofUrl = await uploadProof();
    openWhatsApp(`🎴 *CRÉATION SERVICE — Phénix Services*\n\n🛒 Service: *${selected.name}*\n💰 Prix: *${selected.price}*\n\n💳 Méthode de paiement: *${method?.label}*\n📝 Référence transaction: *${txInfo || 'Non fournie'}*${proofUrl ? `\n🖼️ Justificatif: ${proofUrl}` : ''}\n\nMerci de valider ma commande.`);
    sendOrderNotification({
      orderType: 'create',
      serviceName: selected.name,
      servicePrice: String(selected.price),
      paymentMethod: method?.label || payMethod,
      txRef: txInfo || '',
      clientId: effectiveClient?.id || '',
      clientName: effectiveClient?.name || 'Anonyme',
      clientWalletId: effectiveClient?.walletId || '',
      amount: 0,
      amountHTG: parseFloat(String(selected.price ?? '0').replace(/[^\d.]/g, '')),
      cardDetails: {},
    });
    setStep('success');
  };

  // ── Recharge: submit ───────────────────────────────────────────────────────
  const handleRechargeSubmit = () => {
    if (!rechargeAmount) { toast.error('Veuillez entrer un montant'); return; }
    setStep('recharge_pay');
  };

  const handleFinalRecharge = async () => {
    if (!selected || !rechargeAmount) return;
    const method = PAYMENT_METHODS.find(m => m.id === payMethod);
    const usd = parseFloat(rechargeAmount);
    const feePercent = selected.rechargeFeePercent ?? 0;
    const feeUsd = feePercent > 0 ? Math.round(usd * feePercent) / 100 : 0;
    const totalUsd = usd + feeUsd;
    const htg = Math.round(totalUsd * exchangeRate);
    const hasCustomFields = selected.rechargeFields?.length > 0;
    let dynamicLines = '';
    const cardDetails: Record<string, string> = {};
    if (hasCustomFields) {
      dynamicLines = (selected.rechargeFields as { id: string; label: string }[]).map(f => {
        const val = dynamicFieldValues[f.id] || 'Non spécifié';
        cardDetails[f.label] = val;
        return `${f.label}: *${val}*`;
      }).join('\n');
    } else {
      dynamicLines = `👤 Titulaire: *${holderName || 'Non spécifié'}*\n🔢 Numéro/Info carte: *${cardNumber || 'Non spécifié'}*`;
      if (holderName) cardDetails['Titulaire'] = holderName;
      if (cardNumber) cardDetails['Numéro carte'] = cardNumber;
    }
    const proofUrl = await uploadProof();
    openWhatsApp(`💳 *RECHARGE CARTE — Phénix Services*\n\n🎴 Carte: *${selected.name}*\n${dynamicLines}\n💵 Montant USD: *$${usd}*${feePercent > 0 ? `\n💸 Frais (${feePercent}%): *$${feeUsd.toFixed(2)}*\n💵 Total: *$${totalUsd.toFixed(2)}*` : ''}\n🇭🇹 Équivalent: *${htg.toLocaleString()} HTG*\n\n💳 Méthode: *${method?.label}*\n📝 Référence: *${txInfo || 'Non fournie'}*${proofUrl ? `\n🖼️ Justificatif: ${proofUrl}` : ''}\n\nMerci de traiter ma recharge.`);
    sendOrderNotification({
      orderType: 'recharge',
      serviceName: selected.name,
      servicePrice: '',
      paymentMethod: method?.label || payMethod,
      txRef: txInfo || '',
      clientId: effectiveClient?.id || '',
      clientName: effectiveClient?.name || 'Anonyme',
      clientWalletId: effectiveClient?.walletId || '',
      amount: totalUsd,
      amountHTG: htg,
      cardDetails,
    });
    setStep('success');
  };

  const balanceHTG = effectiveClient ? Math.round((effectiveClient.balance ?? 0) * exchangeRate) : 0;
  const creationPriceNum = selected ? parseFloat(String(selected.price ?? '0').replace(/[^\d.]/g, '')) : 0;
  const hasEnoughBalance = balanceHTG >= creationPriceNum && creationPriceNum > 0;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-4 pt-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Nos Services</h1>
              <p className="text-white/60 text-xs font-medium mt-0.5">Créez et rechargez vos cartes facilement</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Sécurisé', value: '100%', icon: ShieldCheck },
              { label: 'Disponibilité', value: '24/7', icon: Clock },
              { label: 'Satisfaction', value: '99%', icon: Globe },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
                <s.icon className="h-4 w-4 text-white/70 mx-auto mb-1" />
                <p className="text-lg font-black text-white leading-none">{s.value}</p>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-3xl mx-auto px-4 -mt-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
            <CreditCard className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-semibold">Aucun service disponible pour le moment.</p>
            <p className="text-gray-300 text-xs mt-1">L'administrateur peut en ajouter depuis le tableau de bord.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {services.map((svc, i) => (
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
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => setStep('choice')} className="text-xs text-gray-400 hover:text-gray-600 font-bold flex items-center gap-1">
                      ← Retour
                    </button>
                  </div>
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

                  {/* Wallet pay */}
                  {effectiveClient ? (
                    <button
                      disabled={purchaseLoading || !hasEnoughBalance || hasPendingPurchase}
                      onClick={handleWalletCreate}
                      className={`w-full h-13 py-3.5 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all ${hasEnoughBalance && !hasPendingPurchase ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:scale-95' : 'border-red-200 text-red-400 opacity-60 cursor-not-allowed'}`}
                    >
                      {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4" /> Payer avec mon solde</>}
                    </button>
                  ) : (
                    <button onClick={onRequestAuth}
                      className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                      <Wallet className="h-4 w-4" /> Connexion pour payer avec solde
                    </button>
                  )}

                  <div className="flex items-center gap-2 my-1">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs text-gray-400 font-semibold">OU</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  {/* Payment method */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-600">Méthode de paiement</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(m => {
                        const Logo = METHOD_LOGOS[m.id];
                        const active = payMethod === m.id;
                        return (
                          <button key={m.id} onClick={() => setPayMethod(m.id)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-black transition-all ${active ? m.activeColor : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'}`}>
                            <Logo size={26} />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <div>
                      <Label className="text-xs font-black text-gray-600">Référence / Transaction ID</Label>
                      <Input value={txInfo} onChange={e => setTxInfo(e.target.value)}
                        placeholder="Ex: REF123456" className="mt-1 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  {/* Proof of payment */}
                  <div>
                    <Label className="text-xs font-black text-gray-600">Justificatif de paiement (optionnel)</Label>
                    <input ref={proofInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => handleProofSelect(e.target.files?.[0] || null)} />
                    {proofPreview ? (
                      <div className="mt-1 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={proofPreview} alt="Justificatif" className="w-full max-h-32 object-cover" />
                        <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center text-[10px] hover:bg-black/70">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => proofInputRef.current?.click()}
                        className="mt-1 w-full h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-400 font-semibold hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                        <Upload className="h-4 w-4" /> Ajouter une capture d'écran
                      </button>
                    )}
                  </div>

                  <Button onClick={handleMethodCreate} disabled={proofUploading}
                    className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm disabled:opacity-60">
                    {proofUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Envoi...</> : 'Envoyer la demande via WhatsApp'}
                  </Button>
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
                      const feePercent = selected?.rechargeFeePercent ?? 0;
                      const feeUsd = feePercent > 0 ? Math.round(usd * feePercent) / 100 : 0;
                      const totalUsd = usd + feeUsd;
                      const totalHtg = Math.round(totalUsd * exchangeRate);
                      return (
                        <div className="space-y-1.5">
                          {feePercent > 0 && (
                            <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-between border border-amber-100">
                              <p className="text-xs text-amber-700 font-semibold">Frais de service ({feePercent}%)</p>
                              <p className="font-black text-amber-700">${feeUsd.toFixed(2)}</p>
                            </div>
                          )}
                          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-semibold">{feePercent > 0 ? 'Total à payer' : 'Équivalent HTG'}</p>
                            <p className="font-black text-emerald-600">
                              {feePercent > 0 ? `$${totalUsd.toFixed(2)} = ` : ''}{totalHtg.toLocaleString()} HTG
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <Button onClick={handleRechargeSubmit}
                    disabled={!rechargeAmount}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm disabled:opacity-50">
                    Continuer → Choisir le paiement
                  </Button>
                </div>
              )}

              {/* ── STEP: recharge_pay ── */}
              {step === 'recharge_pay' && (
                <div className="p-5 space-y-4">
                  <button onClick={() => setStep('recharge_form')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">
                    ← Retour
                  </button>

                  <div className="bg-emerald-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 font-semibold">Récapitulatif</p>
                    <p className="font-black text-gray-900 mt-1">{selected.name}</p>
                    <p className="text-sm text-emerald-700 font-black">${rechargeAmount} USD = {Math.round(parseFloat(rechargeAmount || '0') * exchangeRate).toLocaleString()} HTG</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-600">Méthode de paiement</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(m => {
                        const Logo = METHOD_LOGOS[m.id];
                        const active = payMethod === m.id;
                        return (
                          <button key={m.id} onClick={() => setPayMethod(m.id)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-black transition-all ${active ? m.activeColor : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'}`}>
                            <Logo size={26} />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <div>
                      <Label className="text-xs font-black text-gray-600">Référence / Transaction ID</Label>
                      <Input value={txInfo} onChange={e => setTxInfo(e.target.value)}
                        placeholder="Ex: REF123456" className="mt-1 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  {/* Proof of payment */}
                  <div>
                    <Label className="text-xs font-black text-gray-600">Justificatif de paiement (optionnel)</Label>
                    <input ref={proofInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => handleProofSelect(e.target.files?.[0] || null)} />
                    {proofPreview ? (
                      <div className="mt-1 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={proofPreview} alt="Justificatif" className="w-full max-h-32 object-cover" />
                        <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => proofInputRef.current?.click()}
                        className="mt-1 w-full h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-400 font-semibold hover:border-emerald-300 hover:text-emerald-400 transition-colors">
                        <Upload className="h-4 w-4" /> Ajouter une capture d'écran
                      </button>
                    )}
                  </div>

                  <Button onClick={handleFinalRecharge} disabled={proofUploading}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm disabled:opacity-60">
                    {proofUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Envoi...</> : 'Confirmer via WhatsApp'}
                  </Button>
                </div>
              )}

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
