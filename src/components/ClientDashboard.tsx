import React, { useState, useRef, useMemo } from 'react';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, History,
  LogOut, Loader2, X, Copy, CheckCircle2, AlertCircle,
  Clock, XCircle, Shield, Trash2,
  TrendingUp, Globe, Smartphone, CreditCard as CardIcon,
  Building2, Bitcoin, Info, ChevronDown,
  Eye, EyeOff, Send, User, QrCode, Search, MapPin,
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { CaptchaWidget } from './CaptchaWidget';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useClientData, useClientTransactions,
  submitClientDeposit, submitClientWithdrawal, submitClientTransfer,
} from '../services/clientService';
import { useSettings } from '../services/parcelService';
import { Client, PaymentMethod, DEFAULT_PAYMENT_METHODS } from '../types';

interface ClientDashboardProps {
  clientId: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = '+50944813185';
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';

const statusConfig = {
  pending:   { label: 'En attente', color: 'bg-amber-100 text-amber-700 border border-amber-200',     icon: <Clock className="h-3 w-3" /> },
  approved:  { label: 'Approuvé',   color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:  { label: 'Refusé',     color: 'bg-red-100 text-red-600 border border-red-200',           icon: <XCircle className="h-3 w-3" /> },
  completed: { label: 'Complété',   color: 'bg-blue-100 text-blue-700 border border-blue-200',        icon: <CheckCircle2 className="h-3 w-3" /> },
};

const typeLabel: Record<string, string> = {
  deposit:           'Dépôt',
  withdrawal:        'Retrait',
  purchase:          'Achat',
  transfer_received: 'Reçu',
  refund:            'Remboursement',
};

function getMethodIcon(type: string) {
  switch (type) {
    case 'mobile_money':  return <Smartphone className="h-4 w-4" />;
    case 'crypto':        return <Bitcoin className="h-4 w-4" />;
    case 'bank_transfer': return <Building2 className="h-4 w-4" />;
    case 'payment_app':   return <Globe className="h-4 w-4" />;
    case 'card':          return <CardIcon className="h-4 w-4" />;
    default:              return <Wallet className="h-4 w-4" />;
  }
}

const methodColors: Record<string, string> = {
  mobile_money:  'text-rose-500 bg-rose-50',
  crypto:        'text-amber-500 bg-amber-50',
  bank_transfer: 'text-blue-500 bg-blue-50',
  payment_app:   'text-violet-500 bg-violet-50',
  card:          'text-emerald-500 bg-emerald-50',
};

// ─── Virtual Card ─────────────────────────────────────────────────────────────

function VirtualCard({
  client, balance, rate, copied, onCopy, hidden, onToggleHide,
}: {
  client: Client; balance: number; rate: number;
  copied: boolean; onCopy: () => void;
  hidden: boolean; onToggleHide: () => void;
}) {
  return (
    <div
      className="relative w-full rounded-[1.75rem] overflow-hidden select-none shadow-2xl shadow-violet-900/40"
      style={{
        aspectRatio: '1.75 / 1',
        background: 'linear-gradient(135deg, #3B0F8C 0%, #5B1FD4 30%, #7C3AED 60%, #6027C0 100%)',
      }}
    >
      {/* Radial glow top-left */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(160,130,255,0.25) 0%, transparent 60%)' }} />
      {/* Grid overlay */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      {/* Large decorative arcs */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/[0.06]" />
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/[0.08]" />
      <div className="absolute -right-2 bottom-0 w-28 h-28 rounded-full border border-white/[0.05]" />
      {/* Bottom-right glow */}
      <div className="absolute bottom-0 right-0 w-32 h-20 rounded-tl-full"
        style={{ background: 'radial-gradient(ellipse at 80% 90%, rgba(120,80,255,0.3) 0%, transparent 70%)' }} />

      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Rena Wallet</p>
            <p className="text-white font-black text-base leading-tight tracking-wide">{client.name}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={onToggleHide} className="text-white/35 hover:text-white/65 transition-colors">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {/* Chip */}
            <div className="h-7 w-10 rounded-lg overflow-hidden shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)' }}>
              <div className="w-full h-full grid grid-cols-2 gap-[1.5px] p-[3px]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-[2px]"
                    style={{ background: 'rgba(120,60,0,0.35)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.3em] mb-1.5">Solde disponible</p>
          {hidden ? (
            <p className="text-white font-black text-4xl tracking-widest leading-none">••••••</p>
          ) : (
            <p className="text-white font-black leading-none" style={{ fontSize: '2rem' }}>
              ${balance.toFixed(2)}
              <span className="text-white/50 text-base font-bold ml-2">USD</span>
            </p>
          )}
          {!hidden && (
            <p className="text-white/35 text-[10px] font-semibold mt-1">
              ≈ {Math.round(balance * rate).toLocaleString()} HTG
            </p>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <button onClick={onCopy} className="flex items-center gap-2 group">
            <span className="text-white/30 text-[10px] font-mono tracking-[0.2em] group-hover:text-white/55 transition-colors">
              {client.walletId?.match(/.{1,4}/g)?.join(' ') || client.walletId}
            </span>
            {copied
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              : <Copy className="h-3.5 w-3.5 text-white/25 group-hover:text-white/60 transition-colors" />}
          </button>
          {/* Mastercard circles */}
          <div className="flex -space-x-3">
            <div className="h-9 w-9 rounded-full shadow-lg" style={{ background: 'rgba(220,38,38,0.85)' }} />
            <div className="h-9 w-9 rounded-full shadow-lg" style={{ background: 'rgba(251,191,36,0.9)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ClientDashboard({ clientId, onLogout, open, onClose }: ClientDashboardProps) {
  const { client, loading } = useClientData(clientId);
  const { transactions, loading: txLoading } = useClientTransactions(clientId);
  const { settings } = useSettings();

  const rate    = settings?.exchangeRate || 135;
  const balance = client?.balance || 0;

  const paymentMethods: PaymentMethod[] = useMemo(() => {
    if (settings?.paymentMethods && settings.paymentMethods.length > 0) return settings.paymentMethods;
    return DEFAULT_PAYMENT_METHODS;
  }, [settings?.paymentMethods]);

  const depositMethods    = paymentMethods.filter(m => m.enabled && m.forDeposit);
  const withdrawalMethods = paymentMethods.filter(m => m.enabled && m.forWithdrawal);

  const [copied,            setCopied]           = useState(false);
  const [balanceHidden,     setBalanceHidden]     = useState(false);
  const [historyOpen,       setHistoryOpen]       = useState(false);
  const [isDepositOpen,     setIsDepositOpen]     = useState(false);
  const [isWithdrawOpen,    setIsWithdrawOpen]    = useState(false);
  const [isTransferOpen,    setIsTransferOpen]    = useState(false);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Deposit state
  const [depositMethod,       setDepositMethod]       = useState<PaymentMethod | null>(null);
  const [htgAmount,           setHtgAmount]           = useState('');
  const [depositTxId,         setDepositTxId]         = useState('');
  const [depositMessage,      setDepositMessage]      = useState('');
  const [depositCaptchaToken, setDepositCaptchaToken] = useState<string | null>(null);
  const depositCaptchaRef = useRef<ReCAPTCHA>(null);

  // Withdrawal state
  const [withdrawMethod,       setWithdrawMethod]       = useState<PaymentMethod | null>(null);
  const [withdrawUSD,          setWithdrawUSD]          = useState('');
  const [withdrawAccount,      setWithdrawAccount]      = useState('');
  const [withdrawAccountName,  setWithdrawAccountName]  = useState('');
  const [withdrawMessage,      setWithdrawMessage]      = useState('');
  const [withdrawCaptchaToken, setWithdrawCaptchaToken] = useState<string | null>(null);
  const withdrawCaptchaRef = useRef<ReCAPTCHA>(null);

  // Transfer state
  const [transferWalletId,  setTransferWalletId]  = useState('');
  const [transferUSD,       setTransferUSD]       = useState('');
  const [transferMessage,   setTransferMessage]   = useState('');
  const [transferPreview,   setTransferPreview]   = useState<string | null>(null);
  const [lookupLoading,     setLookupLoading]     = useState(false);

  // Agent withdrawal state
  const [isAgentWithdrawOpen,  setIsAgentWithdrawOpen]  = useState(false);
  const [agentCodeInput,       setAgentCodeInput]       = useState('');
  const [agentSearchLoading,   setAgentSearchLoading]   = useState(false);
  const [agentInfo,            setAgentInfo]            = useState<{ name: string; agentCode: string | null; affiliateCode: string | null; affiliateId: string | null; status: string; available: boolean } | null>(null);
  const [agentWithdrawAmount,  setAgentWithdrawAmount]  = useState('');
  const [agentWithdrawMsg,     setAgentWithdrawMsg]     = useState('');
  const [agentWithdrawLoading, setAgentWithdrawLoading] = useState(false);

  // Agent deposit state
  const [isAgentDepositOpen,   setIsAgentDepositOpen]   = useState(false);
  const [agentDepCodeInput,    setAgentDepCodeInput]    = useState('');
  const [agentDepSearchLoad,   setAgentDepSearchLoad]   = useState(false);
  const [agentDepInfo,         setAgentDepInfo]         = useState<{ name: string; affiliateCode: string; affiliateId: string; available: boolean } | null>(null);
  const [agentDepAmount,       setAgentDepAmount]       = useState('');
  const [agentDepMsg,          setAgentDepMsg]          = useState('');
  const [agentDepLoading,      setAgentDepLoading]      = useState(false);

  const usdPreview = htgAmount && !isNaN(parseFloat(htgAmount)) ? parseFloat(htgAmount) / rate : 0;
  const htgPreview = withdrawUSD && !isNaN(parseFloat(withdrawUSD)) ? parseFloat(withdrawUSD) * rate : 0;
  const transferHtgPreview = transferUSD && !isNaN(parseFloat(transferUSD)) ? parseFloat(transferUSD) * rate : 0;

  const minDeposit  = settings?.minDepositUSD    || 0.01;
  const maxDeposit  = settings?.maxDepositUSD    || 10000;
  const minWithdraw = settings?.minWithdrawalUSD || 0.01;
  const maxWithdraw = settings?.maxWithdrawalUSD || 10000;

  const copyWalletId = () => {
    if (client?.walletId) {
      navigator.clipboard.writeText(client.walletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('ID Wallet copié !');
    }
  };

  const openWhatsApp = (message: string) => {
    const num = settings?.whatsappAdminNumber || WHATSAPP_NUMBER;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const resetDeposit = () => {
    setHtgAmount(''); setDepositTxId(''); setDepositMessage('');
    setDepositCaptchaToken(null); depositCaptchaRef.current?.reset();
  };

  const resetWithdraw = () => {
    setWithdrawUSD(''); setWithdrawAccount(''); setWithdrawAccountName('');
    setWithdrawMessage(''); setWithdrawCaptchaToken(null); withdrawCaptchaRef.current?.reset();
  };

  const resetTransfer = () => {
    setTransferWalletId(''); setTransferUSD(''); setTransferMessage(''); setTransferPreview(null);
  };

  const resetAgentWithdraw = () => {
    setAgentCodeInput(''); setAgentInfo(null);
    setAgentWithdrawAmount(''); setAgentWithdrawMsg('');
  };

  const resetAgentDeposit = () => {
    setAgentDepCodeInput(''); setAgentDepInfo(null);
    setAgentDepAmount(''); setAgentDepMsg('');
  };

  const handleAgentLookup = async () => {
    const code = agentCodeInput.trim();
    if (!code) { toast.error('Entrez le code agent.'); return; }
    setAgentSearchLoading(true);
    setAgentInfo(null);
    try {
      const res = await fetch(`/api/agent/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Agent introuvable.'); return; }
      setAgentInfo(data);
    } catch { toast.error('Erreur réseau.'); }
    finally { setAgentSearchLoading(false); }
  };

  const handleAgentDepLookup = async () => {
    const code = agentDepCodeInput.trim();
    if (!code) { toast.error('Entrez le code agent.'); return; }
    setAgentDepSearchLoad(true);
    setAgentDepInfo(null);
    try {
      const res = await fetch(`/api/agent/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Agent introuvable.'); return; }
      // For deposit via agent, must be an affiliate (has affiliateId)
      if (!data.affiliateId && !data.agentCode) { toast.error('Code invalide.'); return; }
      setAgentDepInfo({ name: data.name, affiliateCode: data.affiliateCode || code, affiliateId: data.affiliateId || '', available: data.available });
    } catch { toast.error('Erreur réseau.'); }
    finally { setAgentDepSearchLoad(false); }
  };

  const handleAgentWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentInfo) { toast.error('Recherchez un agent d\'abord.'); return; }
    if (!agentInfo.available) { toast.error('Cet agent est indisponible.'); return; }
    const usd = parseFloat(agentWithdrawAmount);
    if (isNaN(usd) || usd <= 0) { toast.error('Montant invalide.'); return; }
    if (usd > balance) { toast.error('Solde insuffisant.'); return; }
    if (usd < minWithdraw) { toast.error(`Montant minimum: $${minWithdraw.toFixed(2)} USD`); return; }
    if (usd > maxWithdraw) { toast.error(`Montant maximum: $${maxWithdraw.toFixed(2)} USD`); return; }
    setAgentWithdrawLoading(true);
    try {
      const res = await fetch('/api/client/agent-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: client?.name || '',
          amount: usd,
          ...(agentInfo.agentCode ? { agentCode: agentInfo.agentCode } : {}),
          ...(agentInfo.affiliateCode ? { affiliateCode: agentInfo.affiliateCode } : {}),
          ...(agentInfo.affiliateId ? { affiliateId: agentInfo.affiliateId } : {}),
          ...(agentWithdrawMsg.trim() && { message: agentWithdrawMsg.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur.'); return; }
      toast.success(`Demande de retrait soumise ! ${agentInfo.name} confirmera sous peu.`);
      setIsAgentWithdrawOpen(false); resetAgentWithdraw();
    } catch { toast.error('Erreur réseau.'); }
    finally { setAgentWithdrawLoading(false); }
  };

  const handleAgentDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentDepInfo) { toast.error('Recherchez un agent d\'abord.'); return; }
    if (!agentDepInfo.available) { toast.error('Cet agent est indisponible.'); return; }
    const usd = parseFloat(agentDepAmount);
    if (isNaN(usd) || usd <= 0) { toast.error('Montant invalide.'); return; }
    if (usd < minDeposit) { toast.error(`Montant minimum: $${minDeposit.toFixed(2)} USD`); return; }
    if (usd > maxDeposit) { toast.error(`Montant maximum: $${maxDeposit.toFixed(2)} USD`); return; }
    setAgentDepLoading(true);
    try {
      const res = await fetch('/api/client/agent-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: client?.name || '',
          amount: usd,
          affiliateCode: agentDepInfo.affiliateCode,
          ...(agentDepMsg.trim() && { message: agentDepMsg.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur.'); return; }
      toast.success(`Demande de dépôt envoyée à ${agentDepInfo.name} ! Il/elle confirmera sous peu.`);
      setIsAgentDepositOpen(false); resetAgentDeposit();
    } catch { toast.error('Erreur réseau.'); }
    finally { setAgentDepLoading(false); }
  };

  // Lookup recipient name as user types wallet ID
  const handleWalletIdChange = async (val: string) => {
    setTransferWalletId(val);
    setTransferPreview(null);
    if (val.trim().length < 4) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/client/lookup-wallet?walletId=${encodeURIComponent(val.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name) setTransferPreview(data.name);
      }
    } catch { /* silent */ }
    finally { setLookupLoading(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const htg = parseFloat(htgAmount);
    if (isNaN(htg) || htg <= 0) { toast.error('Montant invalide.'); return; }
    const usd = htg / rate;
    if (usd < minDeposit) { toast.error(`Montant minimum: $${minDeposit.toFixed(2)} USD`); return; }
    if (usd > maxDeposit) { toast.error(`Montant maximum: $${maxDeposit.toFixed(2)} USD`); return; }
    if (!depositMethod) { toast.error('Choisissez une méthode de paiement.'); return; }
    if (RECAPTCHA_SITE_KEY && !depositCaptchaToken) { toast.error('Validez le captcha.'); return; }
    setActionLoading(true);
    try {
      await submitClientDeposit(client!, usd, depositMethod.name, depositTxId || undefined,
        depositCaptchaToken || undefined, depositMessage || undefined, htg, rate);
      const msg = `Bonjour Rena 👋,\n\nDemande de *DÉPÔT* :\n` +
        `👤 Nom: *${client!.name}*\n🔑 ID Wallet: *${client!.walletId}*\n` +
        `💵 Montant: *$${usd.toFixed(2)} USD*\n≈ *${htg.toLocaleString()} HTG* (taux: ${rate})\n` +
        `💳 Via: *${depositMethod.name}*` +
        (depositMethod.number ? `\n📞 Numéro: *${depositMethod.number}*` : '') +
        (depositTxId ? `\n🔖 Référence: *${depositTxId}*` : '') +
        (depositMessage ? `\n💬 Message: *${depositMessage}*` : '') +
        `\n\nMerci de valider mon dépôt. 🙏`;
      openWhatsApp(msg);
      toast.success('Demande envoyée ! En attente de validation.');
      setIsDepositOpen(false); resetDeposit();
    } catch (err: any) {
      toast.error(err.message);
      depositCaptchaRef.current?.reset(); setDepositCaptchaToken(null);
    } finally { setActionLoading(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(withdrawUSD);
    if (isNaN(usd) || usd <= 0)  { toast.error('Montant invalide.'); return; }
    if (usd < minWithdraw)        { toast.error(`Montant minimum: $${minWithdraw.toFixed(2)} USD`); return; }
    if (usd > maxWithdraw)        { toast.error(`Montant maximum: $${maxWithdraw.toFixed(2)} USD`); return; }
    if (usd > balance)            { toast.error('Solde insuffisant.'); return; }
    if (!withdrawMethod)          { toast.error('Choisissez une méthode de retrait.'); return; }
    if (!withdrawAccount)         { toast.error('Numéro/adresse de réception requis.'); return; }
    if (RECAPTCHA_SITE_KEY && !withdrawCaptchaToken) { toast.error('Validez le captcha.'); return; }
    setActionLoading(true);
    try {
      await submitClientWithdrawal(client!, usd, withdrawMethod.name, withdrawAccount,
        withdrawCaptchaToken || undefined, withdrawMessage || undefined,
        withdrawAccountName || undefined, rate);
      const htgEq = Math.round(usd * rate);
      const num = settings?.whatsappAdminNumber || WHATSAPP_NUMBER;
      const msg = `Bonjour Rena 👋,\n\nDemande de *RETRAIT* :\n` +
        `👤 Nom: *${client!.name}*\n🔑 ID Wallet: *${client!.walletId}*\n` +
        `💵 Montant: *$${usd.toFixed(2)} USD*\n≈ *${htgEq.toLocaleString()} HTG* (taux: ${rate})\n` +
        `💳 Via: *${withdrawMethod.name}*\n📞 Compte: *${withdrawAccount}*` +
        (withdrawAccountName ? `\n👤 Bénéficiaire: *${withdrawAccountName}*` : '') +
        (withdrawMessage ? `\n💬 Message: *${withdrawMessage}*` : '') +
        `\n\nMerci de traiter ma demande. 🙏`;
      window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success('Demande de retrait soumise !');
      setIsWithdrawOpen(false); resetWithdraw();
    } catch (err: any) {
      toast.error(err.message);
      withdrawCaptchaRef.current?.reset(); setWithdrawCaptchaToken(null);
    } finally { setActionLoading(false); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(transferUSD);
    if (isNaN(usd) || usd <= 0)      { toast.error('Montant invalide.'); return; }
    if (usd > balance)                { toast.error('Solde insuffisant.'); return; }
    if (!transferWalletId.trim())     { toast.error('Entrez l\'ID Wallet du destinataire.'); return; }
    if (transferWalletId.trim() === client?.walletId) {
      toast.error('Vous ne pouvez pas vous transférer à vous-même.'); return;
    }
    setActionLoading(true);
    try {
      const result = await submitClientTransfer(
        clientId, transferWalletId.trim(), usd, transferMessage || undefined
      );
      toast.success(`$${result.amount.toFixed(2)} envoyé à ${result.recipientName || 'destinataire'} !`);
      setIsTransferOpen(false); resetTransfer();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setActionLoading(false); }
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm("Supprimer tout l'historique ? Action irréversible.")) return;
    setIsDeletingHistory(true);
    try {
      const res = await fetch(`/api/client/transactions/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur.');
      toast.success('Historique supprimé.');
    } catch { toast.error("Impossible de supprimer l'historique."); }
    finally { setIsDeletingHistory(false); }
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-0 bottom-[58px] sm:inset-0 z-[200] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative z-10 w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-full sm:max-h-[95vh] overflow-hidden flex flex-col shadow-2xl shadow-black/20"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-violet-600" />
            </div>
            <span className="font-black text-gray-900 text-sm">Mon Wallet</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Card */}
        <div className="px-4 pb-4 shrink-0">
          {loading ? (
            <div className="w-full rounded-[1.75rem] bg-violet-100 animate-pulse" style={{ aspectRatio: '1.75 / 1' }} />
          ) : client ? (
            <VirtualCard
              client={client} balance={balance} rate={rate}
              copied={copied} onCopy={copyWalletId}
              hidden={balanceHidden} onToggleHide={() => setBalanceHidden(v => !v)}
            />
          ) : (
            <div className="w-full rounded-[1.75rem] bg-gray-100 flex items-center justify-center" style={{ aspectRatio: '1.75 / 1' }}>
              <AlertCircle className="h-8 w-8 text-gray-300" />
            </div>
          )}

          {/* Balance strip */}
          {client && (
            <div className="mt-3 grid grid-cols-3 gap-2 px-1">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold">Solde USD</p>
                <p className="text-base font-black text-gray-900">
                  {balanceHidden ? '••••' : `$${balance.toFixed(2)}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold">Équivalent HTG</p>
                <p className="text-base font-black text-gray-900">
                  {balanceHidden ? '••••' : Math.round(balance * rate).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-semibold">Taux</p>
                <p className="text-sm font-black text-violet-600">1$ = {rate} HTG</p>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-4 pb-4 space-y-3">

            {/* ── Action buttons: Déposer + Retirer */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setDepositMethod(depositMethods[0] || null); setIsDepositOpen(true); }}
                className="group relative overflow-hidden flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95"
              >
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/10" />
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-0.5">
                  <ArrowDownToLine className="h-5 w-5 text-white" />
                </div>
                <p className="font-black text-white text-sm">Déposer</p>
                <p className="text-white/70 text-[10px]">HTG → USD</p>
              </button>

              <button
                onClick={() => { setWithdrawMethod(withdrawalMethods[0] || null); setIsWithdrawOpen(true); }}
                className="group relative overflow-hidden flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-200 hover:from-red-600 hover:to-rose-700 transition-all active:scale-95"
              >
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/10" />
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-0.5">
                  <ArrowUpFromLine className="h-5 w-5 text-white" />
                </div>
                <p className="font-black text-white text-sm">Retirer</p>
                <p className="text-white/70 text-[10px]">En USD</p>
              </button>
            </div>

            {/* ── Transfer + Agent buttons */}
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { resetTransfer(); setIsTransferOpen(true); }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 transition-all active:scale-95 group"
              >
                <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow shadow-violet-300 group-hover:shadow-md transition-shadow">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-violet-700 text-sm leading-tight">Transfert Wallet</p>
                  <p className="text-violet-400 text-[10px]">Envoyer des fonds à un autre utilisateur</p>
                </div>
              </button>

              <button
                onClick={() => { resetAgentDeposit(); setIsAgentDepositOpen(true); }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all active:scale-95 group"
              >
                <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow shadow-emerald-300 group-hover:shadow-md transition-shadow">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-emerald-700 text-sm leading-tight">Dépôt via Agent</p>
                  <p className="text-emerald-400 text-[10px]">Déposer du cash auprès d'un point de service</p>
                </div>
              </button>

              <button
                onClick={() => { resetAgentWithdraw(); setIsAgentWithdrawOpen(true); }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-teal-200 bg-teal-50 hover:bg-teal-100 transition-all active:scale-95 group"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center shadow shadow-teal-300 group-hover:shadow-md transition-shadow">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-teal-700 text-sm leading-tight">Retrait via Agent</p>
                  <p className="text-teal-400 text-[10px]">Récupérer du cash auprès d'un point de service</p>
                </div>
              </button>
            </div>

            {/* Payment Methods */}
            {depositMethods.length > 0 && (
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <CardIcon className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthodes acceptées</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {depositMethods.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${methodColors[m.type] || 'text-gray-400 bg-gray-50'}`}>
                        {getMethodIcon(m.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800">{m.icon} {m.name}</p>
                        {m.number  && <p className="text-[10px] text-gray-400 font-mono">{m.number}</p>}
                        {m.address && <p className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{m.address}</p>}
                      </div>
                      {m.qrUrl && (
                        <img src={m.qrUrl} alt="QR" className="h-9 w-9 rounded-xl object-cover border border-gray-100"
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-100">
              <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-violet-600" />
              </div>
              <p className="text-xs text-violet-700 leading-relaxed">
                Toutes les transactions sont vérifiées par notre équipe sous 24h. Vos fonds sont sécurisés par Rena.
              </p>
            </div>

            {/* History */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              <button
                onClick={() => setHistoryOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historique</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-300 ${historyOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {historyOpen && (
                  <motion.div
                    key="history"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="p-3 space-y-2">
                      {txLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Aucune transaction.</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end mb-1">
                            <button onClick={handleDeleteHistory} disabled={isDeletingHistory}
                              className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                              {isDeletingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Supprimer l'historique
                            </button>
                          </div>
                          {transactions.map(tx => {
                            const sc = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                            const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'refund';
                            const usdAmt = tx.usdAmount ?? tx.amount;
                            const htgEq  = tx.htgAmount ?? tx.htgEquivalent;
                            const isTransfer = tx.type === 'transfer_received' || (tx.method === 'Transfert Wallet');
                            return (
                              <div key={tx.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isTransfer ? 'bg-violet-100' : isCredit ? 'bg-emerald-100' : 'bg-red-100'
                                }`}>
                                  {isTransfer
                                    ? <Send className="h-4 w-4 text-violet-600" />
                                    : isCredit
                                      ? <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                                      : <ArrowUpFromLine className="h-4 w-4 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-gray-800 truncate">
                                    {tx.method === 'Transfert Wallet' && !isCredit
                                      ? 'Transfert envoyé'
                                      : typeLabel[tx.type] || tx.type}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">{tx.description || tx.method || ''}</p>
                                  {tx.createdAt?.toDate && (
                                    <p className="text-[10px] text-gray-300 mt-0.5">
                                      {format(tx.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: fr })}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`font-black text-sm ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isCredit ? '+' : '-'}${usdAmt.toFixed(2)}
                                  </p>
                                  {htgEq && htgEq > 0 && (
                                    <p className="text-[10px] text-gray-400">
                                      ≈ {Math.round(htgEq).toLocaleString()} HTG
                                    </p>
                                  )}
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.color}`}>
                                    {sc.icon}{sc.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 font-bold"
          >
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </motion.div>

      {/* ── DEPOSIT MODAL ──────────────────────────────────────────────────────── */}
      <Dialog open={isDepositOpen} onOpenChange={v => { if (!v) resetDeposit(); setIsDepositOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Faire un dépôt</DialogTitle>
                <DialogDescription className="text-emerald-100/70 text-xs">Rechargez votre wallet en HTG</DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleDeposit} className="p-5 space-y-4 bg-white overflow-y-auto flex-1">

            {/* ── 1. Méthode de paiement ── */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthode de paiement</Label>
              {depositMethods.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">Aucune méthode de dépôt activée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {depositMethods.map(m => (
                    <button key={m.id} type="button" onClick={() => setDepositMethod(m)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-center ${
                        depositMethod?.id === m.id
                          ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}>
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[10px] font-black text-gray-700 leading-tight">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. Infos compte + QR (s'affiche après sélection) ── */}
            {(() => {
              if (!depositMethod) return null;
              const num = depositMethod.number || depositMethod.address
                || (depositMethod.id === 'moncash' ? (settings as any)?.moncashNumber : null)
                || (depositMethod.id === 'natcash' ? (settings as any)?.natcashNumber : null)
                || (depositMethod.id === 'admi' ? (settings as any)?.admiNumber : null)
                || null;
              const qr = depositMethod.qrUrl
                || (depositMethod.id === 'moncash' ? (settings as any)?.moncashQR : null)
                || (depositMethod.id === 'natcash' ? (settings as any)?.natcashQR : null)
                || (depositMethod.id === 'admi' ? (settings as any)?.admiQR : null)
                || null;
              const accountName = depositMethod.accountName || null;
              if (!num && !qr) return null;
              return (
                <div className="rounded-2xl overflow-hidden border border-emerald-100">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
                    <Smartphone className="h-3.5 w-3.5 text-white" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Compte {depositMethod.name}</p>
                  </div>
                  <div className="p-3 space-y-3 bg-emerald-50">
                    {num && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">{depositMethod.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide leading-none">{depositMethod.name}</p>
                            {accountName && (
                              <p className="text-[11px] font-bold text-gray-700 leading-tight mt-0.5">{accountName}</p>
                            )}
                            <p className="font-black text-gray-900 font-mono text-base mt-0.5 tracking-wider">{num}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(num); toast.success(`Numéro ${depositMethod.name} copié !`); }}
                          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-95"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {qr && (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-emerald-100">
                        <div className="relative shrink-0">
                          <img src={qr} alt="QR Code" className="h-20 w-20 object-contain rounded-lg border border-gray-100"
                            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-md shadow">
                            <QrCode className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">QR Code</p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">Scannez ce code pour envoyer le paiement directement</p>
                        </div>
                      </div>
                    )}
                    {depositMethod.instructions && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                        <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-blue-700 leading-relaxed">{depositMethod.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant envoyé (HTG)</Label>
              <Input type="number" value={htgAmount} onChange={e => setHtgAmount(e.target.value)}
                placeholder="Ex: 1 000" className="h-12 rounded-xl text-lg font-black" min="1" step="1" required />
              {usdPreview > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-black text-emerald-700">
                    Vous recevrez ≈ <span className="text-base">${usdPreview.toFixed(2)} USD</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Référence / ID transaction</Label>
              <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)}
                placeholder="Ex: TX-1234567890" className="h-11 rounded-xl font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea value={depositMessage} onChange={e => setDepositMessage(e.target.value)}
                placeholder="Informations supplémentaires..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                maxLength={300} />
              <p className="text-[10px] text-gray-400">{depositMessage.length}/300</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              <strong>Étape suivante :</strong> Vous serez redirigé sur WhatsApp pour envoyer votre preuve de paiement.
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center">
                <CaptchaWidget sitekey={RECAPTCHA_SITE_KEY} captchaRef={depositCaptchaRef}
                  onChange={t => setDepositCaptchaToken(t)} onExpired={() => setDepositCaptchaToken(null)} />
              </div>
            )}

            <Button type="submit"
              disabled={actionLoading || !depositMethod || (!!RECAPTCHA_SITE_KEY && !depositCaptchaToken)}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmer et envoyer preuve →'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── WITHDRAW MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={isWithdrawOpen} onOpenChange={v => { if (!v) resetWithdraw(); setIsWithdrawOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-br from-red-500 to-rose-700 p-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Retirer des fonds</DialogTitle>
                <DialogDescription className="text-red-100/70 text-xs">
                  Solde: <strong>${balance.toFixed(2)} USD</strong> ≈ {Math.round(balance * rate).toLocaleString()} HTG
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleWithdraw} className="p-5 space-y-4 bg-white overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthode de retrait</Label>
              {withdrawalMethods.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">Aucune méthode de retrait activée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {withdrawalMethods.map(m => (
                    <button key={m.id} type="button" onClick={() => setWithdrawMethod(m)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-center ${
                        withdrawMethod?.id === m.id
                          ? 'border-red-400 bg-red-50 ring-2 ring-red-200'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}>
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[10px] font-black text-gray-700 leading-tight">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant à retirer (USD)</Label>
              <Input type="number" value={withdrawUSD} onChange={e => setWithdrawUSD(e.target.value)}
                placeholder="Ex: 10.00" className="h-12 rounded-xl text-lg font-black"
                min="0.01" max={balance} step="0.01" required />
              {htgPreview > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100">
                  <TrendingUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-xs font-black text-red-600">
                    ≈ <span className="text-base">{Math.round(htgPreview).toLocaleString()} HTG</span> que vous recevrez
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {withdrawMethod?.type === 'crypto' ? 'Adresse crypto' : 'Numéro / Compte de réception'}
              </Label>
              <Input value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)}
                placeholder={withdrawMethod?.type === 'crypto' ? '0x...' : 'Numéro de réception'}
                className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom du bénéficiaire</Label>
              <Input value={withdrawAccountName} onChange={e => setWithdrawAccountName(e.target.value)}
                placeholder="Nom complet" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea value={withdrawMessage} onChange={e => setWithdrawMessage(e.target.value)}
                placeholder="Informations supplémentaires..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all"
                maxLength={300} />
              <p className="text-[10px] text-gray-400">{withdrawMessage.length}/300</p>
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center">
                <CaptchaWidget sitekey={RECAPTCHA_SITE_KEY} captchaRef={withdrawCaptchaRef}
                  onChange={t => setWithdrawCaptchaToken(t)} onExpired={() => setWithdrawCaptchaToken(null)} />
              </div>
            )}

            <Button type="submit"
              disabled={actionLoading || !withdrawMethod || (!!RECAPTCHA_SITE_KEY && !withdrawCaptchaToken)}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AGENT WITHDRAWAL MODAL ───────────────────────────────────────────── */}
      <Dialog open={isAgentWithdrawOpen} onOpenChange={v => { if (!v) resetAgentWithdraw(); setIsAgentWithdrawOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-700 p-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Retrait via Agent</DialogTitle>
                <DialogDescription className="text-teal-100/70 text-xs">
                  Solde: <strong>${balance.toFixed(2)} USD</strong>
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleAgentWithdraw} className="p-5 space-y-4 bg-white overflow-y-auto flex-1">

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-100">
              <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700 leading-relaxed">
                Soumettez une demande, puis rendez-vous physiquement chez l'agent pour récupérer votre argent.
              </p>
            </div>

            {/* Agent code search */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Code Agent (8 chiffres)</Label>
              <div className="flex gap-2">
                <Input
                  value={agentCodeInput}
                  onChange={e => { setAgentCodeInput(e.target.value); setAgentInfo(null); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAgentLookup())}
                  placeholder="Ex: 12345678"
                  className="h-11 rounded-xl font-mono flex-1"
                  maxLength={12}
                />
                <Button
                  type="button"
                  onClick={handleAgentLookup}
                  disabled={agentSearchLoading || !agentCodeInput.trim()}
                  className="h-11 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 border-0 text-white shrink-0"
                >
                  {agentSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Agent info card */}
            <AnimatePresence>
              {agentInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                    agentInfo.available
                      ? 'bg-teal-50 border-teal-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 ${
                    agentInfo.available ? 'bg-teal-500' : 'bg-red-400'
                  }`}>
                    {agentInfo.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800">{agentInfo.name}</p>
                    <p className="text-[10px] font-mono text-gray-400">#{agentInfo.agentCode}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                    agentInfo.available
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {agentInfo.available ? '● Disponible' : '● Inactif'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant à retirer (USD)</Label>
              <Input
                type="number"
                value={agentWithdrawAmount}
                onChange={e => setAgentWithdrawAmount(e.target.value)}
                placeholder="Ex: 20.00"
                className="h-12 rounded-xl text-lg font-black"
                min="0.01"
                max={balance}
                step="0.01"
                required
              />
              {agentWithdrawAmount && !isNaN(parseFloat(agentWithdrawAmount)) && parseFloat(agentWithdrawAmount) > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <p className="text-xs font-black text-teal-700">
                    ≈ <span className="text-sm">{Math.round(parseFloat(agentWithdrawAmount) * rate).toLocaleString()} HTG</span> à récupérer
                  </p>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea
                value={agentWithdrawMsg}
                onChange={e => setAgentWithdrawMsg(e.target.value)}
                placeholder="Notes pour l'agent..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
                maxLength={200}
              />
              <p className="text-[10px] text-gray-400">{agentWithdrawMsg.length}/200</p>
            </div>

            <Button
              type="submit"
              disabled={agentWithdrawLoading || !agentInfo || !agentInfo.available || !agentWithdrawAmount}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black border-0"
            >
              {agentWithdrawLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : 'Soumettre la demande →'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AGENT DEPOSIT MODAL ───────────────────────────────────────────────── */}
      <Dialog open={isAgentDepositOpen} onOpenChange={v => { if (!v) resetAgentDeposit(); setIsAgentDepositOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Dépôt via Agent</DialogTitle>
                <DialogDescription className="text-emerald-100/70 text-xs">
                  Solde actuel: <strong>${balance.toFixed(2)} USD</strong>
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleAgentDeposit} className="p-5 space-y-4 bg-white overflow-y-auto flex-1">
            {/* Agent Code */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Code de l'Agent / Affilié</Label>
              <div className="flex gap-2">
                <Input
                  value={agentDepCodeInput}
                  onChange={e => { setAgentDepCodeInput(e.target.value); setAgentDepInfo(null); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAgentDepLookup())}
                  placeholder="Ex: RENA001"
                  className="h-11 rounded-xl font-mono flex-1"
                  maxLength={12}
                />
                <Button
                  type="button"
                  onClick={handleAgentDepLookup}
                  disabled={agentDepSearchLoad || !agentDepCodeInput.trim()}
                  className="h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 border-0 text-white shrink-0"
                >
                  {agentDepSearchLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {agentDepInfo && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-black text-sm">{agentDepInfo.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-black text-emerald-800">{agentDepInfo.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">#{agentDepInfo.affiliateCode}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${agentDepInfo.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {agentDepInfo.available ? 'Disponible' : 'Indisponible'}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant à déposer (USD)</Label>
              <Input
                type="number"
                value={agentDepAmount}
                onChange={e => setAgentDepAmount(e.target.value)}
                placeholder="Ex: 20.00"
                className="h-12 rounded-xl text-lg font-black"
                min="0.01"
                step="0.01"
              />
              {agentDepAmount && !isNaN(parseFloat(agentDepAmount)) && parseFloat(agentDepAmount) > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-black text-emerald-700">
                    ≈ <span className="text-sm">{Math.round(parseFloat(agentDepAmount) * rate).toLocaleString()} HTG</span> à remettre à l'agent
                  </p>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea
                value={agentDepMsg}
                onChange={e => setAgentDepMsg(e.target.value)}
                placeholder="Notes pour l'agent..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                maxLength={200}
              />
              <p className="text-[10px] text-gray-400">{agentDepMsg.length}/200</p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Remettez le cash physiquement à l'agent. Il confirmera la transaction et votre solde sera crédité.
              </p>
            </div>

            <Button
              type="submit"
              disabled={agentDepLoading || !agentDepInfo || !agentDepInfo.available || !agentDepAmount}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black border-0"
            >
              {agentDepLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande →'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── TRANSFER MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={isTransferOpen} onOpenChange={v => { if (!v) resetTransfer(); setIsTransferOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Transfert Wallet</DialogTitle>
                <DialogDescription className="text-violet-200/70 text-xs">
                  Solde disponible: <strong>${balance.toFixed(2)} USD</strong>
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleTransfer} className="p-5 space-y-4 bg-white overflow-y-auto flex-1">

            {/* Recipient Wallet ID */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                ID Wallet du destinataire
              </Label>
              <div className="relative">
                <Input
                  value={transferWalletId}
                  onChange={e => handleWalletIdChange(e.target.value)}
                  placeholder="Ex: NP-XXXX-XXXX"
                  className="h-12 rounded-xl font-mono pr-10"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {lookupLoading
                    ? <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                    : transferPreview
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <User className="h-4 w-4 text-gray-300" />}
                </div>
              </div>
              {/* Recipient preview */}
              <AnimatePresence>
                {transferPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100"
                  >
                    <div className="h-7 w-7 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-black text-xs shrink-0">
                      {transferPreview.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-800">{transferPreview}</p>
                      <p className="text-[10px] text-emerald-500">Destinataire trouvé ✓</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant à envoyer (USD)</Label>
              <Input type="number" value={transferUSD} onChange={e => setTransferUSD(e.target.value)}
                placeholder="Ex: 5.00" className="h-12 rounded-xl text-lg font-black"
                min="0.01" max={balance} step="0.01" required />
              {transferHtgPreview > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <p className="text-xs font-black text-violet-700">
                    ≈ <span className="text-base">{Math.round(transferHtgPreview).toLocaleString()} HTG</span>
                  </p>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Note (optionnel)</Label>
              <textarea value={transferMessage} onChange={e => setTransferMessage(e.target.value)}
                placeholder="Ex: Remboursement, cadeau..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all"
                maxLength={200} />
              <p className="text-[10px] text-gray-400">{transferMessage.length}/200</p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Les transferts entre wallets sont <strong>instantanés et irréversibles</strong>. Vérifiez bien l'ID du destinataire.
              </p>
            </div>

            <Button type="submit"
              disabled={actionLoading || !transferWalletId.trim() || !transferUSD}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black">
              {actionLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <><Send className="h-4 w-4 mr-2" />Envoyer maintenant</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
