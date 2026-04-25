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
  markNotificationAsRead
} from '../services/affiliateService';
import { Affiliate, WithdrawalRequest, AffiliateNotification } from '../types';
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
  ArrowUp
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
  const { withdrawals, loading: withdrawalsLoading } = useAffiliateWithdrawals(affiliateId);
  const { notifications, loading: notificationsLoading } = useNotifications(affiliateId);
  const { settings } = useSettings();

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'MonCash' | 'NatCash' | 'Physical'>('MonCash');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);

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
      toast.error("Le montant minimum est de 20 Goud.");
      return;
    }

    if (withdrawMethod !== 'Physical' && !accountNumber.trim()) {
      toast.error(`Veuillez entrer votre numéro ${withdrawMethod}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitWithdrawal(affiliate, amount, withdrawMethod, withdrawMethod === 'Physical' ? 'Bureau Juvénat' : accountNumber.trim());
      toast.success("Demande de retrait envoyée !");
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

  const handleClearWithdrawalHistory = async () => {
    setIsSubmitting(true);
    try {
      await deleteWithdrawalHistory(affiliateId);
      toast.success("Historique des retraits supprimé !");
      setIsClearHistoryConfirmOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'historique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-200">Approuvé</Badge>;
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

      {/* Level Progress Section */}
      {levelInfo && (
        <Card className="border-0 shadow-xl bg-white overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${getLevelColor(levelInfo.level)}`}>
                  <Star className="h-10 w-10 fill-current" />
                </div>
                <div>
                  <Badge className={`font-bold uppercase tracking-wider ${getLevelColor(levelInfo.level)}`}>
                    Niveau {levelInfo.level}
                  </Badge>
                  <p className="text-xs text-gray-400 font-medium mt-1">{affiliate.points || 0} Points</p>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Progression du Niveau</h3>
                    <p className="text-sm text-gray-500">
                      {levelInfo.nextThreshold === Infinity 
                        ? "Vous avez atteint le niveau maximum !" 
                        : `Plus que ${Math.max(0, levelInfo.nextThreshold - (affiliate.points || 0))} points pour le niveau suivant`}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{Math.round(levelInfo.progress)}%</span>
                </div>
                <Progress value={levelInfo.progress} className="h-3 bg-gray-100" />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Bronze</span>
                  <span>Silver</span>
                  <span>Gold</span>
                  <span>Elite</span>
                  <span>VIP</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-600 text-white border-0 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-80">Solde Retirable</CardTitle>
            <Wallet className="h-5 w-5 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{affiliate.balance} Goud</div>
            <p className="text-blue-100 text-[10px] font-medium mt-1 uppercase tracking-tight">Paiement dès 20 Goud</p>
            
            <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
              <DialogTrigger render={
                <Button 
                  className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl shadow-sm"
                  disabled={affiliate.balance < 20 || settings?.withdrawalsEnabled === false}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {settings?.withdrawalsEnabled === false ? "Retraits désactivés" : "Retirer mes gains"}
                </Button>
              } />
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Demande de Retrait</DialogTitle>
                  <DialogDescription>
                    Choisissez votre méthode et le montant à retirer.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Méthode de retrait</Label>
                    <Select 
                      value={withdrawMethod} 
                      onValueChange={(v: any) => setWithdrawMethod(v)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Choisir une méthode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MonCash">MonCash</SelectItem>
                        <SelectItem value="NatCash">NatCash</SelectItem>
                        <SelectItem value="Physical">En personne (Juvénat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {withdrawMethod !== 'Physical' ? (
                    <div className="space-y-2">
                      <Label htmlFor="account-number" className="flex items-center gap-1">
                        Numéro {withdrawMethod} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="account-number"
                        placeholder={`Entrez votre numéro ${withdrawMethod}`} 
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="rounded-xl border-gray-200 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-gray-400">Ce numéro sera utilisé pour votre paiement.</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium leading-relaxed">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        Retrait disponible à notre bureau : Rue Neptune Debrosse, Juvénat. Munissez-vous de votre code affilié.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Montant (Goud)</Label>
                    <Input 
                      type="number" 
                      placeholder="Ex: 50" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">Maximum disponible: {affiliate.balance} Goud</p>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsWithdrawModalOpen(false)} className="rounded-xl">Annuler</Button>
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={isSubmitting}
                    className="bg-blue-600 rounded-xl flex-1"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer le retrait"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-wider">Revenu Direct</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{affiliate.directRevenue || 0} Goud</div>
            <p className="text-gray-400 text-[10px] font-medium mt-1 uppercase tracking-tight">De vos clients personnels</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-wider">Revenu Indirect</CardTitle>
            <Network className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{affiliate.indirectRevenue || 0} Goud</div>
            <p className="text-gray-400 text-[10px] font-medium mt-1 uppercase tracking-tight">De votre réseau de parrainage</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Gains</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{affiliate.totalEarnings || 0} Goud</div>
            <p className="text-gray-400 text-[10px] font-medium mt-1 uppercase tracking-tight">Cumul historique de vos gains</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Rankings & Prizes */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  Classement des Meilleurs Affiliés
                </CardTitle>
                <CardDescription>Les leaders de la communauté Neopay ce mois-ci.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En Direct</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {rankingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Top 3 Podium Style */}
                <div className="grid grid-cols-3 gap-4 items-end pt-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center overflow-hidden">
                        <Users className="h-8 w-8 text-gray-300" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-gray-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm truncate w-24">{(monthlyRankings[1] || winnersQueue[1])?.name || '...'}</p>
                      <p className="text-[10px] font-bold text-gray-400">250 Goud</p>
                    </div>
                    <div className="w-full h-16 bg-gray-100 rounded-t-xl" />
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center overflow-hidden">
                        <Users className="h-10 w-10 text-amber-200" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white">1</div>
                      <Trophy className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-6 text-amber-500 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-base truncate w-28">{(monthlyRankings[0] || winnersQueue[0])?.name || '...'}</p>
                      <p className="text-xs font-bold text-amber-600">500 Goud</p>
                    </div>
                    <div className="w-full h-24 bg-amber-500 rounded-t-xl shadow-lg shadow-amber-100" />
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center overflow-hidden">
                        <Users className="h-8 w-8 text-orange-200" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm truncate w-24">{(monthlyRankings[2] || winnersQueue[2])?.name || '...'}</p>
                      <p className="text-[10px] font-bold text-orange-400">150 Goud</p>
                    </div>
                    <div className="w-full h-12 bg-orange-100 rounded-t-xl" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Détails du Classement</h4>
                  {(monthlyRankings.length > 0 ? monthlyRankings : winnersQueue).map((a, idx) => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-gray-300 group-hover:text-blue-600 transition-colors">#{idx + 1}</span>
                        <div>
                          <p className="font-bold text-gray-900">{a.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-blue-50 text-blue-600 border-blue-100">
                              {a.points || 0} Points
                            </Badge>
                            <span className="text-[10px] text-gray-400">{a.monthlySales || 0} Goud de ventes</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">
                          {idx === 0 ? '+500 G' : idx === 1 ? '+250 G' : '+150 G'}
                        </p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Bonus Prévu</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="bg-gray-50/50 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-blue-600" />
              Historique des Retraits
            </CardTitle>
            <CardDescription>Vos transactions récentes.</CardDescription>
          </div>
        </div>
      </CardHeader>
          <CardContent className="p-0">
            {withdrawalsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="divide-y">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-5 hover:bg-gray-50/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-xl text-gray-900">{w.amount} Goud</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-gray-200">
                            {w.method === 'Physical' ? 'Bureau Juvénat' : w.method}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {w.createdAt?.toDate ? format(w.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : ''}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(w.status)}
                    </div>
                    {w.status === 'rejected' && w.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-xl text-xs text-red-600 flex items-start gap-2 border border-red-100">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p><span className="font-bold">Raison du rejet :</span> {w.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="h-8 w-8 opacity-20" />
                </div>
                <p className="font-medium">Aucun retrait effectué</p>
                <p className="text-xs mt-1">Vos futurs retraits apparaîtront ici.</p>
              </div>
            )}
          </CardContent>
          {withdrawals.length > 0 && (
            <div className="p-4 bg-gray-50/50 border-t text-center">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-bold hover:bg-blue-50">
                Voir tout l'historique
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
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

