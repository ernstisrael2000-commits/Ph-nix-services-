import React, { useState } from 'react';
import { 
  useAgentDataByUid, 
  useAgentWithdrawals, 
  approveAgentDeposit, 
  rejectAgentDeposit 
} from '../services/agentService';
import { useWalletTransactions } from '../services/affiliateService';
import { Agent, WalletTransaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  History, 
  LogOut,
  Clock,
  User,
  ArrowRightLeft,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  RefreshCw,
  UserCheck,
  PlusCircle,
  MinusCircle,
  StickyNote
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../services/parcelService';

interface AgentDashboardProps {
  agentUid: string;
  onLogout: () => void;
}

interface FoundClient {
  clientId: string;
  name: string;
  phone: string;
  walletId: string;
  balance: number;
}

type ActiveSection = 'pending' | 'client-tx' | 'history';

export default function AgentDashboard({ agentUid, onLogout }: AgentDashboardProps) {
  const { agent, loading: agentLoading } = useAgentDataByUid(agentUid);
  const { transactions: agentHistory, loading: historyLoading } = useAgentWithdrawals(agent?.id || null);
  const { settings } = useSettings();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('pending');

  // Client transaction state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundClient, setFoundClient] = useState<FoundClient | null>(null);
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pendingRequests = agentHistory.filter(t => t.status === 'pending_agent');
  const finishedRequests = agentHistory.filter(t => t.status !== 'pending_agent');
  const rate = settings?.exchangeRate || 146;

  const handleApprove = async (tx: WalletTransaction) => {
    if (!agent) return;
    if (agent.balance < tx.amount) {
      toast.error("Solde insuffisant pour valider ce dépôt.");
      return;
    }
    setIsProcessing(true);
    try {
      await approveAgentDeposit(tx);
      toast.success("Dépôt validé avec succès !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la validation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (txId: string) => {
    setIsProcessing(true);
    try {
      await rejectAgentDeposit(txId);
      toast.success("Dépôt rejeté.");
    } catch (error) {
      toast.error("Erreur lors du rejet.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchClient = async () => {
    const phone = phoneSearch.trim();
    if (!phone) { toast.error("Entrez un numéro de téléphone."); return; }
    if (!agent?.agentCode) return;
    setSearching(true);
    setFoundClient(null);
    try {
      const res = await fetch(`/api/agent/client-by-phone?phone=${encodeURIComponent(phone)}&agentCode=${encodeURIComponent(agent.agentCode)}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Client introuvable."); return; }
      setFoundClient(data);
    } catch (e) {
      toast.error("Erreur réseau.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitTx = async () => {
    if (!foundClient || !agent?.agentCode) return;
    const usd = parseFloat(txAmount);
    if (isNaN(usd) || usd <= 0) { toast.error("Montant invalide."); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/agent/client-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentCode: agent.agentCode,
          clientId: foundClient.clientId,
          type: txType,
          amount: usd,
          note: txNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur lors de la transaction."); return; }
      toast.success(`${txType === 'deposit' ? 'Dépôt' : 'Retrait'} de $${usd.toFixed(2)} effectué avec succès !`);
      setFoundClient(null);
      setPhoneSearch('');
      setTxAmount('');
      setTxNote('');
    } catch (e) {
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <XCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black">Accès Refusé</h2>
        <p className="text-gray-500">Vous n'êtes pas enregistré en tant qu'agent Rena.</p>
        <Button onClick={onLogout} variant="outline" className="rounded-2xl h-12 w-full">Retour au Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-dark tracking-tight">Espace Agent</h1>
            <p className="text-gray-500 text-sm font-medium">
              <span className="text-primary font-bold">{agent.name}</span>
              <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-mono">#{agent.agentCode}</span>
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onLogout} className="rounded-2xl text-red-500 hover:bg-red-50 h-10 px-5 font-bold flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-[2rem] border-0 shadow-xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Wallet className="h-14 w-14" />
          </div>
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Solde Agent</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{agent.balance.toLocaleString()}</span>
              <span className="text-base font-black text-white/30">$</span>
            </div>
            <p className="text-xs font-bold text-white/40 mt-0.5">≈ {((agent.balance || 0) * rate).toLocaleString()} HTG</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm bg-white border border-gray-100 flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Validés</p>
                <p className="text-3xl font-black text-dark">{finishedRequests.filter(r => r.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
        {[
          { key: 'pending', label: 'En attente', icon: Clock, badge: pendingRequests.length },
          { key: 'client-tx', label: 'Transaction Client', icon: ArrowRightLeft, badge: 0 },
          { key: 'history', label: 'Historique', icon: History, badge: 0 },
        ].map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as ActiveSection)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all relative ${
              activeSection === key ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sections ── */}
      <AnimatePresence mode="wait">

        {/* Pending deposits */}
        {activeSection === 'pending' && (
          <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <Clock className="h-5 w-5 text-amber-500" />
              Demandes en attente
              {pendingRequests.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingRequests.length}</span>
              )}
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-200">
                <CheckCircle2 className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Toutes les demandes ont été traitées</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} className="rounded-3xl border-0 shadow-lg overflow-hidden border-l-4 border-l-amber-400">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                          <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Affilié</p>
                          <p className="font-black text-dark text-base">ID: {request.affiliateId.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Montant</p>
                        <p className="text-2xl font-black text-primary">{request.amount.toLocaleString()} $</p>
                        <p className="text-[10px] font-bold text-gray-400">({((request.amount || 0) * rate).toLocaleString()} HTG)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleReject(request.id!)} disabled={isProcessing} variant="ghost"
                          className="rounded-2xl h-10 px-5 text-red-500 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest">
                          Rejeter
                        </Button>
                        <Button onClick={() => handleApprove(request)} disabled={isProcessing}
                          className="rounded-2xl h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest border-0 shadow-lg shadow-emerald-500/20">
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approuver"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}

        {/* Client Transaction */}
        {activeSection === 'client-tx' && (
          <motion.div key="client-tx" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transaction pour un client
            </h3>

            {/* Search client */}
            <Card className="rounded-[2rem] border-0 shadow-sm border border-gray-100">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Numéro de téléphone du client</Label>
                  <div className="flex gap-2">
                    <Input
                      value={phoneSearch}
                      onChange={e => setPhoneSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchClient()}
                      placeholder="+509..."
                      className="h-12 rounded-2xl bg-gray-50 border-0 font-bold flex-1"
                    />
                    <Button onClick={handleSearchClient} disabled={searching}
                      className="h-12 px-5 rounded-2xl bg-primary hover:bg-[#1D4ED8] text-white font-black border-0 shrink-0">
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Found client info */}
                <AnimatePresence>
                  {foundClient && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      {/* Client card */}
                      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shrink-0">
                          {foundClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-dark text-base truncate">{foundClient.name}</p>
                          <p className="text-xs text-gray-500 font-medium">{foundClient.phone}</p>
                          <p className="text-xs text-gray-400 font-mono">{foundClient.walletId}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Solde</p>
                          <p className="text-xl font-black text-primary">${foundClient.balance.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-gray-400">{((foundClient.balance || 0) * rate).toLocaleString()} HTG</p>
                        </div>
                        <button onClick={() => setFoundClient(null)} className="text-gray-300 hover:text-gray-500 transition-colors ml-1 shrink-0">
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Transaction type */}
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Type de transaction</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setTxType('deposit')}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                              txType === 'deposit'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                            }`}
                          >
                            <ArrowDownLeft className={`h-5 w-5 shrink-0 ${txType === 'deposit' ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <span>Dépôt</span>
                          </button>
                          <button
                            onClick={() => setTxType('withdrawal')}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                              txType === 'withdrawal'
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                            }`}
                          >
                            <ArrowUpRight className={`h-5 w-5 shrink-0 ${txType === 'withdrawal' ? 'text-rose-500' : 'text-gray-400'}`} />
                            <span>Retrait</span>
                          </button>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Montant (USD)</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={txAmount}
                          onChange={e => setTxAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-14 rounded-2xl bg-gray-50 border-0 font-black text-2xl text-center focus:ring-2 focus:ring-primary/20"
                        />
                        {txAmount && !isNaN(parseFloat(txAmount)) && (
                          <p className="text-xs text-gray-400 text-center mt-1 font-bold">
                            ≈ {(parseFloat(txAmount) * rate).toLocaleString()} HTG
                          </p>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Note (optionnel)</Label>
                        <Input
                          value={txNote}
                          onChange={e => setTxNote(e.target.value)}
                          placeholder="Ex: Remboursement, service..."
                          className="h-12 rounded-2xl bg-gray-50 border-0 font-medium"
                          maxLength={150}
                        />
                      </div>

                      {/* Submit */}
                      <Button
                        onClick={handleSubmitTx}
                        disabled={submitting || !txAmount}
                        className={`w-full h-14 rounded-2xl font-black text-white uppercase text-[11px] tracking-widest border-0 shadow-lg transition-all ${
                          txType === 'deposit'
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                            : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                        }`}
                      >
                        {submitting ? (
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                          <>
                            {txType === 'deposit' ? <ArrowDownLeft className="h-4 w-4 mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                            Confirmer le {txType === 'deposit' ? 'dépôt' : 'retrait'}
                            {txAmount && !isNaN(parseFloat(txAmount)) ? ` de $${parseFloat(txAmount).toFixed(2)}` : ''}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* History */}
        {activeSection === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <History className="h-5 w-5 text-blue-500" />
              Historique des Transactions
            </h3>
            <Card className="rounded-[2rem] border-0 shadow-xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-0">
                    <TableHead className="font-black h-12 px-6 text-[10px] uppercase tracking-widest text-gray-500">Date</TableHead>
                    <TableHead className="font-black h-12 text-[10px] uppercase tracking-widest text-gray-500">Description</TableHead>
                    <TableHead className="font-black h-12 text-right text-[10px] uppercase tracking-widest text-gray-500">Montant</TableHead>
                    <TableHead className="font-black h-12 text-center text-[10px] uppercase tracking-widest text-gray-500 px-6">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedRequests.map((tx) => (
                    <TableRow key={tx.id} className="border-gray-50">
                      <TableCell className="px-6 font-medium text-gray-500 text-xs">
                        {tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'Pp', { locale: fr }) : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-dark text-sm">{tx.description}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-black text-lg">{tx.amount.toLocaleString()} $</span>
                        <p className="text-[10px] font-bold text-gray-400">≈ {((tx.amount || 0) * rate).toLocaleString()} HTG</p>
                      </TableCell>
                      <TableCell className="text-center px-6">
                        <Badge className={`rounded-xl px-3 py-1 font-black uppercase text-[9px] ${
                          tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'approved' ? 'Validé' : 'Refusé'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {finishedRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-gray-300 font-bold uppercase tracking-tighter">
                        Aucune transaction historique
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
