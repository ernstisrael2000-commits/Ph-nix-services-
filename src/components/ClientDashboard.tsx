import React, { useState } from 'react';
import { 
  Wallet, ArrowDownToLine, ArrowUpFromLine, History, 
  LogOut, Loader2, X, Copy, CheckCircle2, AlertCircle,
  ArrowRightLeft, Clock, XCircle, TrendingUp, Shield,
  ChevronRight, Banknote, CreditCard, Smartphone
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useClientData, useClientTransactions, submitClientDeposit, submitClientWithdrawal } from '../services/clientService';
import { useSettings } from '../services/parcelService';
import { Client, ClientTransaction } from '../types';

interface ClientDashboardProps {
  clientId: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = "+50944813185";

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approuvé', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  completed: { label: 'Complété', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const typeLabel = {
  deposit: 'Dépôt',
  withdrawal: 'Retrait',
  purchase: 'Achat',
  transfer_received: 'Reçu',
  refund: 'Remboursement',
};

export default function ClientDashboard({ clientId, onLogout, open, onClose }: ClientDashboardProps) {
  const { client, loading } = useClientData(clientId);
  const { transactions, loading: txLoading } = useClientTransactions(clientId);
  const { settings } = useSettings();

  const [tab, setTab] = useState<'wallet' | 'history'>('wallet');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<string>('MonCash');
  const [depositTxId, setDepositTxId] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<string>('MonCash');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  const exchangeRate = settings?.exchangeRate || 146;
  const methodInfo = {
    MonCash: { number: settings?.moncashNumber, qr: settings?.moncashQR },
    NatCash: { number: settings?.natcashNumber, qr: settings?.natcashQR },
    Admi:    { number: settings?.admiNumber,    qr: settings?.admiQR    },
  } as Record<string, { number?: string; qr?: string }>;

  const copyWalletId = () => {
    if (client?.walletId) {
      navigator.clipboard.writeText(client.walletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("ID Wallet copié !");
    }
  };

  const openWhatsApp = (message: string) => {
    const num = settings?.whatsappAdminNumber || WHATSAPP_NUMBER;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Montant invalide."); return; }
    setActionLoading(true);
    try {
      await submitClientDeposit(client!, amount, depositMethod, depositTxId || undefined);
      const info = methodInfo[depositMethod];
      const usdEquiv = (amount / exchangeRate).toFixed(2);
      const msg = `Bonjour Neopay,\n\nJe souhaite effectuer un *DÉPÔT*:\n👤 Nom: *${client!.name}*\n🔑 ID Wallet: *${client!.walletId}*\n💰 Montant: *${amount.toLocaleString()} HTG*\n≈ *$${usdEquiv} USD*\n💳 Via: *${depositMethod}*${info?.number ? `\n📞 Numéro: *${info.number}*` : ''}${depositTxId ? `\n🔖 ID Transaction: *${depositTxId}*` : ''}\n\nMerci de valider mon dépôt.`;
      openWhatsApp(msg);
      toast.success("Demande de dépôt envoyée ! En attente de validation admin.");
      setIsDepositOpen(false);
      setDepositAmount('');
      setDepositTxId('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Montant invalide."); return; }
    setActionLoading(true);
    try {
      await submitClientWithdrawal(client!, amount, withdrawMethod, withdrawAccount);
      toast.success(`Demande envoyée, ${client!.name} ! Vous recevrez votre argent tout à l'heure. ✅`);
      setIsWithdrawOpen(false);
      setWithdrawAmount(''); setWithdrawAccount('');
      const num = settings?.whatsappAdminNumber || WHATSAPP_NUMBER;
      const usdEquiv = (amount / (settings?.exchangeRate || 146)).toFixed(2);
      const msg = `Bonjour Neopay 👋,\n\nJe viens de soumettre une demande de *RETRAIT* :\n\n👤 Nom : *${client!.name}*\n🔑 ID Wallet : *${client!.walletId}*\n💰 Montant : *${amount.toLocaleString()} HTG* (~$${usdEquiv} USD)\n💳 Via : *${withdrawMethod}*\n📞 Compte : *${withdrawAccount}*\n\nMerci de traiter ma demande. 🙏`;
      window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-[#D98A1E] p-6 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white/20 animate-pulse" />
              <div className="space-y-2"><div className="h-4 w-32 bg-white/20 rounded animate-pulse" /><div className="h-3 w-20 bg-white/20 rounded animate-pulse" /></div>
            </div>
          ) : client ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-2xl font-black">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-lg leading-tight">{client.name}</p>
                  <p className="text-white/70 text-xs">{client.email}</p>
                </div>
              </div>
              <div className="bg-white/15 rounded-2xl p-4 border border-white/20">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Solde disponible</p>
                <p className="text-4xl font-black">{(client.balance || 0).toLocaleString()} <span className="text-xl font-bold opacity-70">HTG</span></p>
                <p className="text-primary text-sm font-bold mt-1">
                  ≈ ${((client.balance || 0) / (settings?.exchangeRate || 146)).toFixed(2)} <span className="text-white/40 text-xs font-normal">USD</span>
                  <span className="text-white/30 text-xs font-normal ml-2">· taux {settings?.exchangeRate || 146} HTG/$</span>
                </p>
                <button onClick={copyWalletId} className="flex items-center gap-2 mt-3 text-white/60 hover:text-white text-xs transition-colors group">
                  <span className="font-mono bg-white/10 px-2 py-1 rounded-lg">ID: {client.walletId}</span>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Tab Bar */}
        <div className="flex border-b bg-gray-50 shrink-0">
          <button onClick={() => setTab('wallet')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'wallet' ? 'text-primary border-b-2 border-primary bg-white' : 'text-subtext hover:text-dark'}`}>
            <Wallet className="h-4 w-4 inline mr-1.5" />Wallet
          </button>
          <button onClick={() => setTab('history')} className={`flex-1 py-3 text-sm font-bold transition-colors relative ${tab === 'history' ? 'text-primary border-b-2 border-primary bg-white' : 'text-subtext hover:text-dark'}`}>
            <History className="h-4 w-4 inline mr-1.5" />Historique
            {pendingCount > 0 && (
              <span className="absolute top-2 right-8 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {tab === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsDepositOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-300 transition-all group active:scale-95">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
                      <ArrowDownToLine className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-sm text-emerald-700">Déposer</span>
                  </button>
                  <button onClick={() => setIsWithdrawOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-50 border-2 border-red-100 hover:border-red-300 transition-all group active:scale-95">
                    <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                      <ArrowUpFromLine className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-sm text-red-700">Retirer</span>
                  </button>
                </div>

                {/* Payment Methods Info */}
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-black text-subtext uppercase tracking-widest">Moyens de paiement acceptés</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[
                      { name: 'MonCash', number: settings?.moncashNumber, icon: <Smartphone className="h-5 w-5 text-primary" /> },
                      { name: 'NatCash', number: settings?.natcashNumber, icon: <CreditCard className="h-5 w-5 text-blue-500" /> },
                      { name: 'Admi', number: settings?.admiNumber, icon: <Banknote className="h-5 w-5 text-emerald-600" /> },
                    ].map(m => (
                      <div key={m.name} className="flex items-center justify-between px-4 py-3 bg-white">
                        <div className="flex items-center gap-3">
                          {m.icon}
                          <span className="font-bold text-sm text-dark">{m.name}</span>
                        </div>
                        {m.number ? (
                          <span className="text-xs font-mono text-subtext bg-gray-50 px-2 py-1 rounded-lg">{m.number}</span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Non configuré</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security note */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Les dépôts et retraits sont vérifiés par notre équipe dans les 24h. Toute transaction est sécurisée par Neopay.
                  </p>
                </div>
              </motion.div>
            )}

            {tab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5">
                {txLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-subtext font-medium">Aucune transaction pour le moment.</p>
                    <p className="text-xs text-gray-400 mt-1">Effectuez un dépôt pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => {
                      const sc = statusConfig[tx.status] || statusConfig.pending;
                      const isCredit = tx.type === 'deposit' || tx.type === 'transfer_received' || tx.type === 'refund';
                      return (
                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            {isCredit 
                              ? <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                              : <ArrowUpFromLine className="h-5 w-5 text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-dark truncate">{typeLabel[tx.type] || tx.type}</p>
                            <p className="text-xs text-subtext truncate">{tx.description || tx.method || ''}</p>
                            {tx.createdAt?.toDate && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {format(tx.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: fr })}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-sm ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isCredit ? '+' : '-'}{tx.amount.toLocaleString()} HTG
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>
                              {sc.icon}{sc.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 shrink-0">
          <Button variant="ghost" onClick={onLogout} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-10">
            <LogOut className="h-4 w-4 mr-2" />Déconnexion
          </Button>
        </div>
      </motion.div>

      {/* Deposit Modal */}
      <Dialog open={isDepositOpen} onOpenChange={(v) => { setIsDepositOpen(v); if (!v) { setDepositAmount(''); setDepositTxId(''); } }}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">Faire un dépôt</DialogTitle>
                <DialogDescription className="text-emerald-100/70 text-xs">Rechargez votre wallet Neopay</DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={handleDeposit} className="p-5 space-y-4 bg-white">
            {/* Method picker */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Méthode de paiement</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'MonCash', icon: '💰', active: 'border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-400' },
                  { id: 'NatCash', icon: '💳', active: 'border-amber-300 bg-amber-50 text-amber-700 ring-2 ring-amber-400' },
                  { id: 'Admi',    icon: '🏦', active: 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400' },
                ].map(m => (
                  <button key={m.id} type="button" onClick={() => setDepositMethod(m.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center ${depositMethod === m.id ? m.active : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] font-black">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method info: number + QR */}
            {methodInfo[depositMethod]?.number && (
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <Smartphone className="h-4 w-4 text-subtext shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-subtext uppercase tracking-wider">Envoyez au numéro</p>
                  <p className="font-black text-dark text-base font-mono">{methodInfo[depositMethod].number}</p>
                </div>
                {methodInfo[depositMethod]?.qr && (
                  <img src={methodInfo[depositMethod].qr} alt="QR Code" className="h-14 w-14 rounded-xl object-cover border border-gray-200" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">Montant (HTG)</Label>
              <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                placeholder="Ex: 1 500" className="h-12 rounded-xl text-lg font-black" min="1" required />
              {depositAmount && !isNaN(parseFloat(depositAmount)) && (
                <p className="text-[11px] text-primary font-bold">≈ ${(parseFloat(depositAmount) / exchangeRate).toFixed(2)} USD</p>
              )}
            </div>

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-subtext uppercase tracking-widest">ID / Référence de transaction</Label>
              <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)}
                placeholder="Ex: TX-1234567890" className="h-11 rounded-xl font-mono" />
              <p className="text-[10px] text-gray-400">Copiez l'ID de confirmation reçu lors du paiement.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
              <strong>Étape suivante :</strong> Après soumission, vous serez redirigé sur WhatsApp pour envoyer votre preuve de paiement à l'équipe Neopay.
            </div>

            <Button type="submit" disabled={actionLoading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmer et envoyer preuve →'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-dark">Retirer des fonds</DialogTitle>
                <DialogDescription className="text-xs text-subtext">Solde: <strong>{(client?.balance || 0).toLocaleString()} HTG</strong></DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Montant (HTG)</Label>
              <Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Ex: 500" className="h-12 rounded-xl text-lg font-bold" min="1" max={client?.balance || 0} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Moyen de retrait</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MonCash">💰 MonCash</SelectItem>
                  <SelectItem value="NatCash">💳 NatCash</SelectItem>
                  <SelectItem value="Admi">🏦 Admi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Numéro de compte</Label>
              <Input value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)}
                placeholder="Votre numéro de réception" className="h-12 rounded-xl" required />
            </div>
            <Button type="submit" disabled={actionLoading}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black">
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Soumettre la demande'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
