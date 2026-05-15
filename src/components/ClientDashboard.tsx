import React, { useState, useRef, useMemo } from 'react';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, History,
  LogOut, Loader2, X, Copy, CheckCircle2, AlertCircle,
  Clock, XCircle, Shield, Trash2,
  TrendingUp, Globe, Smartphone, CreditCard as CardIcon,
  Building2, Bitcoin, Info, ChevronRight, BarChart2,
  Eye, EyeOff, ChevronDown
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
import { useClientData, useClientTransactions, submitClientDeposit, submitClientWithdrawal } from '../services/clientService';
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
  pending:   { label: 'En attente', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',    icon: <Clock className="h-3 w-3" /> },
  approved:  { label: 'Approuvé',   color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:  { label: 'Refusé',     color: 'bg-red-500/20 text-red-400 border border-red-500/30',         icon: <XCircle className="h-3 w-3" /> },
  completed: { label: 'Complété',   color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',      icon: <CheckCircle2 className="h-3 w-3" /> },
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

  const [balanceHidden,     setBalanceHidden]     = useState(false);
  const [showMethods,       setShowMethods]       = useState(false);
  const [isDepositOpen,     setIsDepositOpen]     = useState(false);
  const [isWithdrawOpen,    setIsWithdrawOpen]    = useState(false);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [copied,            setCopied]            = useState(false);

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

  const usdPreview = htgAmount && !isNaN(parseFloat(htgAmount)) ? parseFloat(htgAmount) / rate : 0;
  const htgPreview = withdrawUSD && !isNaN(parseFloat(withdrawUSD)) ? parseFloat(withdrawUSD) * rate : 0;

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

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const htg = parseFloat(htgAmount);
    if (isNaN(htg) || htg <= 0) { toast.error('Montant invalide.'); return; }
    const usd = htg / rate;
    if (usd < minDeposit) { toast.error(`Montant minimum: $${minDeposit.toFixed(2)} USD`); return; }
    if (usd > maxDeposit) { toast.error(`Montant maximum: $${maxDeposit.toFixed(2)} USD`); return; }
    if (!depositMethod)  { toast.error('Choisissez une méthode de paiement.'); return; }
    if (RECAPTCHA_SITE_KEY && !depositCaptchaToken) { toast.error('Validez le captcha.'); return; }
    setActionLoading(true);
    try {
      await submitClientDeposit(client!, usd, depositMethod.name, depositTxId || undefined,
        depositCaptchaToken || undefined, depositMessage || undefined, htg, rate);
      const msg = `Bonjour Neopay 👋,\n\nDemande de *DÉPÔT* :\n` +
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
      const msg = `Bonjour Neopay 👋,\n\nDemande de *RETRAIT* :\n` +
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
  const initial = client?.name?.charAt(0).toUpperCase() || '?';

  if (!open) return null;

  // ── Colors ──────────────────────────────────────────────────────────────────
  const BG        = '#0B1629';   // main background
  const CARD_BG   = '#111f38';   // balance card
  const CARD2_BG  = '#0f1c33';   // transactions area

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        style={{ background: BG }}
      >
        {/* ── Header row */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-11 w-11 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
                <span className="text-white font-black text-lg">{initial}</span>
              </div>
            )}
            <div>
              <p className="text-white font-black text-sm leading-tight">
                {loading ? '...' : client?.name || 'Client'}
              </p>
              <button onClick={copyWalletId} className="flex items-center gap-1 group">
                <span className="text-white/40 text-[11px] font-mono">
                  ID: {client?.walletId ? client.walletId.slice(0, 8) + '…' : '—'}
                </span>
                {copied
                  ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  : <Copy className="h-3 w-3 text-white/20 group-hover:text-white/50 transition-colors" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMethods(v => !v)}
              className="flex items-center gap-1 text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors"
            >
              Tout voir <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-4 pb-4 space-y-3">

            {/* ── Balance card */}
            <div className="rounded-2xl p-4" style={{ background: CARD_BG }}>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Solde disponible</p>
              <div className="flex items-start justify-between">
                <div>
                  {loading ? (
                    <div className="h-10 w-32 rounded-lg bg-white/10 animate-pulse mb-1" />
                  ) : balanceHidden ? (
                    <p className="text-white font-black text-4xl tracking-widest leading-none">••••</p>
                  ) : (
                    <p className="text-white font-black text-4xl leading-none">
                      {Math.round(balance * rate).toLocaleString()}
                      <span className="text-white/40 text-lg font-semibold ml-2">HTG</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-blue-400 text-sm">$</span>
                    <span className="text-blue-400 font-black text-sm">
                      {balanceHidden ? '••••' : `$${balance.toFixed(2)} USD`}
                    </span>
                    <span className="text-white/25 text-xs">• taux {rate} HTG/$</span>
                  </div>
                </div>
                <button
                  onClick={() => setBalanceHidden(v => !v)}
                  className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mt-0.5"
                >
                  {balanceHidden
                    ? <EyeOff className="h-4 w-4 text-white/40" />
                    : <Eye className="h-4 w-4 text-white/40" />}
                </button>
              </div>
            </div>

            {/* ── Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setDepositMethod(depositMethods[0] || null); setIsDepositOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all font-black text-white text-sm shadow-lg shadow-emerald-900/40"
              >
                <ArrowDownToLine className="h-4 w-4" /> Déposer
              </button>
              <button
                onClick={() => { setWithdrawMethod(withdrawalMethods[0] || null); setIsWithdrawOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-black text-white/80 text-sm active:scale-95 transition-all border border-white/10 hover:bg-white/10"
                style={{ background: '#1a2744' }}
              >
                <ArrowUpFromLine className="h-4 w-4" /> Retirer
              </button>
              <button
                onClick={() => setShowMethods(v => !v)}
                className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-lg shadow-blue-900/40"
                style={{ background: '#1d4ed8' }}
              >
                <BarChart2 className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* ── Payment methods (expandable) */}
            <AnimatePresence initial={false}>
              {showMethods && depositMethods.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: CARD_BG }}>
                    <div className="px-4 py-2.5 border-b border-white/5">
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Méthodes acceptées</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {depositMethods.slice(0, 6).map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 shrink-0">
                            {getMethodIcon(m.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white/80">{m.icon} {m.name}</p>
                            {m.number  && <p className="text-[10px] text-white/30 font-mono">{m.number}</p>}
                            {m.address && <p className="text-[10px] text-white/30 font-mono truncate max-w-[160px]">{m.address}</p>}
                          </div>
                          {m.qrUrl && (
                            <img src={m.qrUrl} alt="QR" className="h-9 w-9 rounded-xl object-cover border border-white/10"
                              onError={e => (e.currentTarget.style.display = 'none')} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Transactions */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD2_BG }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                  Dernières transactions
                  {pendingCount > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full align-middle">
                      {pendingCount}
                    </span>
                  )}
                </p>
                {transactions.length > 0 && (
                  <button onClick={handleDeleteHistory} disabled={isDeletingHistory}
                    className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-50">
                    {isDeletingHistory ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Supprimer
                  </button>
                )}
              </div>

              {txLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400/50" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Clock className="h-10 w-10 text-white/10" />
                  <p className="text-white/25 text-sm">Aucune transaction</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {transactions.map(tx => {
                    const sc = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                    const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'refund';
                    const usdAmt = tx.usdAmount ?? tx.amount;
                    const htgEq  = tx.htgAmount ?? tx.htgEquivalent;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                          {isCredit
                            ? <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
                            : <ArrowUpFromLine className="h-4 w-4 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white/80 truncate">{typeLabel[tx.type] || tx.type}</p>
                          <p className="text-[10px] text-white/30 truncate">{tx.description || tx.method || ''}</p>
                          {tx.createdAt?.toDate && (
                            <p className="text-[10px] text-white/20 mt-0.5">
                              {format(tx.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black text-sm ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isCredit ? '+' : '-'}${usdAmt.toFixed(2)}
                          </p>
                          {htgEq && htgEq > 0 && (
                            <p className="text-[10px] text-white/25">
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
                </div>
              )}
            </div>

            {/* ── Security note */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/5" style={{ background: CARD_BG }}>
              <Shield className="h-4 w-4 text-blue-400/60 shrink-0" />
              <p className="text-white/30 text-xs leading-relaxed">
                Transactions vérifiées sous 24h. Fonds sécurisés par Neopay.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer */}
        <div className="px-4 py-3 border-t border-white/5 shrink-0" style={{ background: BG }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </motion.div>

      {/* ── Deposit Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={isDepositOpen} onOpenChange={v => { if (!v) resetDeposit(); setIsDepositOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col" style={{ background: '#0B1629' }}>
          <div className="p-5 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Faire un dépôt</DialogTitle>
                <DialogDescription className="text-white/30 text-xs">Rechargez votre wallet en HTG</DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleDeposit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Méthode de paiement</Label>
              {depositMethods.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Info className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-400">Aucune méthode de dépôt activée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {depositMethods.map(m => (
                    <button key={m.id} type="button" onClick={() => setDepositMethod(m)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-center ${
                        depositMethod?.id === m.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}>
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[10px] font-black text-white/70 leading-tight">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {depositMethod && (depositMethod.number || depositMethod.address || depositMethod.qrUrl || depositMethod.instructions) && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                {depositMethod.number && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-white/30" />
                    <div>
                      <p className="text-[10px] font-black text-white/30 uppercase">Numéro</p>
                      <p className="font-black text-white font-mono">{depositMethod.number}</p>
                    </div>
                    {depositMethod.qrUrl && (
                      <img src={depositMethod.qrUrl} alt="QR" className="h-14 w-14 rounded-xl ml-auto border border-white/10 object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                )}
                {depositMethod.address && (
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase">Adresse</p>
                    <p className="font-mono text-xs text-white/80 break-all">{depositMethod.address}</p>
                    {depositMethod.qrUrl && (
                      <img src={depositMethod.qrUrl} alt="QR" className="h-20 w-20 rounded-xl mt-2 border border-white/10 object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                )}
                {depositMethod.accountName && (
                  <p className="text-xs text-white/40">Compte: <span className="font-bold text-white/70">{depositMethod.accountName}</span></p>
                )}
                {depositMethod.instructions && (
                  <p className="text-[11px] text-blue-300 bg-blue-500/10 rounded-xl p-2.5 border border-blue-500/20">{depositMethod.instructions}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Montant envoyé (HTG)</Label>
              <Input type="number" value={htgAmount} onChange={e => setHtgAmount(e.target.value)}
                placeholder="Ex: 1 000"
                className="h-12 rounded-xl text-lg font-black bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50"
                min="1" step="1" required />
              {usdPreview > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <p className="text-xs font-black text-emerald-400">
                    Vous recevrez ≈ <span className="text-base">${usdPreview.toFixed(2)} USD</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Référence / ID transaction</Label>
              <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)}
                placeholder="Ex: TX-1234567890"
                className="h-11 rounded-xl font-mono bg-white/5 border-white/10 text-white placeholder:text-white/20" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea value={depositMessage} onChange={e => setDepositMessage(e.target.value)}
                placeholder="Informations supplémentaires..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm placeholder:text-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                maxLength={300} />
              <p className="text-[10px] text-white/20">{depositMessage.length}/300</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              <strong>Étape suivante :</strong> Vous serez redirigé sur WhatsApp pour envoyer votre preuve de paiement.
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center">
                <CaptchaWidget sitekey={RECAPTCHA_SITE_KEY} captchaRef={depositCaptchaRef}
                  onChange={t => setDepositCaptchaToken(t)} onExpired={() => setDepositCaptchaToken(null)} />
              </div>
            )}

            <button type="submit"
              disabled={actionLoading || !depositMethod || (!!RECAPTCHA_SITE_KEY && !depositCaptchaToken)}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmer et envoyer preuve →'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Withdraw Modal ───────────────────────────────────────────────────── */}
      <Dialog open={isWithdrawOpen} onOpenChange={v => { if (!v) resetWithdraw(); setIsWithdrawOpen(v); }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col" style={{ background: '#0B1629' }}>
          <div className="p-5 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Retirer des fonds</DialogTitle>
                <DialogDescription className="text-white/30 text-xs">
                  Solde: <strong className="text-white/60">${balance.toFixed(2)} USD</strong> ≈ {Math.round(balance * rate).toLocaleString()} HTG
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleWithdraw} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Méthode de retrait</Label>
              {withdrawalMethods.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Info className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-400">Aucune méthode de retrait activée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {withdrawalMethods.map(m => (
                    <button key={m.id} type="button" onClick={() => setWithdrawMethod(m)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all text-center ${
                        withdrawMethod?.id === m.id
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}>
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[10px] font-black text-white/70 leading-tight">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Montant à retirer (USD)</Label>
              <Input type="number" value={withdrawUSD} onChange={e => setWithdrawUSD(e.target.value)}
                placeholder="Ex: 10.00"
                className="h-12 rounded-xl text-lg font-black bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-red-500/50"
                min="0.01" max={balance} step="0.01" required />
              {htgPreview > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <TrendingUp className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <p className="text-xs font-black text-red-400">
                    ≈ <span className="text-base">{Math.round(htgPreview).toLocaleString()} HTG</span> que vous recevrez
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                {withdrawMethod?.type === 'crypto' ? 'Adresse crypto' : 'Numéro / Compte de réception'}
              </Label>
              <Input value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)}
                placeholder={withdrawMethod?.type === 'crypto' ? '0x...' : 'Numéro de réception'}
                className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20" required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nom du bénéficiaire</Label>
              <Input value={withdrawAccountName} onChange={e => setWithdrawAccountName(e.target.value)}
                placeholder="Nom complet"
                className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Message (optionnel)</Label>
              <textarea value={withdrawMessage} onChange={e => setWithdrawMessage(e.target.value)}
                placeholder="Informations supplémentaires..."
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/80 text-sm placeholder:text-white/20 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                maxLength={300} />
              <p className="text-[10px] text-white/20">{withdrawMessage.length}/300</p>
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col items-center">
                <CaptchaWidget sitekey={RECAPTCHA_SITE_KEY} captchaRef={withdrawCaptchaRef}
                  onChange={t => setWithdrawCaptchaToken(t)} onExpired={() => setWithdrawCaptchaToken(null)} />
              </div>
            )}

            <button type="submit"
              disabled={actionLoading || !withdrawMethod || (!!RECAPTCHA_SITE_KEY && !withdrawCaptchaToken)}
              className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
