import React, { useState, useEffect } from 'react';
import { 
  useAffiliateData, 
  useTopAffiliates, 
  submitWithdrawal, 
  useAffiliateWithdrawals,
  deleteWithdrawalHistory,
  useMonthlyRankings,
  useAllAffiliates,
  getAffiliateLevelInfo,
  useNotifications,
  markNotificationAsRead,
  ensureWalletId,
  submitTransfer,
  submitDepositRequest,
  useWalletTransactions,
  findAffiliateByWalletId
} from '../services/affiliateService';
import { Affiliate, WithdrawalRequest, AffiliateNotification, WalletTransaction, TransactionStatus } from '../types';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  Wallet, 
  Users, 
  Trophy, 
  ArrowUpRight, 
  History, 
  LogOut,
  Loader2,
  AlertCircle,
  TrendingUp,
  Network,
  Bell,
  CheckCircle2,
  Star,
  ChevronRight,
  MapPin,
  ArrowUp,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Send,
  Download,
  AlertTriangle,
  Fingerprint,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSettings } from '../services/parcelService';

interface AffiliateDashboardProps {
  affiliateId: string;
  onLogout: () => void;
}

export default function AffiliateDashboard({ affiliateId, onLogout }: AffiliateDashboardProps) {
  const { affiliate, loading: affiliateLoading } = useAffiliateData(affiliateId);
  const { topAffiliates, loading: topLoading } = useTopAffiliates();
  const { rankings: monthlyRankings, loading: rankingsLoading } = useMonthlyRankings();
  const { affiliates, loading: affiliatesLoading } = useAllAffiliates();
  const { notifications, loading: notificationsLoading } = useNotifications(affiliateId);
  const { transactions, loading: transactionsLoading } = useWalletTransactions(affiliateId);
  const { settings } = useSettings();

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'MonCash' | 'NatCash' | 'Physical'>('MonCash');
  const [accountNumber, setAccountNumber] = useState('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferRecipientWalletId, setTransferRecipientWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [verifiedRecipientName, setVerifiedRecipientName] = useState<string | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('MonCash');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);

  useEffect(() => {
    if (affiliate && !affiliate.walletId) {
      ensureWalletId(affiliate);
    }
  }, [affiliate]);

  // Recipient validation
  useEffect(() => {
    const validate = async () => {
      if (transferRecipientWalletId.length === 8) {
        setIsValidatingRecipient(true);
        const recipient = await findAffiliateByWalletId(transferRecipientWalletId);
        setVerifiedRecipientName(recipient ? recipient.name : null);
        setIsValidatingRecipient(false);
      } else {
        setVerifiedRecipientName(null);
      }
    };
    validate();
  }, [transferRecipientWalletId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyWalletId = () => {
    if (affiliate?.walletId) {
      navigator.clipboard.writeText(affiliate.walletId);
      toast.success("Wallet ID copié !");
    }
  };

  // Memoize ranking position for performance
  const rankingPosition = React.useMemo(() => {
    if (!affiliate) return 0;
    return topAffiliates.findIndex(a => a.id === affiliate.id) + 1;
  }, [topAffiliates, affiliate?.id]);

  const winnersQueue = React.useMemo(() => {
    return [...affiliates]
      .filter(a => (a.points || 0) > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);
  }, [affiliates]);

  const levelInfo = React.useMemo(() => {
    if (!affiliate) return null;
    return getAffiliateLevelInfo(affiliate.points || 0);
  }, [affiliate?.points]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (affiliateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!affiliate) return null;

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    if (amount > affiliate.balance) {
      toast.error("Solde insuffisant.");
      return;
    }

    if (amount < 20) {
      toast.error("Le montant minimum de retrait est de 20 Goud.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitWithdrawal(affiliate, amount, withdrawMethod, withdrawMethod === 'Physical' ? 'Bureau Juvénat' : accountNumber.trim());
      
      toast.success("Demande soumise : En attente de validation par l'admin");
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setAccountNumber('');

      // Send WhatsApp notification to admin
      const adminPhone = settings?.whatsappAdminNumber || "+50944813185";
      const methodText = withdrawMethod === 'Physical' ? 'En personne (Juvénat)' : withdrawMethod;
      const message = `Bonjour Admin, j'ai soumis une demande de retrait Neopay.\n\nMontant: ${amount} Goud\nMéthode: ${methodText}\nNuméro/Lieu: ${withdrawMethod === 'Physical' ? 'Bureau Juvénat' : accountNumber.trim()}\nCode Affilié: ${affiliate.code}\nNom: ${affiliate.name}`;
      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
      
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide.");
      return;
    }
    if (!verifiedRecipientName) {
      toast.error("Bénéficiaire non identifié.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTransfer(affiliate, transferRecipientWalletId, amount);
      toast.success("Transfert réussi");
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferRecipientWalletId('');
    } catch (error: any) {
      toast.error(error.message || "Échec du transfert.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDepositRequest = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDepositRequest(affiliate, amount, depositMethod);
      toast.success("Demande envoyée");
      setIsDepositModalOpen(false);
      setDepositAmount('');
      
      const adminPhone = settings?.whatsappAdminNumber || "+50944813185";
      const message = `Bonjour Admin, je souhaite effectuer un dépôt sur mon compte Neopay.\n\nMontant: ${amount} Goud\nMéthode: ${depositMethod}\nID Wallet: ${affiliate.walletId}\nNom: ${affiliate.name}`;
      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error: any) {
      toast.error(error.message || "Échec de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearTransactionHistory = async () => {
    setIsSubmitting(true);
    try {
      await deleteWithdrawalHistory(affiliateId); // This should ideally clear the transactions too
      // If we want a specific clear transactions:
      // await clearWalletHistory(affiliateId); 
      toast.success("Historique vidé !");
      setIsClearHistoryConfirmOpen(false);
    } catch (error) {
      toast.error("Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'completed': 
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-200">Terminé</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border-red-200">Rejeté</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-amber-200">En attente</Badge>;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'VIP': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'Elite': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'Gold': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Silver': return 'text-gray-600 bg-gray-50 border-gray-100';
      default: return 'text-orange-600 bg-orange-50 border-orange-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NEOPAY Affilié</h1>
            <p className="text-gray-500 font-medium flex items-center gap-2">
              {affiliate.name} 
              <span className="text-gray-300">•</span> 
              <span className="font-mono text-blue-600">{affiliate.code}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="relative p-2 rounded-xl">
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>
            } />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Notifications
                </DialogTitle>
                <DialogDescription>
                  Restez informé de vos gains et de votre progression.
                </DialogDescription>
              </DialogHeader>
              <div className="md:max-h-[60vh] overflow-y-auto py-4 space-y-3 overscroll-contain">
                {notificationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-xl border transition-colors ${n.read ? 'bg-gray-50/50 border-gray-100' : 'bg-blue-50/50 border-blue-100'}`}
                      onClick={() => n.id && markNotificationAsRead(n.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-gray-900">{n.title}</h4>
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'PPp', { locale: fr }) : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Aucune notification pour le moment.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onLogout} className="flex-1 md:flex-none items-center gap-2 rounded-xl border-gray-200">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Hero - Consolidate into a modern Wallet */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-64 w-full max-w-md mx-auto sm:max-w-none sm:h-72 rounded-[2.5rem] bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden p-8 text-white group hover:scale-[1.01] transition-all duration-500"
          >
            {/* Card Texture & Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-900/40" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_55%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_6s_infinite] pointer-events-none" />
            
            <div className="relative h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mb-1 drop-shadow-sm">Neopay Titanium</p>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-11 bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 rounded-md shadow-lg flex flex-col justify-center px-1.5 gap-0.5 overflow-hidden">
                      <div className="h-[1px] w-full bg-black/20" />
                      <div className="h-[1px] w-full bg-black/20" />
                      <div className="h-[1px] w-full bg-black/20" />
                    </div>
                    <span className="text-[10px] font-black text-white/20 tracking-widest flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      SECURE CHIP
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex -space-x-4 opacity-30">
                    <div className="w-10 h-10 rounded-full bg-red-500" />
                    <div className="w-10 h-10 rounded-full bg-orange-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1 h-1 rounded-full bg-white/40" />
                   <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Solde Courant</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <motion.h3 
                    animate={{ textShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 15px rgba(255,255,255,0.3)", "0 0 0px rgba(255,255,255,0)"] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-5xl sm:text-6xl font-black tracking-tight text-white"
                  >
                    {affiliate.balance.toLocaleString()}
                  </motion.h3>
                  <span className="text-lg font-black text-white/30 uppercase tracking-tighter">Goud</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-end gap-2 sm:gap-0">
                <div className="w-full sm:w-auto">
                  <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Account Holder</p>
                  <p className="text-lg font-bold tracking-wider text-white uppercase font-sans">{affiliate.name}</p>
                </div>
                <div className="w-full sm:w-auto text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em]">Wallet Serial</p>
                    <button 
                      onClick={copyWalletId}
                      className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xl font-mono font-medium tracking-[0.3em] text-white/90">
                    {affiliate.walletId ? affiliate.walletId.match(/.{1,4}/g)?.join(' ') : '.... ....'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
              <DialogTrigger render={
                <Button className="h-20 sm:h-24 rounded-[2rem] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-100 flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white group-hover:scale-110 transition-transform">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Dépôt</span>
                </Button>
              } />
              <DialogContent className="rounded-[2.5rem] p-8 border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Recharger mon Compte</DialogTitle>
                  <DialogDescription className="font-medium">
                    Alimentez votre solde Neopay via l'un de nos partenaires.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Méthode de Recharge</Label>
                    <Select value={depositMethod} onValueChange={setDepositMethod}>
                      <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                        <SelectValue placeholder="Méthode" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-0 shadow-xl">
                        <SelectItem value="MonCash" className="font-bold">MonCash (Digicel)</SelectItem>
                        <SelectItem value="NatCash" className="font-bold">NatCash (Natcom)</SelectItem>
                        <SelectItem value="Physical" className="font-bold">Bureau / Proxy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant Souhaité (Goud)</Label>
                    <div className="relative">
                       <Input 
                         type="number" 
                         placeholder="Ex: 500" 
                         value={depositAmount}
                         onChange={(e) => setDepositAmount(e.target.value)}
                         className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black text-xl pl-12"
                       />
                       <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                      L'admin vous contactera sur WhatsApp pour valider le transfert effectif avant de créditer votre compte.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleDepositRequest} disabled={isSubmitting} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer la Demande"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
              <DialogTrigger render={
                <Button className="h-20 sm:h-24 rounded-[2rem] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-indigo-100 flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group">
                  <div className="p-2 rounded-xl bg-indigo-500 text-white group-hover:scale-110 transition-transform">
                    <MinusCircle className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Retrait</span>
                </Button>
              } />
              <DialogContent className="rounded-[2.5rem] p-8 border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Retrait de Fonds</DialogTitle>
                  <DialogDescription className="font-medium">
                    Choisissez votre méthode de retrait préférée.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Méthode de Retrait</Label>
                    <Select value={withdrawMethod} onValueChange={(v: any) => setWithdrawMethod(v)}>
                      <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                        <SelectValue placeholder="Méthode" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-0 shadow-xl">
                        <SelectItem value="MonCash" className="font-bold">MonCash</SelectItem>
                        <SelectItem value="NatCash" className="font-bold">NatCash</SelectItem>
                        <SelectItem value="Physical" className="font-bold">Retrait Physique (Bureau Juvénat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {withdrawMethod !== 'Physical' && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Numéro {withdrawMethod}</Label>
                      <Input 
                        placeholder="Ex: 44XXXXXX" 
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black text-xl"
                      />
                    </div>
                  )}

                  {withdrawMethod === 'Physical' && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                        Le retrait physique s'effectue à notre bureau de Juvénat sur présentation d'une pièce d'identité.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant (Goud)</Label>
                    <div className="relative">
                       <Input 
                         type="number" 
                         placeholder="Min 20.00" 
                         value={withdrawAmount}
                         onChange={(e) => setWithdrawAmount(e.target.value)}
                         className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black text-xl pl-12"
                       />
                       <MinusCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold ml-1">Solde disponible : {affiliate.balance} Goud</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleWithdraw} disabled={isSubmitting} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmer le Retrait"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
              <DialogTrigger render={
                <Button className="h-20 sm:h-24 rounded-[2rem] bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-100 flex flex-col items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group">
                  <div className="p-2 rounded-xl bg-blue-500 text-white group-hover:scale-110 transition-transform">
                    <ArrowRightLeft className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Transfert</span>
                </Button>
              } />
              <DialogContent className="rounded-[2.5rem] p-8 border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Transfert Entre Affiliés</DialogTitle>
                  <DialogDescription className="font-medium">
                    Envoyez des Goud instantanément à un autre membre Neopay.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Wallet du Destinataire</Label>
                    <div className="relative">
                       <Input 
                         maxLength={8}
                         placeholder="8 Chiffres" 
                         value={transferRecipientWalletId}
                         onChange={(e) => setTransferRecipientWalletId(e.target.value)}
                         className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black text-lg tracking-[0.2em] pl-12"
                       />
                       <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                       {isValidatingRecipient && (
                         <div className="absolute right-4 top-1/2 -translate-y-1/2">
                           <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                         </div>
                       )}
                    </div>
                    {verifiedRecipientName && (
                      <p className="text-[10px] text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                         Destinataire identifié : <span className="uppercase">{verifiedRecipientName}</span>
                      </p>
                    )}
                    {!verifiedRecipientName && transferRecipientWalletId.length === 8 && !isValidatingRecipient && (
                      <p className="text-[10px] text-red-500 font-bold bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                         Aucun affilié trouvé avec cet ID.
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant à Envoyer (Goud)</Label>
                    <div className="relative">
                       <Input 
                         type="number" 
                         placeholder="0.00" 
                         value={transferAmount}
                         onChange={(e) => setTransferAmount(e.target.value)}
                         className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black text-xl pl-12"
                       />
                       <Send className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold">Solde disponible : {affiliate.balance} Goud</p>
                  </div>
                </div>
                <DialogFooter className="flex-col gap-3">
                  <Button onClick={handleTransfer} disabled={isSubmitting || !verifiedRecipientName} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmer le Transfert"}
                  </Button>
                  <p className="text-[9px] text-center text-gray-400 font-medium">L'argent sera déduit immédiatement après confirmation.</p>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Global Income Summary Card */}
        <Card className="border-0 shadow-2xl bg-dark text-white rounded-[2.5rem] overflow-hidden relative p-8 flex flex-col justify-between group">
           <div className="absolute top-0 right-0 p-8">
              <TrendingUp className="h-8 w-8 text-white/10 group-hover:rotate-12 transition-transform" />
           </div>
           
           <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Récapitulatif Revenus</p>
                <div className="space-y-5">
                  <div className="flex justify-between items-center py-4 border-b border-white/5 group/row">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 transition-colors group-hover/row:bg-orange-500 group-hover/row:text-white">
                         <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase">Total Gagné</p>
                        <p className="text-xl font-black">{affiliate.totalEarnings || 0} <span className="text-[10px] opacity-40">G</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 border-b border-white/5 group/row">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 transition-colors group-hover/row:bg-emerald-500 group-hover/row:text-white">
                         <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase">Gains Directs</p>
                        <p className="text-xl font-black">{affiliate.directRevenue || 0} <span className="text-[10px] opacity-40">G</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 group/row">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 transition-colors group-hover/row:bg-blue-500 group-hover/row:text-white">
                         <ArrowUpRight className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase">Total Retiré</p>
                        <p className="text-xl font-black text-blue-400">{affiliate.totalWithdrawn || 0} <span className="text-[10px] opacity-40">G</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
           </div>

           <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-black">{affiliate.referredClients || 0} <span className="text-xs text-white/40">Clients</span></span>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-black">{affiliate.points || 0} <span className="text-xs text-white/40">Points</span></span>
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Rankings & Prizes */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden rounded-[2.5rem]">
          <CardHeader className="bg-gray-50/50 border-b p-8">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                    <Trophy className="h-6 w-6" />
                  </div>
                  Élite de la Communauté
                </CardTitle>
                <CardDescription className="font-bold text-gray-400">Les leaders qui dominent le marché cette saison.</CardDescription>
              </div>
              <Badge variant="outline" className="h-8 px-4 rounded-full bg-amber-50 text-amber-700 border-amber-200 font-black text-[10px] uppercase tracking-widest animate-pulse">
                Live Ranking
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {rankingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : (
              <div className="space-y-12">
                {/* Responsive Podium */}
                <div className="flex flex-col sm:flex-row items-end justify-center gap-6 pt-8 max-w-sm mx-auto sm:max-w-none">
                  {/* 2nd Place */}
                  <div className="flex-1 w-full order-2 sm:order-1 flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[1.25rem] bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden shadow-inner font-black text-gray-300">
                        {(monthlyRankings[1] || winnersQueue[1])?.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-gray-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-md">2</div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-sm text-dark truncate w-24">{(monthlyRankings[1] || winnersQueue[1])?.name || '...'}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase">250 G Bonus</p>
                    </div>
                    <div className="w-full h-16 bg-gray-50 rounded-t-2xl border-x border-t border-gray-100" />
                  </div>

                  {/* 1st Place */}
                  <div className="flex-1 w-full order-1 sm:order-2 flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[1.75rem] bg-amber-50 border-4 border-amber-300 flex items-center justify-center overflow-hidden shadow-xl font-black text-amber-600 text-2xl">
                        {(monthlyRankings[0] || winnersQueue[0])?.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 border-white shadow-lg">1</div>
                      <Trophy className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-8 text-amber-500 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-lg text-dark truncate w-32">{(monthlyRankings[0] || winnersQueue[0])?.name || '...'}</p>
                      <p className="text-xs font-black text-amber-600 uppercase">500 G Bonus Gold</p>
                    </div>
                    <div className="w-full h-28 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-3xl shadow-xl shadow-amber-200" />
                  </div>

                  {/* 3rd Place */}
                  <div className="flex-1 w-full order-3 sm:order-3 flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[1.25rem] bg-orange-50/50 border-2 border-orange-100 flex items-center justify-center overflow-hidden shadow-inner font-black text-orange-200">
                        {(monthlyRankings[2] || winnersQueue[2])?.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-md">3</div>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-sm text-dark truncate w-24">{(monthlyRankings[2] || winnersQueue[2])?.name || '...'}</p>
                      <p className="text-[10px] font-black text-orange-400 uppercase">150 G Bonus</p>
                    </div>
                    <div className="w-full h-12 bg-orange-50 rounded-t-2xl border-x border-t border-orange-100" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Récapitulatif des Performances</h4>
                  {(monthlyRankings.length > 0 ? monthlyRankings : winnersQueue).map((a, idx) => (
                    <div key={a.id} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
                      <div className="flex items-center gap-5">
                        <span className="text-2xl font-black text-gray-200 group-hover:text-blue-500 transition-colors">#{idx + 1}</span>
                        <div>
                          <p className="font-black text-dark text-lg">{a.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="text-[10px] font-black px-2.5 h-5 bg-blue-600 text-white border-0 shadow-sm shadow-blue-200">
                              {a.points || 0} PTS
                            </Badge>
                            <span className="text-[11px] font-bold text-gray-400 tracking-tight">{a.monthlySales || 0} Goud produits</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-emerald-600">
                          {idx === 0 ? '+500 G' : idx === 1 ? '+250 G' : '+150 G'}
                        </p>
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Commission Spéciale</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unified Transaction History */}
        <Card className="border-0 shadow-xl bg-white rounded-[2.5rem] flex flex-col">
          <CardHeader className="bg-gray-50/50 border-b p-8">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-3 text-lg font-black">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-sm">
                    <History className="h-5 w-5" />
                  </div>
                  Opérations Récentes
                </CardTitle>
                <CardDescription className="font-bold">Dépôts, retraits et transferts.</CardDescription>
              </div>
              {transactions.length > 0 && (
                <Dialog open={isClearHistoryConfirmOpen} onOpenChange={setIsClearHistoryConfirmOpen}>
                  <DialogTrigger render={
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 h-10 rounded-xl text-[10px] font-black uppercase px-4">
                      <AlertCircle className="h-4 w-4 mr-1.5" />
                      Vider
                    </Button>
                  } />
                  <DialogContent className="max-w-sm rounded-[2.5rem] p-8 border-0 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-xl font-black">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        Action Critique
                      </DialogTitle>
                      <DialogDescription className="font-bold py-2 text-gray-500">
                        Cette opération supprimera définitivement votre historique d'opérations.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-3 mt-6">
                      <Button variant="outline" onClick={() => setIsClearHistoryConfirmOpen(false)} className="h-12 rounded-2xl font-bold flex-1 border-gray-100">Retour</Button>
                      <Button variant="destructive" onClick={handleClearTransactionHistory} disabled={isSubmitting} className="h-12 rounded-2xl font-black bg-red-600 flex-1 hover:bg-red-700 shadow-lg shadow-red-200">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Effacer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[800px] custom-scrollbar">
            {transactionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {transactions.map((t) => (
                  <div key={t.id} className="p-6 hover:bg-gray-50/50 transition-all group border-l-4 border-transparent hover:border-blue-500">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          t.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' :
                          t.type === 'withdrawal' ? 'bg-indigo-50 text-indigo-600' :
                          t.type === 'transfer_sent' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {t.type === 'deposit' && <PlusCircle className="h-6 w-6" />}
                          {t.type === 'withdrawal' && <MinusCircle className="h-6 w-6" />}
                          {t.type === 'transfer_sent' && <Send className="h-6 w-6" />}
                          {t.type === 'transfer_received' && <Download className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-black text-lg text-dark leading-none">
                            {t.type === 'transfer_sent' || t.type === 'withdrawal' ? '-' : '+'}
                            {t.amount.toLocaleString()} G
                          </p>
                          <p className="text-xs font-bold text-gray-500 mt-1">{t.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[10px] font-black text-gray-400">
                               {t.createdAt?.toDate ? format(t.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: fr }) : ''}
                             </span>
                             {t.method && (
                               <Badge variant="outline" className="h-4 text-[8px] font-black uppercase bg-gray-50 border-gray-100">
                                 {t.method}
                               </Badge>
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="scale-90 origin-right">
                        {getTransactionStatusBadge(t.status)}
                      </div>
                    </div>
                    {t.status === 'rejected' && t.rejectionReason && (
                      <div className="mt-4 p-4 bg-red-50/50 rounded-2xl text-xs text-red-600 flex items-start gap-3 border border-red-100 font-medium">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p><span className="font-black uppercase text-[10px] block mb-1">Motif du rejet</span> {t.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 text-gray-400">
                <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Fingerprint className="h-10 w-10 opacity-10" />
                </div>
                <p className="font-black text-dark text-lg">Aucune opération</p>
                <p className="text-sm font-medium mt-1">Vos finances apparaîtront ici.</p>
              </div>
            )}
          </CardContent>
          <div className="p-6 bg-gray-50/30 border-t text-center">
            <Button variant="ghost" className="w-full h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all">
              Générer un Relevé
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
      {/* Back to Top Button */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0 }}
        className="fixed bottom-6 right-6 z-50 pointer-events-none"
      >
        <Button 
          onClick={scrollToTop}
          className="pointer-events-auto h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}

