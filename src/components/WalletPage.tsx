import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, History, LogOut, Loader2,
  X, Copy, CheckCircle2, Clock, XCircle, Shield,
  Trash2, ChevronDown, Eye, EyeOff, Upload, ArrowLeft, Info,
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
  submitClientDeposit, submitClientWithdrawal,
} from '../services/clientService';
import { useSettings } from '../services/parcelService';
import { Client, findFeeTier } from '../types';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';

// ── Official brand logos ───────────────────────────────────────────────────────

function SafacilPayIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <rect width="52" height="52" rx="13" fill="#1D6FE8"/>
      <rect x="8" y="16" width="36" height="22" rx="5" fill="white" fillOpacity="0.18"/>
      <rect x="8" y="22" width="36" height="6" fill="white" fillOpacity="0.35"/>
      <rect x="12" y="31" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.8"/>
      <rect x="28" y="31" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.5"/>
    </svg>
  );
}

function NatCashIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <rect width="52" height="52" rx="13" fill="#1B8E3D"/>
      <path d="M13 40 L13 13 L30 40 L30 13" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M35 13 L35 40" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M35 13 Q43 26 35 40" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function PayPalIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <rect width="52" height="52" rx="13" fill="#003087"/>
      <text x="26" y="23" textAnchor="middle" fill="#009CDE" fontSize="13" fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif">Pay</text>
      <text x="26" y="38" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="'Arial Black',Arial,sans-serif">Pal</text>
    </svg>
  );
}

function MethodLogo({ logoUrl, FallbackIcon, size = 40 }: {
  logoUrl?: string; FallbackIcon: React.FC<{ size?: number }>; size?: number;
}) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt="" className="rounded-xl object-contain"
        style={{ width: size, height: size }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
    );
  }
  return <FallbackIcon size={size} />;
}

const WALLET_METHODS = [
  {
    id: 'safacilpay', name: 'SafacilPay', Icon: SafacilPayIcon, forDeposit: true, forWithdrawal: false,
    activeDeposit: 'border-blue-400 bg-blue-50 ring-2 ring-blue-100',
    activeWithdraw: '',
  },
  {
    id: 'natcash', name: 'NatCash', Icon: NatCashIcon, forDeposit: true, forWithdrawal: true,
    activeDeposit: 'border-green-400 bg-green-50 ring-2 ring-green-100',
    activeWithdraw: 'border-green-400 bg-green-50 ring-2 ring-green-100',
  },
  {
    id: 'paypal', name: 'PayPal', Icon: PayPalIcon, forDeposit: true, forWithdrawal: true,
    activeDeposit: 'border-blue-400 bg-blue-50 ring-2 ring-blue-100',
    activeWithdraw: 'border-blue-400 bg-blue-50 ring-2 ring-blue-100',
  },
];

