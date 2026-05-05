import React from 'react';
import { motion } from 'motion/react';
import { Package, CreditCard, Gamepad2, Truck, MessageCircle, ArrowRight, CircleCheck as CheckCircle2, Info, ArrowUp, Circle as HelpCircle, Globe, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { CaptchaWidget } from './CaptchaWidget';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useProducts, useGames, useCardTopups, useSliderImages, useNavButtons, useSettings, useOnlineServices } from '../services/parcelService';
import { AnimatePresence } from 'motion/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Loader as Loader2, ShieldCheck, Zap, Star, Headphones, QrCode, Wallet, Smartphone, Landmark, X, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Copy, CircleCheck as CheckCircle, ChevronRight, Clock, DollarSign } from 'lucide-react';
import { submitClientPurchase, useClientData, useClientTransactions, submitClientDeposit, submitClientWithdrawal, useClientPendingPurchase } from '../services/clientService';
import { Client } from '../types';
import { toast } from 'sonner';

const WHATSAPP_NUMBER = "+50944813185";
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';

// ── WalletPayButton — extracted as a proper React component to avoid DOM reconciliation
// errors that occur when an IIFE returns different element types (div vs button) during
// simultaneous state transitions while a Dialog is closing.
interface WalletPayButtonProps {
  client: Client;
  price: string | number | undefined;
  productName: string | undefined;
  hasPendingPurchase: boolean;
  purchaseLoading: boolean;
  setPurchaseLoading: (v: boolean) => void;
  onSuccess: () => void;
}