const statusConfig = {
  pending:   { label: 'En attente', color: 'bg-amber-100 text-amber-700 border border-amber-200',       icon: <Clock className="h-3 w-3" /> },
  approved:  { label: 'Approuvé',   color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:  { label: 'Refusé',     color: 'bg-red-100 text-red-600 border border-red-200',             icon: <XCircle className="h-3 w-3" /> },
  completed: { label: 'Complété',   color: 'bg-blue-100 text-blue-700 border border-blue-200',          icon: <CheckCircle2 className="h-3 w-3" /> },
};

const typeLabel: Record<string, string> = {
  deposit: 'Dépôt', withdrawal: 'Retrait', purchase: 'Achat',
  transfer_received: 'Reçu', refund: 'Remboursement',
};

async function uploadProofImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._]/g, '_');
    const path = `proofs/transactions/${Date.now()}_${safeName}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on('state_changed', null, reject, async () => {
      resolve(await getDownloadURL(task.snapshot.ref));
    });
  });
}

// ── Virtual Card ──────────────────────────────────────────────────────────────

function VirtualCard({ client, balance, rate, copied, onCopy, hidden, onToggleHide }: {
  client: Client; balance: number; rate: number;
  copied: boolean; onCopy: () => void; hidden: boolean; onToggleHide: () => void;
}) {
  return (
    <div className="relative w-full rounded-[1.75rem] overflow-hidden select-none shadow-2xl shadow-violet-900/40"
      style={{ aspectRatio: '1.75/1', background: 'linear-gradient(135deg, #3B0F8C 0%, #5B1FD4 30%, #7C3AED 60%, #6027C0 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(160,130,255,0.25) 0%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/[0.06]" />
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/[0.08]" />
      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Phénix Wallet</p>
            <p className="text-white font-black text-base leading-tight tracking-wide">{client.name}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={onToggleHide} className="text-white/35 hover:text-white/65 transition-colors">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <div className="h-7 w-10 rounded-lg overflow-hidden shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)' }}>
              <div className="w-full h-full grid grid-cols-2 gap-[1.5px] p-[3px]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-[2px]" style={{ background: 'rgba(120,60,0,0.35)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.3em] mb-1.5">Solde disponible</p>
          {hidden
            ? <p className="text-white font-black text-4xl tracking-widest leading-none">••••••</p>
            : <p className="text-white font-black leading-none" style={{ fontSize: '2rem' }}>
                ${balance.toFixed(2)}<span className="text-white/50 text-base font-bold ml-2">USD</span>
              </p>
          }
          {!hidden && <p className="text-white/35 text-[10px] font-semibold mt-1">≈ {Math.round(balance * rate).toLocaleString()} HTG</p>}
        </div>
        <div className="flex items-end justify-between">
          <button onClick={onCopy} className="flex items-center gap-2 group">
            <span className="text-white/30 text-[10px] font-mono tracking-[0.2em] group-hover:text-white/55 transition-colors">
              {client.walletId?.match(/.{1,4}/g)?.join(' ') || client.walletId}
            </span>
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-white/25 group-hover:text-white/60 transition-colors" />}
          </button>
          <div className="flex -space-x-3">
            <div className="h-9 w-9 rounded-full shadow-lg" style={{ background: 'rgba(220,38,38,0.85)' }} />
            <div className="h-9 w-9 rounded-full shadow-lg" style={{ background: 'rgba(251,191,36,0.9)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Proof upload ──────────────────────────────────────────────────────────────

function ProofUpload({ file, preview, onChange, accent = 'emerald' }: {
  file: File | null; preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  accent?: 'emerald' | 'red';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) { onChange(null, null); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange(f, ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = '';
  };
  const c = accent === 'emerald'
    ? { border: 'border-emerald-200 hover:border-emerald-400', bg: 'bg-emerald-50 hover:bg-emerald-100/60', text: 'text-emerald-600' }
    : { border: 'border-red-200 hover:border-red-400', bg: 'bg-red-50 hover:bg-red-100/60', text: 'text-red-500' };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preuve de paiement</Label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={preview} alt="Preuve" className="w-full h-32 object-cover" />
          <button type="button" onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-white text-[10px] font-bold truncate">{file?.name}</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl py-4 flex flex-col items-center gap-1.5 transition-all ${c.border} ${c.bg}`}>
          <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Upload className={`h-4 w-4 ${c.text}`} />
          </div>
          <p className={`text-xs font-black ${c.text}`}>Télécharger une preuve</p>
          <p className="text-[10px] text-gray-400">Photo ou capture d'écran (optionnel)</p>
        </button>
      )}
    </div>
  );
}

// ── Main WalletPage ───────────────────────────────────────────────────────────

interface WalletPageProps {
  clientId: string;
  initialClient?: Client | null;
  onLogout: () => void;
  onBack: () => void;
}