const WalletPayButton = ({
  client, price, productName, hasPendingPurchase, purchaseLoading, setPurchaseLoading, onSuccess
}: WalletPayButtonProps) => {
  const numericPrice = parseFloat(String(price ?? '0').replace(/[^\d.]/g, ''));
  const currentBalance = client.balance ?? 0;
  const hasBalance = !isNaN(numericPrice) && numericPrice > 0 && currentBalance >= numericPrice;

  const handlePay = async () => {
    if (purchaseLoading) return;
    if (!hasBalance) { toast.error(`Solde insuffisant. Vous avez ${currentBalance.toLocaleString()} HTG`); return; }
    setPurchaseLoading(true);
    try {
      await submitClientPurchase(client, productName ?? '', String(price ?? ''), numericPrice);
      toast.success(`✅ Achat effectué ! ${numericPrice.toLocaleString()} HTG débité de votre compte.`);
      onSuccess();

      // Open WhatsApp to notify admin
      const adminNum = (window as any).__neopayAdminPhone || WHATSAPP_NUMBER;
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const msg =
        `🛍️ *ACHAT EFFECTUÉ — Neopay*\n\n` +
        `👤 Client: *${client.name}*\n` +
        `🔑 ID Wallet: *#${client.walletId || '—'}*\n` +
        `📱 Téléphone: *${client.phone || '—'}*\n` +
        `🛒 Service: *${productName || '—'}*\n` +
        `💰 Montant payé: *${numericPrice.toLocaleString()} HTG*\n` +
        `💳 Méthode: *Solde Wallet*\n` +
        `📅 Date: *${now}*\n\n` +
        `✅ Paiement traité automatiquement. Veuillez activer le service.`;
      window.open(`https://wa.me/${adminNum.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'achat.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={purchaseLoading || !hasBalance}
      onClick={handlePay}
      className={`w-full h-14 rounded-2xl border-2 font-black text-base flex items-center justify-center gap-3 transition-all
        ${hasBalance
          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 active:scale-95'
          : 'border-red-200 text-red-400 cursor-not-allowed opacity-60'
        }`}
    >
      {purchaseLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <Wallet className="h-5 w-5" />
          {hasBalance
            ? `Payer avec mon solde (${currentBalance.toLocaleString()} HTG)`
            : `Solde insuffisant (${currentBalance.toLocaleString()} HTG)`
          }
        </>
      )}
    </button>
  );
};

const LucideIcon = ({ name, className, color }: { name: string, className?: string, color?: string }) => {
  const Icon = (LucideIcons as any)[name] || HelpCircle;
  return <Icon className={className} style={{ color }} />;
};

const SLIDER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop", // Fintech/Crypto abstract
  "https://images.unsplash.com/photo-1614850523296-62c09279446a?q=80&w=2070&auto=format&fit=crop", // Abstract gradients
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop", // Tech/Security
];

const typeLabel: Record<string, string> = {
  deposit: 'Dépôt',
  withdrawal: 'Retrait',
  purchase: 'Achat',
  transfer_received: 'Reçu',
  refund: 'Remboursement',
};

export default function HomeView({ onTrackingClick, onViewChange, loggedClient, onOpenWallet }: { onTrackingClick: () => void, onViewChange: (view: any) => void, loggedClient?: Client | null, onOpenWallet?: () => void }) {
  const { products, loading: productsLoading } = useProducts();
  const { games, loading: gamesLoading } = useGames();
  const { cards, loading: cardsLoading } = useCardTopups();
  const { sliderImages, loading: sliderLoading } = useSliderImages();
  const { buttons, loading: buttonsLoading } = useNavButtons();
  const { settings } = useSettings();
  const { services: onlineSubServices } = useOnlineServices();
  // Expose admin phone globally so WalletPayButton can use it
  React.useEffect(() => {
    if (settings?.whatsappAdminNumber) {
      (window as any).__neopayAdminPhone = settings.whatsappAdminNumber;
    }
  }, [settings?.whatsappAdminNumber]);
  const [isGamesDialogOpen, setIsGamesDialogOpen] = React.useState(false);
  const [isCardsDialogOpen, setIsCardsDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [customAmountUSD, setCustomAmountUSD] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showOnlineServices, setShowOnlineServices] = useState(false);

  // Live client wallet data
  const { client: liveClient } = useClientData(loggedClient?.id || null);
  const { transactions: clientTx } = useClientTransactions(loggedClient?.id || null);
  const recentTx = clientTx.slice(0, 3);
  const effectiveClient = liveClient || loggedClient;
  const hasPendingPurchase = useClientPendingPurchase(loggedClient?.id || null);
  const exchangeRate = settings?.exchangeRate || 146;
  const balanceHTG = effectiveClient?.balance ?? 0;
  const balanceUSD = (balanceHTG / exchangeRate).toFixed(2);

  // Inline wallet deposit/withdraw state
  const [isWalletDepositOpen, setIsWalletDepositOpen] = useState(false);
  const [isWalletWithdrawOpen, setIsWalletWithdrawOpen] = useState(false);
  const [walletDepositAmount, setWalletDepositAmount] = useState('');
  const [walletDepositMethod, setWalletDepositMethod] = useState('MonCash');
  const [walletDepositTxId, setWalletDepositTxId] = useState('');
  const [walletWithdrawAmount, setWalletWithdrawAmount] = useState('');
  const [walletWithdrawMethod, setWalletWithdrawMethod] = useState('MonCash');
  const [walletWithdrawAccount, setWalletWithdrawAccount] = useState('');
  const [walletActionLoading, setWalletActionLoading] = useState(false);
  const [copiedWalletId, setCopiedWalletId] = useState(false);
  const [walletDepositCaptcha, setWalletDepositCaptcha] = useState<string | null>(null);
  const [walletWithdrawCaptcha, setWalletWithdrawCaptcha] = useState<string | null>(null);
  const walletDepositCaptchaRef = useRef<ReCAPTCHA>(null);
  const walletWithdrawCaptchaRef = useRef<ReCAPTCHA>(null);

  const depositMethodInfo = {
    MonCash: { number: settings?.moncashNumber, qr: settings?.moncashQR, color: 'rose', label: 'MonCash' },
    NatCash: { number: settings?.natcashNumber, qr: settings?.natcashQR, color: 'amber', label: 'NatCash' },
    Admi: { number: settings?.admiNumber, qr: settings?.admiQR, color: 'indigo', label: 'Admi' },
  } as Record<string, { number?: string; qr?: string; color: string; label: string }>;

  const handleWalletDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(walletDepositAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Montant invalide."); return; }
    if (!effectiveClient) return;
    if (RECAPTCHA_SITE_KEY && !walletDepositCaptcha) { toast.error("Veuillez valider le captcha."); return; }
    setWalletActionLoading(true);
    try {
      await submitClientDeposit(effectiveClient, amount, walletDepositMethod, walletDepositTxId || undefined, walletDepositCaptcha || undefined);
      const info = depositMethodInfo[walletDepositMethod];
      const waNum = settings?.whatsappAdminNumber || WHATSAPP_NUMBER;
      const msg = `Bonjour Neopay,\n\nJe souhaite effectuer un *DÉPÔT*:\n👤 Nom: *${effectiveClient.name}*\n🔑 ID Wallet: *${effectiveClient.walletId}*\n💰 Montant: *${amount.toLocaleString()} HTG*\n≈ *$${(amount / exchangeRate).toFixed(2)} USD*\n💳 Via: *${walletDepositMethod}*${info?.number ? `\n📞 Numéro: *${info.number}*` : ''}${walletDepositTxId ? `\n🔖 ID Transaction: *${walletDepositTxId}*` : ''}\n\nMerci de valider mon dépôt.`;
      window.open(`https://wa.me/${waNum.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success("Demande de dépôt envoyée ! En attente de validation admin.");
      setIsWalletDepositOpen(false);
      setWalletDepositAmount(''); setWalletDepositTxId('');
      setWalletDepositCaptcha(null); walletDepositCaptchaRef.current?.reset();
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
      walletDepositCaptchaRef.current?.reset(); setWalletDepositCaptcha(null);
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleWalletWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(walletWithdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Montant invalide."); return; }
    if (!effectiveClient) return;
    if (amount > balanceHTG) { toast.error(`Solde insuffisant. Vous avez ${balanceHTG.toLocaleString()} HTG.`); return; }
    if (!walletWithdrawAccount) { toast.error("Numéro de compte requis."); return; }
    if (RECAPTCHA_SITE_KEY && !walletWithdrawCaptcha) { toast.error("Veuillez valider le captcha."); return; }
    setWalletActionLoading(true);
    try {
      await submitClientWithdrawal(effectiveClient, amount, walletWithdrawMethod, walletWithdrawAccount, walletWithdrawCaptcha || undefined);
      toast.success("Demande de retrait soumise ! En attente de validation admin.");
      setIsWalletWithdrawOpen(false);
      setWalletWithdrawAmount(''); setWalletWithdrawAccount('');
      setWalletWithdrawCaptcha(null); walletWithdrawCaptchaRef.current?.reset();
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
      walletWithdrawCaptchaRef.current?.reset(); setWalletWithdrawCaptcha(null);
    } finally {
      setWalletActionLoading(false);
    }
  };

  // Card Recharge States
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [selectedCardForRecharge, setSelectedCardForRecharge] = useState<any>(null);
  const [rechargeAmountUSD, setRechargeAmountUSD] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ name: string, price: string, type: string } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'moncash' | 'natcash' | 'admi' | null>('moncash');
  const [paymentTransactionInfo, setPaymentTransactionInfo] = useState('');

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setSelectedPlan(product.plans && product.plans.length > 0 ? product.plans[0] : null);
    setCustomAmountUSD('');
    setIsProductDetailOpen(true);
  };

  const handleCardClick = (card: any) => {
    setSelectedCardForRecharge(card);
    setRechargeAmountUSD(card.presets && card.presets.length > 0 ? card.presets[0].toString() : '');
    setIsRechargeDialogOpen(true);
  };

  const handleBuyRequested = (item: { name: string, price: string, type: string }) => {
    setPaymentTarget(item);
    setIsPaymentModalOpen(true);
    setSelectedPaymentMethod('moncash');
  };

  const handleFinalPaymentSubmit = () => {
    if (!paymentTarget || !selectedPaymentMethod) return;

    const methodLabel = selectedPaymentMethod === 'moncash' ? 'Mon Cash' : selectedPaymentMethod === 'natcash' ? 'Natcash' : 'Admi';
    const message = `Bonjour Neopay,\n\nJe souhaite commander :\n📦 *${paymentTarget.name}*\n💰 Prix : *${paymentTarget.price}*\n\n💳 Mode de paiement : *${methodLabel}*\n📝 Infos Transaction : *${paymentTransactionInfo || 'Non fournie'}*\n\nMerci de valider ma commande.`;
    
    openWhatsApp(message);
    setIsPaymentModalOpen(false);
    setPaymentTransactionInfo('');
  };

  const handleRechargeSubmit = () => {
    if (!selectedCardForRecharge || !rechargeAmountUSD) return;
    setIsRechargeDialogOpen(false);
    setIsPaymentMethodDialogOpen(true);
  };

  const handleFinalRechargePayment = (method: string) => {
    if (!selectedCardForRecharge || !rechargeAmountUSD) return;
    
    const usd = parseFloat(rechargeAmountUSD);
    const gold = usd * (selectedCardForRecharge.goldRate || 1);
    const gourdes = usd * (settings?.exchangeRate || 146);
    
    const message = `Bonjour Neopay,\n\nJe souhaite recharger ma carte :\n👤 Client : *${customerName || 'Non spécifié'}*\n💳 Carte : *${selectedCardForRecharge.name}*\n💵 Montant USD : *${usd}$*\n💰 Équivalent Gold : *${gold} Gold*\n🇭🇹 Montant en Gourdes : *${gourdes.toLocaleString()} HTG*\n\n💳 Moyen de paiement : *${method}*\n\nMerci de valider ma recharge.`;
    
    openWhatsApp(message);
    setIsPaymentMethodDialogOpen(false);
    setRechargeAmountUSD('');
    setCustomerName('');
    setSelectedCardForRecharge(null);
  };
  
  const servicesRef = useRef<HTMLElement>(null);

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  const imagesToDisplay = sliderImages.length > 0 
    ? sliderImages.map(img => ({ url: img.url, title: img.title || 'Neopay', description: img.description || '' }))
    : SLIDER_IMAGES.map(url => ({ url, title: 'Neopay', description: 'Digital Services & Gift Cards' }));

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-play slider
  useEffect(() => {
    if (imagesToDisplay.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % imagesToDisplay.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, [imagesToDisplay.length]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const resolveRedirection = (btn: any) => {
    const target = btn.targetUrl?.trim();
    const instruction = btn.redirectionInstruction?.toLowerCase() || '';

    // If there's an explicit target, prioritize it
    if (target) {
      if (target.startsWith('#')) {
        const el = document.getElementById(target.substring(1));
        el?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (['tracking', 'shipping', 'affiliate'].includes(target)) {
        onViewChange(target);
        return;
      }
      // Check for common names in instruction if target is not a URL
      if (!target.includes('.') && !target.startsWith('/')) {
        const el = document.getElementById(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.location.href = target;
      return;
    }

    // Try to resolve based on instruction if target is empty
    if (instruction) {
      if (instruction.includes('jeu')) {
        setIsGamesDialogOpen(true);
        return;
      }
      if (instruction.includes('carte') || instruction.includes('recharge')) {
        setIsCardsDialogOpen(true);
        return;
      }
      if (instruction.includes('suivi') || instruction.includes('colis')) {
        onViewChange('tracking');
        return;
      }
      if (instruction.includes('shipping') || instruction.includes('envoi')) {
        onViewChange('shipping');
        return;
      }
      if (instruction.includes('service')) {
        servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  };

  const defaultOnlineSubServices = [
    { id: '_default_tracking', label: 'Suivi de colis', description: "Suivez l'état de vos colis en temps réel.", icon: 'Package', target: 'tracking' as const, order: 1, active: true },
    { id: '_default_shipping', label: 'Expédition', description: "Envoi et réception de colis partout.", icon: 'Truck', target: 'shipping' as const, order: 2, active: true },
  ];
  const effectiveOnlineSubServices = onlineSubServices.length > 0
    ? onlineSubServices.filter(s => s.active)
    : defaultOnlineSubServices;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-12 space-y-8">

      {/* Hero: Wallet (if logged in) or Image Slider */}
      <AnimatePresence mode="wait">
        {loggedClient ? (
          /* ── WALLET HERO ── */
          <motion.section
            key="wallet-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full px-2 md:px-0"
          >
            <div className="relative w-full rounded-[40px] bg-gradient-to-br from-[#1a1f3c] via-[#1e2547] to-[#0f1429] p-6 md:p-8 shadow-[0_45px_70px_-15px_rgba(0,0,0,0.4)] border border-white/5 overflow-hidden">
              {/* Background glows */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
              <div className="absolute inset-0 rounded-[40px] pointer-events-none overflow-hidden">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-[150%] opacity-5"
                  style={{ background: "conic-gradient(from 0deg, transparent 0 340deg, var(--color-primary) 360deg)" }} />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start lg:items-stretch">
                {/* Left: Identity + Balance + Actions */}
                <div className="flex-1 space-y-5">
                  {/* User row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-black text-primary shrink-0">
                        {(effectiveClient?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-black text-base leading-tight">{effectiveClient?.name || loggedClient.name}</p>
                        <button
                          onClick={() => {
                            if (effectiveClient?.walletId) {
                              navigator.clipboard.writeText(effectiveClient.walletId);
                              setCopiedWalletId(true);
                              setTimeout(() => setCopiedWalletId(false), 2000);
                              toast.success("ID copié !");
                            }
                          }}
                          className="flex items-center gap-1.5 mt-0.5 text-white/40 hover:text-white/70 text-xs font-mono transition-colors group"
                        >
                          <span>ID: {effectiveClient?.walletId || '—'}</span>
                          {copiedWalletId ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                      </div>
                    </div>
                    <button onClick={onOpenWallet}
                      className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors">
                      Tout voir <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Balance */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Solde Disponible</p>
                    <p className="text-4xl md:text-5xl font-black text-white leading-none tabular-nums">
                      {balanceHTG.toLocaleString()}
                      <span className="text-xl font-bold text-white/30 ml-2">HTG</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <p className="text-primary font-bold text-base">${balanceUSD} <span className="text-primary/60 font-normal text-xs">USD</span></p>
                      <span className="text-white/20 text-xs ml-1">• taux {exchangeRate} HTG/$</span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-3">
                    <button onClick={() => setIsWalletDepositOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/30">
                      <ArrowDownToLine className="h-4 w-4" /> Déposer
                    </button>
                    <button onClick={() => setIsWalletWithdrawOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm transition-all border border-white/10">
                      <ArrowUpFromLine className="h-4 w-4" /> Retirer
                    </button>
                    <button onClick={onOpenWallet}
                      className="h-12 px-4 rounded-2xl bg-primary/20 hover:bg-primary/30 active:scale-95 text-primary font-bold text-sm transition-all border border-primary/20">
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Right: Recent transactions */}
                <div className="w-full lg:w-72 space-y-2">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Dernières transactions</p>
                  {recentTx.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 rounded-2xl bg-white/5 border border-white/5">
                      <Clock className="h-8 w-8 text-white/20 mb-2" />
                      <p className="text-white/30 text-xs">Aucune transaction</p>
                    </div>
                  ) : (
                    recentTx.map(tx => {
                      const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'refund';
                      return (
                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {isCredit ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" /> : <ArrowUpFromLine className="h-4 w-4 text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-xs font-bold truncate">{typeLabel[tx.type] || tx.type}</p>
                            <p className="text-white/30 text-[10px] truncate">{tx.method || tx.description?.slice(0, 24) || ''}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-black tabular-nums ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isCredit ? '+' : '-'}{tx.amount.toLocaleString()}
                            </p>
                            <p className="text-white/25 text-[10px]">
                              {tx.status === 'pending' ? '⏳' : tx.status === 'approved' || tx.status === 'completed' ? '✅' : '❌'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        ) : (
          /* ── SLIDER ── */
          <motion.section
            key="slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full overflow-visible group px-2 md:px-0"
          >
            <div className="absolute -inset-4 bg-primary/20 rounded-[50px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative h-[240px] md:h-[360px] w-full rounded-[40px] overflow-hidden bg-black shadow-[0_45px_70px_-15px_rgba(0,0,0,0.4)] border border-white/5">
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[40px]">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-[150%] opacity-20 group-hover:opacity-40 transition-opacity duration-1000"
                  style={{ background: "conic-gradient(from 0deg, transparent 0 340deg, var(--color-primary) 360deg)", backgroundSize: "cover" }} />
              </div>
              <div className="absolute inset-0 w-full h-full z-0">
                <AnimatePresence mode="wait">
                  <motion.div key={currentSlide} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 w-full h-full will-change-transform overflow-hidden">
                    <motion.div initial={{ scale: 1.2, x: -20, y: -20 }} animate={{ scale: 1, x: 0, y: 0 }}
                      transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${imagesToDisplay[currentSlide]?.url || ''})` }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/40 to-transparent opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="absolute bottom-8 right-8 z-30 flex gap-3 bg-black/20 backdrop-blur-md p-2 px-3 rounded-full border border-white/10">
                {imagesToDisplay.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)} className="relative h-2 flex items-center justify-center transition-all duration-500">
                    <div className={`h-full rounded-full transition-all duration-500 ${currentSlide === i ? 'bg-primary w-10' : 'bg-white/30 w-2 hover:bg-white/50'}`} />
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Quick Navigation Category Bar */}
      {!buttonsLoading && buttons.length > 0 ? (
        <div className="w-full overflow-hidden pt-2">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 px-1 custom-scrollbar scroll-smooth">
            {buttons.map((btn) => (
              <Button
                key={btn.id}
                variant="ghost"
                className="flex-shrink-0 bg-white border border-gray-100 rounded-[16px] px-6 h-[54px] shadow-sm hover:bg-accent-light/50 hover:-translate-y-0.5 transition-all group"
                onClick={() => resolveRedirection(btn)}
              >
                <div className="flex items-center gap-2">
                  <LucideIcon 
                    name={btn.iconName} 
                    className="h-5 w-5 transition-colors group-hover:text-primary" 
                    color={btn.color || '#2563EB'} 
                  />
                  <span 
                    className="font-heading font-bold text-sm md:text-base transition-colors group-hover:text-primary"
                    style={{ color: btn.color || '#2563EB' }}
                  >
                    {btn.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ) : buttonsLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[54px] w-32 bg-gray-100 animate-pulse rounded-[16px] flex-shrink-0" />
          ))}
        </div>
      ) : null}

      {/* Services Section */}
      <section ref={servicesRef} id="services" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark">Nos Services</h2>
          <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1 — Recharge carte */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="bg-emerald-50 border-2 border-emerald-100 hover:shadow-lg transition-all group h-full flex flex-col">
              <CardHeader>
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Recharge carte</CardTitle>
                <CardDescription className="text-gray-600">
                  Rechargez vos cartes de crédit ou prépayées rapidement.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  onClick={() => setIsCardsDialogOpen(true)}
                  className="w-full bg-white text-gray-900 border-2 border-transparent hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
                >
                  Voir les cartes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2 — Services en ligne (expandable) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-accent-light border-2 border-accent-light/50 hover:shadow-lg transition-all h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Services en ligne</CardTitle>
                <CardDescription className="text-gray-600">
                  Expédition, suivi de colis et plus — accédez à tous nos services numériques.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <Button
                  onClick={() => setShowOnlineServices(v => !v)}
                  className="w-full bg-white text-gray-900 border-2 border-transparent hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
                >
                  {showOnlineServices ? 'Masquer les services' : 'Voir les services'}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${showOnlineServices ? 'rotate-180' : ''}`} />
                </Button>

                <AnimatePresence>
                  {showOnlineServices && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-2">
                        {effectiveOnlineSubServices.map((sub) => {
                          const IconComp = (LucideIcons as any)[sub.icon] || Package;
                          const handleSubClick = () => {
                            if (sub.target === 'tracking') { onTrackingClick(); setShowOnlineServices(false); }
                            else if (sub.target === 'shipping') { onViewChange('shipping'); setShowOnlineServices(false); }
                            else if (sub.target === 'url' && sub.url) { window.open(sub.url, '_blank'); }
                          };
                          return (
                            <button
                              key={sub.id}
                              onClick={handleSubClick}
                              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/80 hover:bg-white border border-white/50 hover:border-primary/20 hover:shadow-sm transition-all text-left group/sub"
                            >
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover/sub:bg-primary/20 transition-colors">
                                <IconComp className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-dark">{sub.label}</p>
                                {sub.description && <p className="text-xs text-gray-500 truncate">{sub.description}</p>}
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 group-hover/sub:text-primary transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Products Section */}
      <section id="products" className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark">Nos Produits / Services</h2>
          <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
        </div>
        
        {productsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="mobile-product-card-wrapper cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <Card className="product-card overflow-hidden border-0 bg-white h-full flex flex-col pt-0 hover:shadow-xl transition-shadow">
                  <div className="aspect-[16/10] relative overflow-hidden bg-gray-50">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="product-image w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/neopay/400/400';
                      }}
                    />
                  </div>
                  <div className="product-card-content">
                    <div className="mb-2">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-subtitle truncate">Livraison rapide / Neopay</p>
                    </div>
                    
                    <div className="product-footer flex items-center justify-between">
                      <span className="product-price">{product.price}</span>
                      <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        Détails
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun produit ou service supplémentaire disponible pour le moment.</p>
          </div>
        )}
      </section>

      {/* Payment Proof Section */}
      <section id="payment" className="bg-primary rounded-[2rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#1D4ED8] rounded-full opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-[#1D4ED8] rounded-full opacity-50 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold">Paiement et preuve</h2>
            <p className="text-accent-light text-lg max-w-xl">
              Après avoir effectué votre paiement, veuillez envoyer une capture d'écran via WhatsApp pour validation.
            </p>
          </div>
          <Button 
            onClick={() => openWhatsApp("Bonjour, j'ai effectué mon paiement pour un service Neopay. Voici la preuve.")}
            className="bg-white text-primary hover:bg-accent-light px-8 h-14 text-lg font-bold rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition-all"
          >
            <CheckCircle2 className="h-6 w-6" />
            J'ai effectué mon paiement
          </Button>
        </div>
      </section>

      {/* Games Dialog */}
      <Dialog open={isGamesDialogOpen} onOpenChange={setIsGamesDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto relative">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-purple-600" />
                Top-up Jeux
              </DialogTitle>
              <DialogClose className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors">
                <LucideIcons.X className="h-5 w-5 text-gray-500" />
              </DialogClose>
            </div>
            <DialogDescription>
              Choisissez votre jeu préféré pour effectuer une recharge.
            </DialogDescription>
          </DialogHeader>
          
          {gamesLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
            </div>
          ) : games.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {games.map((game) => (
                <Card key={game.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow pt-0">
                  <div className="aspect-[16/10] relative bg-gray-50">
                    <img 
                      src={game.image} 
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/game/400/400';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-600">{game.priceRange}</Badge>
                    </div>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">{game.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {game.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Catalog Section */}
                    {game.catalog && game.catalog.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catalogue de prix</p>
                        <div className="grid grid-cols-1 gap-2 md:max-h-[160px] md:overflow-y-auto pr-1 custom-scrollbar">
                          {game.catalog.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-purple-200 transition-colors group">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-purple-600 font-bold">{item.price}</p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleBuyRequested({ name: `${game.name} - ${item.name}`, price: item.price, type: 'game' })}
                                className="h-8 px-4 text-[10px] font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-md rounded-full transition-all active:scale-95 border-0"
                              >
                                Commander
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => openWhatsApp(game.whatsappMessage || `Bonjour, je souhaite faire un top-up pour le jeu : ${game.name}.`)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm h-9"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Commander
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Aucun jeu disponible pour le moment.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Cards Dialog */}
      <Dialog open={isCardsDialogOpen} onOpenChange={setIsCardsDialogOpen}>
        <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
          <DialogHeader className="p-8 pb-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-3xl font-black flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-emerald-600" />
                </div>
                Recharge Cartes
              </DialogTitle>
              <DialogClose className="rounded-full bg-black/5 p-2 hover:bg-black/10 transition-all group active:scale-90">
                <LucideIcons.X className="h-5 w-5 text-gray-500 group-hover:text-gray-900" />
              </DialogClose>
            </div>
            <DialogDescription className="text-xs font-bold uppercase tracking-widening text-emerald-600/60 pl-1">
              Choisissez une carte pour recharger votre compte instantanément.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8">
            {cardsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          ) : cards.length > 0 ? (
            <div className="product-grid grid grid-cols-2 sm:grid-cols-2 gap-2 py-4">
              {cards.map((card) => (
                <Card key={card.id} className="product-card overflow-hidden border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full pt-0">
                  <div className="aspect-[16/10] relative bg-gray-50">
                    <img 
                      src={card.image} 
                      alt={card.name}
                      className="product-image w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/card/400/400';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-600 text-[10px] h-5 px-1.5">{card.price}</Badge>
                    </div>
                  </div>
                  <div className="product-card-content p-2 flex-grow flex flex-col">
                    <div className="mb-1">
                      <h3 className="product-name line-clamp-1">{card.name}</h3>
                      <p className="product-subtitle truncate">Activation instantanée</p>
                    </div>
                    
                    <div className="product-footer mt-auto pt-2">
                      <Button 
                        size="sm"
                        onClick={() => handleCardClick(card)}
                        className="product-buy-button w-full justify-center text-[10px] py-1 h-7"
                      >
                        ⚡ Recharger
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Aucune carte disponible pour le moment.</p>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Product Detail Dialog */}
      <Dialog open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
        <DialogContent className="sm:max-w-3xl border-0 shadow-2xl relative" showCloseButton={false}>
          <DialogClose className="absolute top-6 left-6 z-20 rounded-full bg-black/30 backdrop-blur-xl p-3 hover:bg-black/50 transition-all text-white group active:scale-90 border border-white/10 shadow-lg">
            <LucideIcons.X className="h-6 w-6" />
          </DialogClose>
          {selectedProduct && (
            <div className="flex flex-col">
              <div className="relative aspect-video">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-white text-lg font-black px-4 py-1 rounded-full shadow-lg">
                    {selectedPlan ? selectedPlan.price : selectedProduct.price}
                  </Badge>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-dark leading-tight">{selectedProduct.name}</h2>
                  <p className="text-gray-400 font-medium">Service Premium • Neopay Digital</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent-light/30 border border-primary/10">
                    < LucideIcons.Info className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-dark font-medium leading-relaxed">
                      {selectedProduct.description || "Profitez de ce service exceptionnel avec Neopay. Qualité garantie et livraison ultra-rapide."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-2">
                      <LucideIcons.Clock className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Livraison <br/>24/7</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-2">
                       <LucideIcons.ShieldCheck className="h-4 w-4 text-primary" />
                       <span className="text-[10px] font-bold text-gray-500 uppercase">Paiement <br/>Sécurisé</span>
                    </div>
                  </div>

                  {selectedProduct.plans && selectedProduct.plans.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Choissisez votre plan</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.plans.map((plan: any) => (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                              selectedPlan?.id === plan.id 
                                ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPlan?.id === plan.id ? 'border-primary' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                {selectedPlan?.id === plan.id && (
                                  <motion.div 
                                    layoutId="plan-indicator"
                                    className="h-2.5 w-2.5 rounded-full bg-primary" 
                                  />
                                )}
                              </div>
                              <span className={`font-bold transition-colors ${selectedPlan?.id === plan.id ? 'text-primary' : 'text-dark'}`}>{plan.name}</span>
                            </div>
                            <span className={`font-black tracking-tight transition-colors ${selectedPlan?.id === plan.id ? 'text-primary' : 'text-gray-400'}`}>{plan.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.allowCustomAmount && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant personnalisé</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">$</span>
                        <Input
                          type="number"
                          value={customAmountUSD}
                          onChange={e => setCustomAmountUSD(e.target.value)}
                          placeholder="0.00"
                          className="h-14 rounded-2xl text-lg font-black pl-10 border-2 focus:border-primary"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      {customAmountUSD && !isNaN(parseFloat(customAmountUSD)) && parseFloat(customAmountUSD) > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <DollarSign className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm font-black text-primary">
                            = {Math.round(parseFloat(customAmountUSD) * (selectedProduct.customExchangeRate || exchangeRate)).toLocaleString()} HTG
                            <span className="text-xs font-normal text-gray-400 ml-2">
                              (taux: {selectedProduct.customExchangeRate || exchangeRate} HTG/$)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(() => {
                  const effectiveRate = selectedProduct.customExchangeRate || exchangeRate;
                  const customHTG = selectedProduct.allowCustomAmount && customAmountUSD && !isNaN(parseFloat(customAmountUSD))
                    ? Math.round(parseFloat(customAmountUSD) * effectiveRate)
                    : null;
                  const displayPrice = customHTG !== null
                    ? `${customHTG} HTG`
                    : (selectedPlan ? selectedPlan.price : selectedProduct.price);
                  const displayName = selectedPlan
                    ? `${selectedProduct.name} (${selectedPlan.name})`
                    : selectedProduct.name;
                  const customLabel = customHTG !== null
                    ? `$${customAmountUSD} USD = ${customHTG.toLocaleString()} HTG`
                    : null;
                  return (
                    <>
                      <Button 
                        onClick={() => handleBuyRequested({ 
                          name: customLabel ? `${displayName} — ${customLabel}` : displayName, 
                          price: displayPrice, 
                          type: 'product' 
                        })}
                        className="w-full h-14 rounded-2xl bg-primary hover:bg-[#1D4ED8] text-white font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                      >
                        <LucideIcons.ArrowRight className="h-6 w-6" />
                        Continuer via WhatsApp
                      </Button>

                      {loggedClient && (
                        <WalletPayButton
                          client={effectiveClient || loggedClient}
                          price={displayPrice}
                          productName={customLabel ? `${displayName} — ${customLabel}` : displayName}
                          hasPendingPurchase={hasPendingPurchase}
                          purchaseLoading={purchaseLoading}
                          setPurchaseLoading={setPurchaseLoading}
                          onSuccess={() => setIsProductDetailOpen(false)}
                        />
                      )}
                    </>
                  );
                })()}
                
                <p className="text-center text-[10px] text-gray-400 font-medium italic">
                  *Un agent vous répondra instantanément sur WhatsApp
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── WALLET DEPOSIT MODAL ── */}
      <Dialog open={isWalletDepositOpen} onOpenChange={(v) => { setIsWalletDepositOpen(v); if (!v) { setWalletDepositAmount(''); setWalletDepositTxId(''); } }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">Faire un dépôt</DialogTitle>
                <DialogDescription className="text-emerald-100/70 text-xs">Rechargez votre wallet Neopay</DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={handleWalletDeposit} className="p-5 space-y-4 bg-white">
            {/* Method selector */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Méthode de paiement</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'MonCash', icon: '💰', color: 'border-rose-300 bg-rose-50 text-rose-700', sel: 'ring-rose-400' },
                  { id: 'NatCash', icon: '💳', color: 'border-amber-300 bg-amber-50 text-amber-700', sel: 'ring-amber-400' },
                  { id: 'Admi', icon: '🏦', color: 'border-indigo-300 bg-indigo-50 text-indigo-700', sel: 'ring-indigo-400' },
                ].map(m => (
                  <button key={m.id} type="button" onClick={() => setWalletDepositMethod(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center ${walletDepositMethod === m.id ? `${m.color} ring-2 ${m.sel} shadow-sm` : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] font-black">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method info: number + QR */}
            {depositMethodInfo[walletDepositMethod]?.number && (
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <Smartphone className="h-4 w-4 text-subtext shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-subtext uppercase tracking-wider">Envoyez au numéro</p>
                  <p className="font-black text-dark text-base font-mono">{depositMethodInfo[walletDepositMethod].number}</p>
                </div>
                {depositMethodInfo[walletDepositMethod]?.qr && (
                  <img src={depositMethodInfo[walletDepositMethod].qr} alt="QR" className="h-14 w-14 rounded-xl object-cover border border-gray-200" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Montant (HTG)</Label>
              <Input type="number" value={walletDepositAmount} onChange={e => setWalletDepositAmount(e.target.value)}
                placeholder="Ex: 1 500" className="h-12 rounded-xl text-lg font-black" min="1" required />
              {walletDepositAmount && !isNaN(parseFloat(walletDepositAmount)) && (
                <p className="text-[11px] text-primary font-bold">≈ ${(parseFloat(walletDepositAmount) / exchangeRate).toFixed(2)} USD</p>
              )}
            </div>

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">ID / Référence de transaction</Label>
              <Input value={walletDepositTxId} onChange={e => setWalletDepositTxId(e.target.value)}
                placeholder="Ex: TX-1234567890" className="h-11 rounded-xl font-mono" />
              <p className="text-[10px] text-gray-400">Copiez l'ID de confirmation reçu lors du paiement.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              <strong>Étape suivante :</strong> Après soumission, vous serez redirigé sur WhatsApp pour envoyer votre preuve de paiement.
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center gap-1">
                <CaptchaWidget
                  sitekey={RECAPTCHA_SITE_KEY}
                  captchaRef={walletDepositCaptchaRef}
                  onChange={(token) => setWalletDepositCaptcha(token)}
                  onExpired={() => setWalletDepositCaptcha(null)}
                />
              </div>
            )}

            <Button type="submit" disabled={walletActionLoading || (!!RECAPTCHA_SITE_KEY && !walletDepositCaptcha)}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
              {walletActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmer et envoyer preuve →'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── WALLET WITHDRAW MODAL ── */}
      <Dialog open={isWalletWithdrawOpen} onOpenChange={(v) => { setIsWalletWithdrawOpen(v); if (!v) { setWalletWithdrawAmount(''); setWalletWithdrawAccount(''); setWalletWithdrawCaptcha(null); walletWithdrawCaptchaRef.current?.reset(); } }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">Retirer des fonds</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">Solde: <strong className="text-white">{balanceHTG.toLocaleString()} HTG</strong> · <strong className="text-primary">${balanceUSD}</strong></DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={handleWalletWithdraw} className="p-5 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Méthode de retrait</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'MonCash', icon: '💰', color: 'border-rose-300 bg-rose-50 text-rose-700', sel: 'ring-rose-400' },
                  { id: 'NatCash', icon: '💳', color: 'border-amber-300 bg-amber-50 text-amber-700', sel: 'ring-amber-400' },
                  { id: 'Admi', icon: '🏦', color: 'border-indigo-300 bg-indigo-50 text-indigo-700', sel: 'ring-indigo-400' },
                ].map(m => (
                  <button key={m.id} type="button" onClick={() => setWalletWithdrawMethod(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center ${walletWithdrawMethod === m.id ? `${m.color} ring-2 ${m.sel} shadow-sm` : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] font-black">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Montant (HTG)</Label>
              <Input type="number" value={walletWithdrawAmount} onChange={e => setWalletWithdrawAmount(e.target.value)}
                placeholder="Ex: 500" className="h-12 rounded-xl text-lg font-black" min="1" max={balanceHTG} required />
              {walletWithdrawAmount && !isNaN(parseFloat(walletWithdrawAmount)) && (
                <p className="text-[11px] text-primary font-bold">≈ ${(parseFloat(walletWithdrawAmount) / exchangeRate).toFixed(2)} USD</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Numéro de réception</Label>
              <Input value={walletWithdrawAccount} onChange={e => setWalletWithdrawAccount(e.target.value)}
                placeholder="Votre numéro {walletWithdrawMethod}" className="h-11 rounded-xl" required />
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center gap-1">
                <CaptchaWidget
                  sitekey={RECAPTCHA_SITE_KEY}
                  captchaRef={walletWithdrawCaptchaRef}
                  onChange={(token) => setWalletWithdrawCaptcha(token)}
                  onExpired={() => setWalletWithdrawCaptcha(null)}
                />
              </div>
            )}

            <Button type="submit" disabled={walletActionLoading || (!!RECAPTCHA_SITE_KEY && !walletWithdrawCaptcha)}
              className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black">
              {walletActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0 }}
        className="fixed bottom-6 right-20 z-50 pointer-events-none"
      >
        <Button 
          onClick={scrollToTop}
          className="pointer-events-auto h-12 w-12 rounded-full bg-primary hover:bg-[#1D4ED8] text-white shadow-xl flex items-center justify-center p-0"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Floating Chat Button */}
      <div className="floating-chat-button-container">
        <Button
          onClick={() => openWhatsApp("Bonjour Neopay, je souhaite avoir plus de renseignements.")}
          className="floating-chat-button"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <div className="bg-primary p-8 text-white sticky top-0 z-10 rounded-t-[2.5rem]">
            <DialogHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                     <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Finaliser Paiement</DialogTitle>
                    <DialogDescription className="text-white/70 text-xs font-bold uppercase tracking-widest">Paiement Sécurisé Neopay</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>

            {paymentTarget && (
              <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Commande</p>
                <p className="text-lg font-bold truncate">{paymentTarget.name}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-white/60">Total à payer</span>
                  <span className="text-2xl font-black text-white">{paymentTarget.price}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Choisir le mode de paiement</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'moncash', label: 'Mon Cash', icon: Smartphone, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { id: 'natcash', label: 'Natcash', icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { id: 'admi', label: 'Admi', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      selectedPaymentMethod === method.id 
                        ? `${method.border} ${method.bg} shadow-md scale-105` 
                        : 'border-gray-50 bg-gray-50/50 grayscale hover:grayscale-0 hover:border-gray-100'
                    }`}
                  >
                    <method.icon className={`h-6 w-6 ${method.color} mb-1`} />
                    <span className="text-[10px] font-black uppercase text-dark">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedPaymentMethod && (
                <motion.div
                  key={selectedPaymentMethod}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 rounded-[2rem] bg-gray-50 border border-gray-100 space-y-4 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Infos de Paiement</p>
                    <Badge variant="outline" className="text-[10px] font-black bg-white">{selectedPaymentMethod.toUpperCase()}</Badge>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="space-y-1">
                      <p className="text-gray-400 text-[10px] font-bold uppercase">Numéro de réception</p>
                      <p className="text-2xl font-black text-dark tracking-tighter">
                        {selectedPaymentMethod === 'moncash' ? (settings?.moncashNumber || 'Précisé sur WhatsApp') : 
                         selectedPaymentMethod === 'natcash' ? (settings?.natcashNumber || 'Précisé sur WhatsApp') : 
                         (settings?.admiNumber || 'Précisé sur WhatsApp')}
                      </p>
                    </div>

                    {(settings?.[`${selectedPaymentMethod}QR` as keyof typeof settings]) && (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-hover:bg-primary/10 transition-colors" />
                        <Card className="relative p-2 rounded-2xl border-2 border-white shadow-xl bg-white">
                          <img 
                            src={settings[`${selectedPaymentMethod}QR` as keyof typeof settings] as string} 
                            alt="QR Code" 
                            className="h-24 w-24 object-contain"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1 rounded-lg">
                            <QrCode className="h-4 w-4" />
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails de votre transaction</Label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input 
                  placeholder="ID Transaction, Nom ou Numéro de l'expéditeur" 
                  value={paymentTransactionInfo}
                  onChange={(e) => setPaymentTransactionInfo(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-gray-100 focus:ring-primary/20 bg-gray-50/50 font-bold"
                />
              </div>
              <p className="text-[9px] text-gray-400 italic px-2 text-center">
                Veuillez saisir les informations permettant d'identifier votre transfert pour une validation immédiate.
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 sm:flex-col gap-3">
            <Button 
               onClick={handleFinalPaymentSubmit}
               disabled={!paymentTransactionInfo.trim()}
               className="w-full h-14 rounded-2xl bg-primary hover:bg-[#1D4ED8] text-white font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
            >
               Envoyer et Payer
               <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              En cliquant, vous serez redirigé vers WhatsApp pour finaliser
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Recharge - Step 1: Details */}
      <Dialog open={isRechargeDialogOpen} onOpenChange={setIsRechargeDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-0 bg-white shadow-2xl relative flex flex-col overflow-hidden" showCloseButton={false}>
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <CreditCard className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">Recharge de Carte</DialogTitle>
                    <DialogDescription className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-1">Étape 1: Configuration</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors z-50">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>

            {selectedCardForRecharge && (
              <div className="mt-4 p-5 rounded-[1.5rem] bg-black/20 border border-white/10 backdrop-blur-sm flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={selectedCardForRecharge.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Carte sélectionnée</p>
                  <p className="text-lg font-bold leading-tight">{selectedCardForRecharge.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 overscroll-contain">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identifiant ou Nom complet</Label>
              <div className="relative">
                <LucideIcons.User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <Input 
                  placeholder="Votre nom ou ID Wallet"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-gray-100 focus:ring-emerald-500/20 bg-gray-50/50 font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Définir le montant (USD)</Label>
              
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600">$</div>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={rechargeAmountUSD}
                  onChange={(e) => setRechargeAmountUSD(e.target.value)}
                  className="pl-12 h-16 text-2xl font-black rounded-2xl border-gray-100 focus:ring-emerald-500/20 bg-gray-50/50"
                />
              </div>

              {selectedCardForRecharge?.presets && selectedCardForRecharge.presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCardForRecharge.presets.map((val: number) => (
                    <button
                      key={val}
                      onClick={() => setRechargeAmountUSD(val.toString())}
                      className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
                        rechargeAmountUSD === val.toString()
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105'
                          : 'bg-gray-100 text-dark hover:bg-gray-200'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center space-y-1">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valeur en Gold</p>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-600 fill-emerald-600" />
                <span className="text-3xl font-black text-emerald-950">
                  {rechargeAmountUSD ? (parseFloat(rechargeAmountUSD) * (selectedCardForRecharge?.goldRate || 1)).toLocaleString() : '0'} Gold
                </span>
              </div>
              <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-tighter">
                Taux: 1$ = {selectedCardForRecharge?.goldRate || 1} Gold
              </p>
            </div>
          </div>
          
          <div className="p-8 pt-4 shrink-0 bg-white border-t border-gray-100">
            <Button
              onClick={handleRechargeSubmit}
              disabled={!rechargeAmountUSD || parseFloat(rechargeAmountUSD) <= 0 || !customerName.trim()}
              className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              Suivant
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Recharge - Step 2: Payment Method */}
      <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-0 bg-white shadow-2xl relative flex flex-col overflow-hidden" showCloseButton={false}>
          <div className="bg-emerald-800 p-8 text-white shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">Moyen de Paiement</DialogTitle>
                    <DialogDescription className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-1">Étape 2: Choisir votre mode</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors z-50">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>
            
            <div className="mt-4 p-6 rounded-[1.5rem] bg-white/10 border border-white/5 backdrop-blur-xl">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Montant total</span>
                 <span className="text-3xl font-black text-white">${rechargeAmountUSD} USD</span>
               </div>
               <div className="flex justify-between items-center text-emerald-100/60">
                 <span className="text-[10px] font-black uppercase tracking-tighter">Estimation Gourdes</span>
                 <span className="text-md font-black">≈ {(parseFloat(rechargeAmountUSD || '0') * (settings?.exchangeRate || 146)).toLocaleString()} HTG</span>
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 overscroll-contain">
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'MonCash', icon: Smartphone, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', desc: 'Paiement mobile instantané' },
                { id: 'NatCash', icon: Smartphone, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'Sécurisé et rapide' },
                { id: 'Admi', icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', desc: 'Virement ou dépôt bancaire' }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => handleFinalRechargePayment(method.id)}
                  className={`group flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${method.bg} ${method.border} hover:shadow-lg`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${method.color}`}>
                      <method.icon className="h-7 w-7" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xl font-black text-dark uppercase tracking-tight">{method.id}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{method.desc}</span>
                    </div>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${method.color} group-hover:bg-white`}>
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </button>
              ))}

              {/* Wallet pay option */}
              {effectiveClient && (() => {
                const usd = parseFloat(rechargeAmountUSD || '0');
                const costHTG = usd * (settings?.exchangeRate || 146);
                const bal = effectiveClient.balance ?? 0;
                const canPay = bal >= costHTG && costHTG > 0;
                return (
                  <button
                    onClick={() => {
                      if (!canPay) { toast.error(`Solde insuffisant. Vous avez ${bal.toLocaleString()} HTG.`); return; }
                      handleFinalRechargePayment('Solde Wallet');
                    }}
                    className={`group flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${canPay ? 'bg-emerald-50 border-emerald-100 hover:shadow-lg' : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform ${canPay ? 'group-hover:scale-110 text-emerald-600' : 'text-gray-400'}`}>
                        <Wallet className="h-7 w-7" />
                      </div>
                      <div className="text-left">
                        <span className="block text-xl font-black text-dark uppercase tracking-tight">Mon Compte</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                          Solde: {bal.toLocaleString()} HTG {canPay ? `· Suffisant ✓` : `· Insuffisant`}
                        </span>
                      </div>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${canPay ? 'text-emerald-600 group-hover:bg-white' : 'text-gray-300'}`}>
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  </button>
                );
              })()}
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-2xl mt-4">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-loose">
                ✅ Une fois le paiement sélectionné, <br/>vous serez redirigé vers notre service client WhatsApp.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