export default function WalletPage({ clientId, initialClient, onLogout, onBack }: WalletPageProps) {
  const { client: liveClient, loading, refresh: refreshClient } = useClientData(clientId);
  const client = liveClient ?? initialClient ?? null;
  const { transactions, loading: txLoading, refresh: refreshTx } = useClientTransactions(clientId);
  const { settings } = useSettings();

  const rate    = settings?.exchangeRate || 135;
  const balance = client?.balance || 0;

  const getLogoUrl = useMemo(() =>
    (id: string) => settings?.paymentMethods?.find(pm => pm.id === id)?.logoUrl,
    [settings?.paymentMethods]
  );

  const [copied,            setCopied]           = useState(false);
  const [balanceHidden,     setBalanceHidden]     = useState(false);
  const [historyOpen,       setHistoryOpen]       = useState(false);
  const [isDepositOpen,     setIsDepositOpen]     = useState(false);
  const [isWithdrawOpen,    setIsWithdrawOpen]    = useState(false);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Deposit state
  const [depositMethod,       setDepositMethod]       = useState(WALLET_METHODS[0]);
  const [htgAmount,           setHtgAmount]           = useState('');
  const [depositTxId,         setDepositTxId]         = useState('');
  const [depositMessage,      setDepositMessage]      = useState('');
  const [depositProofFile,    setDepositProofFile]    = useState<File | null>(null);
  const [depositProofPreview, setDepositProofPreview] = useState<string | null>(null);
  const [depositCaptchaToken, setDepositCaptchaToken] = useState<string | null>(null);
  const depositCaptchaRef = useRef<ReCAPTCHA>(null);

  // Withdrawal state
  const [withdrawMethod,       setWithdrawMethod]       = useState(WALLET_METHODS[0]);
  const [withdrawHTG,          setWithdrawHTG]          = useState('');
  const [withdrawAccount,      setWithdrawAccount]      = useState('');
  const [withdrawAccountName,  setWithdrawAccountName]  = useState('');
  const [withdrawMessage,      setWithdrawMessage]      = useState('');
  const [withdrawCaptchaToken, setWithdrawCaptchaToken] = useState<string | null>(null);
  const withdrawCaptchaRef = useRef<ReCAPTCHA>(null);

  const [txSuccessModal, setTxSuccessModal] = useState<{
    type: 'deposit' | 'withdrawal'; agentName?: string; htg: number; usd: number;
  } | null>(null);

  const usdPreview = htgAmount && !isNaN(parseFloat(htgAmount)) ? parseFloat(htgAmount) / rate : 0;

  const depositMethodData = settings?.paymentMethods?.find(pm => pm.id === depositMethod?.id);
  const depositGlobalFee  = settings?.depositFeePercent || 0;
  const depositFeeTier    = usdPreview > 0 ? findFeeTier(usdPreview, depositMethodData?.feeTiers) : null;
  const depositFeeAmount  = depositFeeTier
    ? (depositFeeTier.feeType === 'fixed' ? depositFeeTier.feeValue : parseFloat((usdPreview * depositFeeTier.feeValue / 100).toFixed(4)))
    : (usdPreview > 0 ? parseFloat((usdPreview * depositGlobalFee / 100).toFixed(4)) : 0);
  const depositNetAmount  = usdPreview > 0 ? parseFloat((usdPreview - depositFeeAmount).toFixed(4)) : 0;
  const depositFeeLabel   = depositFeeTier
    ? (depositFeeTier.feeType === 'fixed' ? `Frais fixe $${depositFeeTier.feeValue}` : `Frais ${depositFeeTier.feeValue}%`)
    : (depositGlobalFee > 0 ? `Frais ${depositGlobalFee}%` : '');

  const withdrawHTGNum    = parseFloat(withdrawHTG) || 0;
  const withdrawUSDNum    = withdrawHTGNum > 0 ? withdrawHTGNum / rate : 0;
  const withdrawMethodData = settings?.paymentMethods?.find(pm => pm.id === withdrawMethod?.id);
  const withdrawGlobalFee = settings?.withdrawalFeePercent || 0;
  const withdrawFeeTier   = withdrawUSDNum > 0 ? findFeeTier(withdrawUSDNum, withdrawMethodData?.feeTiers) : null;
  const withdrawFeeHTG    = withdrawFeeTier
    ? (withdrawFeeTier.feeType === 'fixed'
        ? Math.round(withdrawFeeTier.feeValue * rate)
        : Math.round(withdrawHTGNum * withdrawFeeTier.feeValue / 100))
    : (withdrawHTGNum > 0 ? Math.round(withdrawHTGNum * withdrawGlobalFee / 100) : 0);
  const withdrawNetHTG    = Math.max(0, withdrawHTGNum - withdrawFeeHTG);
  const withdrawNetAmount = withdrawNetHTG / rate;
  const withdrawFeeLabel  = withdrawFeeTier
    ? (withdrawFeeTier.feeType === 'fixed' ? `Frais fixe $${withdrawFeeTier.feeValue}` : `Frais ${withdrawFeeTier.feeValue}%`)
    : (withdrawGlobalFee > 0 ? `Frais ${withdrawGlobalFee}%` : '');

  const minDeposit  = settings?.minDepositUSD    || 0.01;
  const maxDeposit  = settings?.maxDepositUSD    || 10000;
  const minWithdraw = settings?.minWithdrawalUSD || 0.01;
  const maxWithdraw = settings?.maxWithdrawalUSD || 10000;
  const whatsapp    = settings?.whatsappAdminNumber || '+50939442830';

  const copyWalletId = () => {
    if (client?.walletId) {
      navigator.clipboard.writeText(client.walletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('ID Wallet copié !');
    }
  };

  const openWhatsApp = (msg: string) =>
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');

  useEffect(() => {
    if (!clientId) return;
    const es = new EventSource(`/api/client/events/${encodeURIComponent(clientId)}`);
    es.addEventListener('tx_approved', (e: Event) => {
      try {
        setTxSuccessModal(JSON.parse((e as MessageEvent).data));
        refreshClient();
        refreshTx();
      } catch {}
    });
    return () => es.close();
  }, [clientId, refreshClient, refreshTx]);

  const getMethodInfo = (methodId: string) => {
    const pm = settings?.paymentMethods?.find(m => m.id === methodId);
    const number = pm?.number
      || (methodId === 'moncash' ? (settings as any)?.moncashNumber : null)
      || (methodId === 'natcash' ? (settings as any)?.natcashNumber : null)
      || null;
    const qr = pm?.qrUrl
      || (methodId === 'moncash' ? (settings as any)?.moncashQR : null)
      || (methodId === 'natcash' ? (settings as any)?.natcashQR : null)
      || null;
    return { number, qr, accountName: pm?.accountName || null };
  };

  const resetDeposit = () => {
    setHtgAmount(''); setDepositTxId(''); setDepositMessage('');
    setDepositProofFile(null); setDepositProofPreview(null);
    setDepositCaptchaToken(null); depositCaptchaRef.current?.reset();
    setDepositMethod(WALLET_METHODS[0]);
  };

  const resetWithdraw = () => {
    setWithdrawHTG(''); setWithdrawAccount(''); setWithdrawAccountName('');
    setWithdrawMessage('');
    setWithdrawCaptchaToken(null); withdrawCaptchaRef.current?.reset();
    setWithdrawMethod(WALLET_METHODS[0]);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const htg = parseFloat(htgAmount);
    if (isNaN(htg) || htg <= 0)   { toast.error('Montant invalide.'); return; }
    const usd = htg / rate;
    if (usd < minDeposit)          { toast.error(`Minimum: $${minDeposit.toFixed(2)} USD`); return; }
    if (usd > maxDeposit)          { toast.error(`Maximum: $${maxDeposit.toFixed(2)} USD`); return; }
    if (!depositMethod)            { toast.error('Choisissez une méthode.'); return; }

    // ── SafacilPay: redirect flow (no WhatsApp, no proof) ──────────────────
    if (depositMethod.id === 'safacilpay') {
      setActionLoading(true);
      try {
        const res = await fetch('/api/payments/safacilpay/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id,
            clientName: client.name,
            clientWalletId: client.walletId,
            htgAmount: htg,
            exchangeRate: rate,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.paymentUrl) throw new Error(data.error || 'Erreur SafacilPay.');
        setIsDepositOpen(false);
        resetDeposit();
        window.location.href = data.paymentUrl;
      } catch (err: any) {
        toast.error(err.message || 'Erreur SafacilPay.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // ── Autres méthodes : flux WhatsApp classique ───────────────────────────
    if (RECAPTCHA_SITE_KEY && !depositCaptchaToken) { toast.error('Validez le captcha.'); return; }
    setActionLoading(true);
    try {
      let proofImageUrl: string | undefined;
      if (depositProofFile) {
        toast.loading('Téléchargement de la preuve...', { id: 'proof-upload' });
        proofImageUrl = await uploadProofImage(depositProofFile);
        toast.dismiss('proof-upload');
      }
      await submitClientDeposit(
        client!, usd, depositMethod.name, depositTxId || undefined,
        depositCaptchaToken || undefined, depositMessage || undefined,
        htg, rate, proofImageUrl,
      );
      const msg = `Bonjour Phénix 👋,\n\nDemande de *DÉPÔT* :\n`
        + `👤 *${client!.name}* · Wallet: *${client!.walletId}*\n`
        + `💵 *$${usd.toFixed(2)} USD* ≈ *${htg.toLocaleString()} HTG* (taux: ${rate})\n`
        + `💳 Via: *${depositMethod.name}*`
        + (depositTxId   ? `\n🔖 Réf: *${depositTxId}*`          : '')
        + (depositMessage ? `\n💬 ${depositMessage}`                : '')
        + (proofImageUrl  ? `\n🖼️ Preuve: ${proofImageUrl}`        : '')
        + `\n\nMerci de valider mon dépôt. 🙏`;
      openWhatsApp(msg);
      toast.success('Demande envoyée !');
      setIsDepositOpen(false); resetDeposit();
    } catch (err: any) {
      toast.dismiss('proof-upload');
      toast.error(err.message);
      depositCaptchaRef.current?.reset(); setDepositCaptchaToken(null);
    } finally { setActionLoading(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const htg = parseFloat(withdrawHTG);
    if (isNaN(htg) || htg <= 0)   { toast.error('Montant invalide.'); return; }
    const usd = htg / rate;
    if (usd < minWithdraw)         { toast.error(`Minimum: ${Math.round(minWithdraw * rate).toLocaleString()} HTG`); return; }
    if (usd > maxWithdraw)         { toast.error(`Maximum: ${Math.round(maxWithdraw * rate).toLocaleString()} HTG`); return; }
    if (usd > balance)             { toast.error('Solde insuffisant.'); return; }
    if (!withdrawMethod)           { toast.error('Choisissez une méthode.'); return; }
    if (!withdrawAccount)          { toast.error('Numéro de réception requis.'); return; }
    if (RECAPTCHA_SITE_KEY && !withdrawCaptchaToken) { toast.error('Validez le captcha.'); return; }
    setActionLoading(true);
    try {
      await submitClientWithdrawal(
        client!, usd, withdrawMethod.name, withdrawAccount,
        withdrawCaptchaToken || undefined, withdrawMessage || undefined,
        withdrawAccountName || undefined, rate,
      );
      const msg = `Bonjour Phénix 👋,\n\nDemande de *RETRAIT* :\n`
        + `👤 *${client!.name}* · Wallet: *${client!.walletId}*\n`
        + `💰 *${htg.toLocaleString()} HTG* ≈ *$${usd.toFixed(2)} USD* (taux: ${rate})\n`
        + `💳 Via: *${withdrawMethod.name}* · Compte: *${withdrawAccount}*`
        + (withdrawAccountName ? `\n👤 Bénéf: *${withdrawAccountName}*` : '')
        + (withdrawMessage     ? `\n💬 ${withdrawMessage}`               : '')
        + `\n\nMerci de traiter ma demande. 🙏`;
      openWhatsApp(msg);
      toast.success('Demande soumise !');
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
    } catch { toast.error("Impossible de supprimer."); }
    finally { setIsDeletingHistory(false); }
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Header gradient ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-4 pt-5 pb-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full border border-white/10" />

        <div className="relative flex items-center justify-between mb-5">
          <button onClick={onBack}
            className="h-9 w-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-white font-black text-base tracking-tight">Mon Wallet</p>
          <button onClick={onLogout}
            className="h-9 w-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <div className="relative text-center">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Solde total</p>
          <p className="text-white font-black text-4xl tracking-tight">
            {balanceHidden ? '• • • • •' : `$${balance.toFixed(2)}`}
          </p>
          {!balanceHidden && (
            <p className="text-white/40 text-sm font-semibold mt-0.5">
              ≈ {Math.round(balance * rate).toLocaleString()} HTG
            </p>
          )}
          <button onClick={() => setBalanceHidden(v => !v)} className="mt-2 text-white/40 hover:text-white/70 transition-colors mx-auto block">
            {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-md mx-auto px-4 -mt-14 pb-28 space-y-4">

        {/* Virtual card */}
        {loading ? (
          <div className="w-full rounded-[1.75rem] bg-violet-300/50 flex items-center justify-center shadow-xl"
            style={{ aspectRatio: '1.75/1' }}>
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : client ? (
          <VirtualCard client={client} balance={balance} rate={rate}
            copied={copied} onCopy={copyWalletId}
            hidden={balanceHidden} onToggleHide={() => setBalanceHidden(v => !v)} />
        ) : null}

        {/* Stats strip */}
        {client && (
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Solde USD', value: `$${balance.toFixed(2)}` },
              { label: 'En HTG',   value: Math.round(balance * rate).toLocaleString() },
              { label: 'Taux',     value: `1$ = ${rate}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{label}</p>
                <p className="font-black text-gray-900 text-sm mt-0.5 leading-tight">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setIsDepositOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/10" />
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-white text-sm">Déposer</span>
            <span className="text-white/60 text-[10px]">HTG → USD</span>
          </button>
          <button onClick={() => setIsWithdrawOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-red-200 hover:from-rose-600 hover:to-red-700 transition-all active:scale-95 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/10" />
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpFromLine className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-white text-sm">Retirer</span>
            <span className="text-white/60 text-[10px]">USD → HTG</span>
          </button>
        </div>

        {/* Accepted methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthodes acceptées</p>
          </div>
          <div className="p-4 flex items-center justify-around">
            {WALLET_METHODS.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1.5">
                <MethodLogo logoUrl={getLogoUrl(m.id)} FallbackIcon={m.Icon} size={48} />
                <span className="text-[10px] font-bold text-gray-500">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-100">
          <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-violet-600" />
          </div>
          <p className="text-xs text-violet-700 leading-relaxed">
            Toutes les transactions sont vérifiées par notre équipe sous 24h. Vos fonds sont sécurisés.
          </p>
        </div>

        {/* Transaction history */}
        <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <button onClick={() => setHistoryOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historique</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-300 ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {historyOpen && (
              <motion.div key="hist"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-3 space-y-2">
                  {txLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-violet-400" /></div>
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
                        return (
                          <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                              {isCredit
                                ? <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                                : <ArrowUpFromLine className="h-4 w-4 text-red-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-800 truncate">{typeLabel[tx.type] || tx.type}</p>
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
                                <p className="text-[10px] text-gray-400">≈ {Math.round(htgEq).toLocaleString()} HTG</p>
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

      {/* ── DEPOSIT DIALOG ─────────────────────────────────────────────── */}
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
          <form onSubmit={handleDeposit} className="p-5 space-y-4 bg-gray-50 overflow-y-auto flex-1">

            {/* Method selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthode de paiement</Label>
              <div className="grid grid-cols-3 gap-2">
                {WALLET_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setDepositMethod(m)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all ${depositMethod.id === m.id ? m.activeDeposit : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <MethodLogo logoUrl={getLogoUrl(m.id)} FallbackIcon={m.Icon} size={40} />
                    <span className="text-[10px] font-black text-gray-700">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account info after selection */}
            {(() => {
              const { number, qr, accountName } = getMethodInfo(depositMethod.id);
              if (!number && !qr) return null;
              return (
                <div className="rounded-2xl overflow-hidden border border-emerald-100">
                  <div className="px-4 py-2 bg-emerald-600">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Compte {depositMethod.name}</p>
                  </div>
                  <div className="p-3 space-y-2 bg-emerald-50">
                    {number && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-emerald-100">
                        <div className="min-w-0">
                          {accountName && <p className="text-[11px] font-bold text-gray-600">{accountName}</p>}
                          <p className="font-black text-gray-900 font-mono text-base tracking-wider">{number}</p>
                        </div>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(number); toast.success('Copié !'); }}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 shrink-0">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {qr && (
                      <div className="flex justify-center bg-white rounded-xl p-3 border border-emerald-100">
                        <img src={qr} alt="QR" className="h-28 w-28 object-contain rounded-lg"
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant envoyé (HTG)</Label>
              <Input type="number" value={htgAmount} onChange={e => setHtgAmount(e.target.value)}
                placeholder="Ex: 1 350" className="h-12 rounded-xl text-lg font-black" min="1" step="1" required />
              {usdPreview > 0 && (
                <div className="rounded-xl border border-emerald-100 overflow-hidden text-sm">
                  <div className="flex justify-between px-3 py-2 bg-white border-b border-emerald-50">
                    <span className="text-gray-500">Montant déposé</span>
                    <span className="font-black">${usdPreview.toFixed(2)}</span>
                  </div>
                  {depositFeeAmount > 0 && (
                    <div className="flex justify-between px-3 py-2 bg-white border-b border-emerald-50">
                      <span className="text-red-500">{depositFeeLabel}</span>
                      <span className="font-black text-red-500">−${depositFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 bg-emerald-50">
                    <span className="font-black text-emerald-800 text-xs uppercase tracking-wide">Vous recevrez</span>
                    <span className="font-black text-emerald-700">${depositNetAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Champs manuels — masqués pour SafacilPay */}
            {depositMethod.id !== 'safacilpay' && (
              <>
                <ProofUpload
                  file={depositProofFile} preview={depositProofPreview}
                  onChange={(f, p) => { setDepositProofFile(f); setDepositProofPreview(p); }}
                  accent="emerald"
                />

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Référence / ID transaction</Label>
                  <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)}
                    placeholder="Ex: TX-1234567890" className="h-11 rounded-xl font-mono" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message (optionnel)</Label>
                  <textarea value={depositMessage} onChange={e => setDepositMessage(e.target.value)}
                    placeholder="Informations supplémentaires..."
                    className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all"
                    maxLength={300} />
                  <p className="text-[10px] text-gray-400">{depositMessage.length}/300</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700"><strong>Étape suivante :</strong> Vous serez redirigé sur WhatsApp pour confirmer.</p>
                </div>

                {RECAPTCHA_SITE_KEY && (
                  <div className="flex flex-col items-center">
                    <CaptchaWidget sitekey={RECAPTCHA_SITE_KEY} captchaRef={depositCaptchaRef}
                      onChange={t => setDepositCaptchaToken(t)} onExpired={() => setDepositCaptchaToken(null)} />
                  </div>
                )}
              </>
            )}

            {/* Panneau SafacilPay */}
            {depositMethod.id === 'safacilpay' && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Paiement sécurisé en ligne</p>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Vous serez redirigé vers SafacilPay pour finaliser le paiement. Votre solde est crédité <strong>automatiquement</strong> dès confirmation — aucune validation manuelle requise.
                </p>
              </div>
            )}

            <Button type="submit"
              disabled={actionLoading || !client || !depositMethod || (depositMethod.id !== 'safacilpay' && !!RECAPTCHA_SITE_KEY && !depositCaptchaToken)}
              className={`w-full h-12 rounded-xl font-black text-white border-0 transition-all ${
                depositMethod.id === 'safacilpay'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}>
              {actionLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : depositMethod.id === 'safacilpay'
                  ? 'Payer avec SafacilPay →'
                  : 'Confirmer et envoyer →'
              }
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── WITHDRAWAL DIALOG ──────────────────────────────────────────── */}
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
          <form onSubmit={handleWithdraw} className="p-5 space-y-4 bg-gray-50 overflow-y-auto flex-1">

            {/* Method selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthode de retrait</Label>
              <div className="grid grid-cols-3 gap-2">
                {WALLET_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setWithdrawMethod(m)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all ${withdrawMethod.id === m.id ? m.activeWithdraw : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <MethodLogo logoUrl={getLogoUrl(m.id)} FallbackIcon={m.Icon} size={40} />
                    <span className="text-[10px] font-black text-gray-700">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant à retirer (HTG)</Label>
              <Input type="number" value={withdrawHTG} onChange={e => setWithdrawHTG(e.target.value)}
                placeholder="Ex: 1 350" className="h-12 rounded-xl text-lg font-black"
                min="1" max={Math.floor(balance * rate)} step="1" required />
              {withdrawHTGNum > 0 && (
                <div className="rounded-xl border border-red-100 overflow-hidden text-sm">
                  <div className="flex justify-between px-3 py-2 bg-white border-b border-red-50">
                    <span className="text-gray-500">Montant demandé</span>
                    <span className="font-black">
                      {withdrawHTGNum.toLocaleString()} HTG
                      <span className="text-[10px] font-medium text-gray-400 ml-1">≈ ${withdrawUSDNum.toFixed(2)}</span>
                    </span>
                  </div>
                  {withdrawFeeHTG > 0 && (
                    <div className="flex justify-between px-3 py-2 bg-white border-b border-red-50">
                      <span className="text-red-500">{withdrawFeeLabel || `Frais`}</span>
                      <span className="font-black text-red-500">−{withdrawFeeHTG.toLocaleString()} HTG</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 bg-red-50">
                    <span className="font-black text-red-800 text-xs uppercase tracking-wide">Vous recevrez</span>
                    <span className="font-black text-red-700">
                      {withdrawNetHTG.toLocaleString()} HTG
                      <span className="text-[10px] font-medium text-gray-400 ml-1">≈ ${withdrawNetAmount.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Receiving account */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Numéro / Compte de réception</Label>
              <Input value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)}
                placeholder="Numéro de réception" className="h-11 rounded-xl" required />
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
                className="w-full min-h-[60px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
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
              disabled={actionLoading || !client || !withdrawMethod || (!!RECAPTCHA_SITE_KEY && !withdrawCaptchaToken)}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Success modal ──────────────────────────────────────────────── */}
      {txSuccessModal && (
        <Dialog open={true} onOpenChange={() => setTxSuccessModal(null)}>
          <DialogContent className="max-w-sm rounded-3xl border-0 p-0 overflow-hidden shadow-2xl">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
              <div className={`p-8 text-center ${txSuccessModal.type === 'deposit' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-violet-500 to-purple-700'}`}>
                <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white">Transaction réussie !</h2>
                <p className="text-5xl font-black text-white mt-3">
                  {Math.round(txSuccessModal.htg).toLocaleString()} <span className="text-2xl opacity-60">HTG</span>
                </p>
                <p className="text-white/55 text-sm font-bold mt-1.5">≈ ${Number(txSuccessModal.usd).toFixed(2)} USD</p>
              </div>
              <div className="bg-white p-6 text-center space-y-4">
                <p className="text-gray-600 text-sm">
                  {txSuccessModal.type === 'deposit' ? 'Votre dépôt a été crédité sur votre compte.' : 'Votre retrait a été traité avec succès.'} Merci de faire confiance à Phénix ! 🙏
                </p>
                <Button onClick={() => setTxSuccessModal(null)}
                  className={`w-full h-12 rounded-2xl font-black border-0 text-white ${txSuccessModal.type === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-500 hover:bg-violet-600'}`}>
                  Fermer
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
