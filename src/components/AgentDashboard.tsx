import React, { useState, useEffect, useCallback } from 'react';
import {
  useAgentDataByUid,
  useAgentWithdrawals,
  approveAgentDeposit,
  rejectAgentDeposit,
} from '../services/agentService';
import { useWalletTransactions } from '../services/affiliateService';
import { Agent, WalletTransaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Wallet, CheckCircle2, XCircle, Loader2, History, LogOut,
  Clock, User, ArrowRightLeft, Search, ArrowDownLeft, ArrowUpRight,
  Phone, RefreshCw, TrendingUp, BarChart3, Users, Settings,
  Home, AlertCircle, BadgeDollarSign, ChevronRight, Star,
  ArrowDownToLine, ArrowUpFromLine, StickyNote, ShieldCheck, PlusCircle, AlertTriangle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/apiFetch';
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

interface AgentStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalCommissions: number;
  depositCount: number;
  withdrawalCount: number;
  totalTransactions: number;
}

interface ClientWithdrawRequest {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  usdAmount?: number;
  message?: string;
  agentCode: string;
  agentName?: string;
  createdAt: any;
  status: string;
}

interface FeeRecord {
  id: string;
  clientName: string;
  operationType: string;
  baseAmount: number;
  agentShare: number;
  createdAt: any;
}

interface AgentTransaction {
  id: string;
  clientId?: string;
  clientName: string;
  type: string;
  amount: number;
  status: string;
  method: string;
  description?: string;
  source?: string;
  createdAt: any;
}

type ActiveSection = 'overview' | 'requests' | 'deposit' | 'commissions' | 'clients' | 'settings';

const sectionNav = [
  { key: 'overview',     label: 'Accueil',      icon: Home },
  { key: 'requests',     label: 'Demandes',      icon: Clock },
  { key: 'deposit',      label: 'Dépôt',         icon: ArrowDownLeft },
  { key: 'commissions',  label: 'Commissions',   icon: BadgeDollarSign },
  { key: 'clients',      label: 'Clients',       icon: Users },
  { key: 'settings',     label: 'Paramètres',    icon: Settings },
] as const;

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate();
  if (ts?._seconds) return new Date(ts._seconds * 1000);
  return null;
}
function fmtDate(ts: any, fmt = 'dd MMM yyyy HH:mm') {
  const d = toDate(ts);
  return d ? format(d, fmt, { locale: fr }) : '—';
}

export default function AgentDashboard({ agentUid, onLogout }: AgentDashboardProps) {
  const { agent, loading: agentLoading } = useAgentDataByUid(agentUid);
  const { transactions: agentHistory, loading: historyLoading } = useAgentWithdrawals(agent?.id || null);
  const { settings } = useSettings();

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  // Direct tx state (deposit/withdraw by phone, name or wallet ID)
  const [clientSearch, setClientSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundClient[]>([]);
  const [foundClient, setFoundClient] = useState<FoundClient | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Client withdrawal requests
  const [withdrawRequests, setWithdrawRequests] = useState<ClientWithdrawRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Full transaction history
  const [allTransactions, setAllTransactions] = useState<AgentTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Commission records
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);

  // Stats
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Reject reason state
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});

  // Self-deposit (agent recharges own balance)
  const [isSelfDepositOpen, setIsSelfDepositOpen] = useState(false);
  const [selfDepositAmount, setSelfDepositAmount] = useState('');
  const [selfDepositMethod, setSelfDepositMethod] = useState('MonCash');
  const [selfDepositSubmitting, setSelfDepositSubmitting] = useState(false);

  const rate = settings?.exchangeRate || 146;
  const pendingAffiliateRequests = agentHistory.filter(t => t.status === 'pending_agent');

  const totalPendingCount = pendingAffiliateRequests.length + withdrawRequests.length;

  // Load client withdrawal requests
  const loadWithdrawRequests = useCallback(async () => {
    if (!agent?.agentCode) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`/api/agent/withdrawal-requests/${encodeURIComponent(agent.agentCode)}`);
      const data = await res.json();
      if (res.ok) setWithdrawRequests(data.requests || []);
    } catch {}
    finally { setLoadingRequests(false); }
  }, [agent?.agentCode]);

  // Load full tx history
  const loadTransactions = useCallback(async () => {
    if (!agent?.agentCode) return;
    setLoadingTx(true);
    try {
      const res = await fetch(`/api/agent/transactions/${encodeURIComponent(agent.agentCode)}`);
      const data = await res.json();
      if (res.ok) setAllTransactions(data.transactions || []);
    } catch {}
    finally { setLoadingTx(false); }
  }, [agent?.agentCode]);

  // Load fee records
  const loadFeeRecords = useCallback(async () => {
    if (!agent?.id) return;
    setLoadingFees(true);
    try {
      const res = await fetch(`/api/agent/fee-records/${encodeURIComponent(agent.id)}`);
      const data = await res.json();
      if (res.ok) setFeeRecords(data.records || []);
    } catch {}
    finally { setLoadingFees(false); }
  }, [agent?.id]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!agent?.agentCode) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/agent/stats/${encodeURIComponent(agent.agentCode)}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {}
    finally { setLoadingStats(false); }
  }, [agent?.agentCode]);

  useEffect(() => {
    if (!agent) return;
    loadWithdrawRequests();
    loadStats();
  }, [agent?.agentCode]);

  useEffect(() => {
    if (activeSection === 'commissions') loadFeeRecords();
    if (activeSection === 'clients' || activeSection === 'overview') loadTransactions();
    if (activeSection === 'requests') loadWithdrawRequests();
  }, [activeSection, agent?.agentCode]);

  // Approve affiliate deposit
  const handleApproveAffiliate = async (tx: WalletTransaction) => {
    if (!agent) return;
    if (agent.balance < tx.amount) { toast.error('Solde insuffisant pour valider ce dépôt.'); return; }
    setIsProcessing(true);
    try {
      await approveAgentDeposit(tx);
      toast.success('Dépôt affilié validé !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation.');
    } finally { setIsProcessing(false); }
  };

  const handleRejectAffiliate = async (txId: string) => {
    setIsProcessing(true);
    try {
      await rejectAgentDeposit(txId);
      toast.success('Dépôt affilié rejeté.');
    } catch { toast.error('Erreur lors du rejet.'); }
    finally { setIsProcessing(false); }
  };

  // Confirm client withdrawal request
  const handleConfirmWithdraw = async (req: ClientWithdrawRequest) => {
    if (!agent?.agentCode) return;
    setIsProcessing(true);
    try {
      await apiFetch(`/api/agent/withdrawal-request/${req.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentCode: agent.agentCode }),
      });
      toast.success(`Retrait de $${req.amount.toFixed(2)} confirmé pour ${req.clientName} !`);
      await loadWithdrawRequests();
      await loadStats();
    } catch (e: any) { toast.error(e.message || 'Erreur réseau.'); }
    finally { setIsProcessing(false); }
  };

  // Reject client withdrawal request
  const handleRejectWithdraw = async (req: ClientWithdrawRequest) => {
    if (!agent?.agentCode) return;
    const reason = rejectReasonMap[req.id] || '';
    setIsProcessing(true);
    try {
      await apiFetch(`/api/agent/withdrawal-request/${req.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentCode: agent.agentCode, ...(reason && { reason }) }),
      });
      toast.success('Demande refusée.');
      await loadWithdrawRequests();
    } catch (e: any) { toast.error(e.message || 'Erreur réseau.'); }
    finally { setIsProcessing(false); }
  };

  // Search client by phone, name or wallet ID
  const handleSearchClient = async () => {
    const q = clientSearch.trim();
    if (!q) { toast.error('Entrez un téléphone, un nom ou un ID Wallet.'); return; }
    if (!agent?.agentCode) return;
    setSearching(true);
    setFoundClient(null);
    setSearchResults([]);
    try {
      const data = await apiFetch(`/api/agent/client-search?q=${encodeURIComponent(q)}&agentCode=${encodeURIComponent(agent.agentCode)}`);
      if (data.results?.length > 1) {
        setSearchResults(data.results);
      } else {
        setFoundClient(data.client || data.results?.[0] || null);
      }
    } catch (e: any) { toast.error(e.message || 'Erreur réseau.'); }
    finally { setSearching(false); }
  };

  // Agent self-deposit request (recharge own balance)
  const handleAgentSelfDeposit = async () => {
    const usd = parseFloat(selfDepositAmount);
    if (isNaN(usd) || usd <= 0) { toast.error('Montant invalide.'); return; }
    if (!agent?.agentCode) return;
    setSelfDepositSubmitting(true);
    try {
      await apiFetch('/api/agent/self-deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentCode: agent.agentCode, amount: usd, method: selfDepositMethod }),
      });
      const adminPhone = settings?.whatsappAdminNumber || '+50944813185';
      const msg = `Bonjour Admin, je souhaite recharger mon solde agent.\n\n💰 Montant: $${usd.toFixed(2)}\n💳 Méthode: ${selfDepositMethod}\n🔑 Code Agent: ${agent.agentCode}\n👤 Nom: ${agent.name}`;
      window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success('Demande enregistrée ! Continuez sur WhatsApp.');
      setIsSelfDepositOpen(false);
      setSelfDepositAmount('');
      setSelfDepositMethod('MonCash');
    } catch (e: any) { toast.error(e.message || 'Erreur réseau.'); }
    finally { setSelfDepositSubmitting(false); }
  };

  // Submit direct deposit (instant, no confirmation needed)
  const handleSubmitDeposit = async () => {
    if (!foundClient || !agent?.agentCode) return;
    const usd = parseFloat(txAmount);
    if (isNaN(usd) || usd <= 0) { toast.error('Montant invalide.'); return; }
    if (agent.balance < usd) { toast.error('Solde agent insuffisant pour ce dépôt.'); return; }
    setSubmitting(true);
    try {
      await apiFetch('/api/agent/client-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentCode: agent.agentCode, clientId: foundClient.clientId, type: 'deposit', amount: usd, note: txNote.trim() || undefined }),
      });
      toast.success(`Dépôt de $${usd.toFixed(2)} effectué pour ${foundClient.name} !`);
      setFoundClient(null); setClientSearch(''); setSearchResults([]); setTxAmount(''); setTxNote('');
      await loadStats();
    } catch (e: any) { toast.error(e.message || 'Erreur réseau.'); }
    finally { setSubmitting(false); }
  };

  // Unique clients from tx history
  const uniqueClients = React.useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; lastTx: any; txCount: number }>();
    allTransactions.forEach(tx => {
      if (!tx.clientId) return;
      const existing = map.get(tx.clientId);
      if (!existing) {
        map.set(tx.clientId, { clientId: tx.clientId, clientName: tx.clientName, lastTx: tx.createdAt, txCount: 1 });
      } else {
        existing.txCount++;
      }
    });
    return Array.from(map.values());
  }, [allTransactions]);

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4 px-4">
        <XCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black">Accès Refusé</h2>
        <p className="text-gray-500">Vous n'êtes pas enregistré en tant qu'agent Rena.</p>
        <Button onClick={onLogout} variant="outline" className="rounded-2xl h-12 w-full">Retour au Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-dark tracking-tight">Espace Agent</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-primary font-bold text-sm">{agent.name}</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-500">#{agent.agentCode}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {agent.status === 'active' ? '● Actif' : '● Inactif'}
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={onLogout} className="rounded-2xl text-red-500 hover:bg-red-50 h-9 px-4 font-bold text-sm flex items-center gap-2 shrink-0">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-[2rem] border-0 shadow-xl bg-slate-900 text-white overflow-hidden relative col-span-1">
          <div className="absolute top-0 right-0 p-5 opacity-10">
            <Wallet className="h-12 w-12" />
          </div>
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">Solde Agent</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black">{agent.balance.toLocaleString()}</span>
              <span className="text-sm font-black text-white/30">$</span>
            </div>
            <p className="text-[10px] font-bold text-white/40 mt-0.5">≈ {((agent.balance || 0) * rate).toLocaleString()} HTG</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 col-span-1">
          <CardContent className="p-5">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Commissions</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-700">{(agent.commissionBalance || 0).toFixed(2)}</span>
              <span className="text-sm font-black text-amber-400">$</span>
            </div>
            <p className="text-[10px] text-amber-500/70 font-bold mt-0.5">≈ {((agent.commissionBalance || 0) * rate).toLocaleString()} HTG</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-2">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
          {sectionNav.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            const hasBadge = key === 'requests' && totalPendingCount > 0;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key as ActiveSection)}
                className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl text-[10px] font-black uppercase tracking-wide transition-all ${
                  isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                <span className="hidden sm:block leading-tight text-center">{label}</span>
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                    {totalPendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section Content ── */}
      <AnimatePresence mode="wait">

        {/* ── OVERVIEW ── */}
        {activeSection === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <BarChart3 className="h-5 w-5 text-primary" />
              Vue d'ensemble
            </h3>

            {/* Stats grid */}
            {loadingStats ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Dépôts traités', value: `$${stats.totalDeposits.toFixed(2)}`, sub: `${stats.depositCount} transactions`, color: 'from-emerald-500 to-emerald-600', icon: ArrowDownLeft },
                  { label: 'Retraits traités', value: `$${stats.totalWithdrawals.toFixed(2)}`, sub: `${stats.withdrawalCount} transactions`, color: 'from-rose-500 to-rose-600', icon: ArrowUpRight },
                  { label: 'Commissions totales', value: `$${stats.totalCommissions.toFixed(2)}`, sub: `${stats.totalTransactions} opérations`, color: 'from-amber-500 to-orange-500', icon: BadgeDollarSign },
                ].map(({ label, value, sub, color, icon: Icon }) => (
                  <Card key={label} className={`rounded-[1.75rem] border-0 shadow-lg bg-gradient-to-br ${color} text-white overflow-hidden`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Icon className="h-5 w-5 text-white/70" />
                      </div>
                      <p className="text-xl font-black leading-tight">{value}</p>
                      <p className="text-[10px] font-bold text-white/60 mt-1">{label}</p>
                      <p className="text-[9px] text-white/40 mt-0.5">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {/* Recharger mon Solde */}
            <button
              onClick={() => setIsSelfDepositOpen(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 transition-all active:scale-[0.99] group"
            >
              <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-emerald-800">Recharger mon Solde</p>
                <p className="text-xs text-emerald-600">MonCash, NatCash, Bureau / Proxy</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Pending alerts */}
            {totalPendingCount > 0 && (
              <button
                onClick={() => setActiveSection('requests')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 transition-all group"
              >
                <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-amber-800">{totalPendingCount} demande{totalPendingCount > 1 ? 's' : ''} en attente</p>
                  <p className="text-xs text-amber-600">Cliquez pour traiter</p>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Recent transactions */}
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <p className="font-black text-dark text-sm">Transactions récentes</p>
                <button onClick={() => { setActiveSection('clients'); loadTransactions(); }} className="text-[11px] font-bold text-primary">Voir tout →</button>
              </div>
              {loadingTx ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
              ) : allTransactions.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                  <History className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm font-bold">Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'deposit' ? 'bg-emerald-100' : 'bg-rose-100'
                      }`}>
                        {tx.type === 'deposit'
                          ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                          : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-dark text-sm truncate">{tx.clientName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{tx.description || tx.method || ''}</p>
                        <p className="text-[10px] text-gray-300">{fmtDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'approved' ? 'Validé' : tx.status === 'pending' ? 'En attente' : 'Refusé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── REQUESTS ── */}
        {activeSection === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Client withdrawal requests */}
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-base font-black text-dark flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-rose-500" />
                  Retraits clients
                  {withdrawRequests.length > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-black">{withdrawRequests.length}</span>
                  )}
                </h3>
                <button onClick={loadWithdrawRequests} disabled={loadingRequests} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <RefreshCw className={`h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingRequests ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : withdrawRequests.length === 0 ? (
                <div className="bg-gray-50 rounded-[2rem] p-10 text-center border-2 border-dashed border-gray-200">
                  <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Aucune demande de retrait</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawRequests.map(req => (
                    <Card key={req.id} className="rounded-3xl border-0 shadow-md overflow-hidden border-l-4 border-l-rose-400">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 font-black text-base shrink-0">
                              {(req.clientName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-dark">{req.clientName}</p>
                              <p className="text-[10px] text-gray-400">{fmtDate(req.createdAt)}</p>
                              {req.message && <p className="text-xs text-gray-500 mt-0.5 italic">"{req.message}"</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-rose-600">${(req.amount || 0).toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400">≈ {((req.amount || 0) * rate).toLocaleString()} HTG</p>
                          </div>
                        </div>

                        {/* Reject reason */}
                        <div>
                          <Input
                            value={rejectReasonMap[req.id] || ''}
                            onChange={e => setRejectReasonMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="Raison du refus (optionnel)"
                            className="h-9 rounded-xl bg-gray-50 border-0 text-xs"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRejectWithdraw(req)}
                            disabled={isProcessing}
                            variant="ghost"
                            className="flex-1 rounded-xl h-10 text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-widest"
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Refuser
                          </Button>
                          <Button
                            onClick={() => handleConfirmWithdraw(req)}
                            disabled={isProcessing}
                            className="flex-1 rounded-xl h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest border-0 shadow-lg shadow-emerald-500/20"
                          >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                              <><CheckCircle2 className="h-4 w-4 mr-1.5" />Confirmer</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Affiliate deposit requests */}
            <div>
              <h3 className="text-base font-black text-dark flex items-center gap-2 px-1 mb-3">
                <ArrowDownToLine className="h-5 w-5 text-amber-500" />
                Dépôts affiliés
                {pendingAffiliateRequests.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{pendingAffiliateRequests.length}</span>
                )}
              </h3>

              {pendingAffiliateRequests.length === 0 ? (
                <div className="bg-gray-50 rounded-[2rem] p-10 text-center border-2 border-dashed border-gray-200">
                  <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Aucun dépôt affilié en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAffiliateRequests.map(request => (
                    <Card key={request.id} className="rounded-3xl border-0 shadow-md overflow-hidden border-l-4 border-l-amber-400">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Affilié</p>
                              <p className="font-black text-dark">ID: {request.affiliateId.slice(-6)}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black text-primary">${request.amount.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-gray-400">{((request.amount || 0) * rate).toLocaleString()} HTG</p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleRejectAffiliate(request.id!)} disabled={isProcessing}
                              variant="ghost" className="rounded-xl h-9 px-3 text-red-500 hover:bg-red-50 font-black text-xs">
                              Refuser
                            </Button>
                            <Button onClick={() => handleApproveAffiliate(request)} disabled={isProcessing}
                              className="rounded-xl h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs border-0 shadow shadow-emerald-500/20">
                              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Valider'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── DEPOSIT (direct) ── */}
        {activeSection === 'deposit' && (
          <motion.div key="deposit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
              Dépôt pour un client
            </h3>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700 leading-relaxed">
                Le montant sera <strong>déduit de votre solde agent</strong> et crédité instantanément au client.
              </p>
            </div>

            <DirectTxForm
              type="deposit"
              agent={agent}
              rate={rate}
              clientSearch={clientSearch}
              setClientSearch={setClientSearch}
              searching={searching}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              foundClient={foundClient}
              setFoundClient={setFoundClient}
              txAmount={txAmount}
              setTxAmount={setTxAmount}
              txNote={txNote}
              setTxNote={setTxNote}
              submitting={submitting}
              onSearch={handleSearchClient}
              onSubmit={handleSubmitDeposit}
            />
          </motion.div>
        )}

        {/* ── COMMISSIONS ── */}
        {activeSection === 'commissions' && (
          <motion.div key="commissions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-dark flex items-center gap-2">
                <BadgeDollarSign className="h-5 w-5 text-amber-500" />
                Historique Commissions
              </h3>
              <button onClick={loadFeeRecords} disabled={loadingFees} className="text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw className={`h-4 w-4 ${loadingFees ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Summary card */}
            <Card className="rounded-[2rem] border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total gagné</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{(agent.commissionBalance || 0).toFixed(2)}</span>
                    <span className="text-base font-black text-white/50">$</span>
                  </div>
                  <p className="text-[10px] text-white/50 mt-0.5">≈ {((agent.commissionBalance || 0) * rate).toLocaleString()} HTG</p>
                </div>
                <Star className="h-16 w-16 text-white/10" />
              </CardContent>
            </Card>

            {loadingFees ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
            ) : feeRecords.length === 0 ? (
              <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-200">
                <BadgeDollarSign className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Aucune commission enregistrée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {feeRecords.map(rec => (
                  <div key={rec.id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <BadgeDollarSign className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-dark text-sm truncate">{rec.clientName}</p>
                      <p className="text-[10px] text-gray-400 capitalize">
                        {rec.operationType === 'deposit' ? 'Dépôt' : 'Retrait'} — base: ${(rec.baseAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-gray-300">{fmtDate(rec.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-amber-600 text-sm">+${(rec.agentShare || 0).toFixed(4)}</p>
                      <p className="text-[10px] text-gray-400">commission</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CLIENTS ── */}
        {activeSection === 'clients' && (
          <motion.div key="clients" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-dark flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Clients gérés
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-black">{uniqueClients.length}</span>
              </h3>
              <button onClick={loadTransactions} disabled={loadingTx} className="text-gray-400 hover:text-gray-600">
                <RefreshCw className={`h-4 w-4 ${loadingTx ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingTx ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
            ) : uniqueClients.length === 0 ? (
              <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-200">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Aucun client servi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uniqueClients.map(c => (
                  <div key={c.clientId} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-base shrink-0">
                      {(c.clientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-dark truncate">{c.clientName}</p>
                      <p className="text-[10px] text-gray-400">{c.txCount} transaction{c.txCount > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400">Dernière</p>
                      <p className="text-[10px] font-bold text-gray-600">{fmtDate(c.lastTx, 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Full tx history */}
            {allTransactions.length > 0 && (
              <div className="mt-2">
                <p className="font-black text-dark text-sm px-1 mb-3">Toutes les transactions</p>
                <div className="space-y-2">
                  {allTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'deposit' ? 'bg-emerald-100' : 'bg-rose-100'
                      }`}>
                        {tx.type === 'deposit'
                          ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                          : <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-dark text-sm truncate">{tx.clientName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{tx.description || ''}</p>
                        <p className="text-[10px] text-gray-300">{fmtDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'approved' ? 'Validé' : tx.status === 'pending' ? 'En attente' : 'Refusé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SETTINGS ── */}
        {activeSection === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h3 className="text-lg font-black text-dark flex items-center gap-2 px-1">
              <Settings className="h-5 w-5 text-gray-500" />
              Paramètres Agent
            </h3>

            <Card className="rounded-[2rem] border-0 shadow-sm border border-gray-100">
              <CardContent className="p-5 space-y-4">
                {[
                  { label: 'Nom complet', value: agent.name, icon: User },
                  { label: 'Code agent', value: `#${agent.agentCode}`, icon: ShieldCheck, mono: true },
                  { label: 'Téléphone', value: agent.phone || '—', icon: Phone },
                  { label: 'Wallet ID', value: agent.walletId || '—', icon: Wallet, mono: true },
                  { label: 'Statut', value: agent.status === 'active' ? 'Actif' : 'Inactif', icon: CheckCircle2,
                    valueClass: agent.status === 'active' ? 'text-emerald-600' : 'text-red-500' },
                  { label: 'Email', value: agent.email || '—', icon: StickyNote },
                ].map(({ label, value, icon: Icon, mono, valueClass }) => (
                  <div key={label} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                    <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className={`font-black text-dark truncate ${mono ? 'font-mono' : ''} ${valueClass || ''}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
              <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Pour modifier vos informations ou votre solde, contactez l'administrateur Rena.
              </p>
            </div>

            <Button onClick={onLogout} variant="outline"
              className="w-full rounded-2xl h-12 text-red-500 border-red-200 hover:bg-red-50 font-black">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Self-Deposit Dialog ───────────────────────────────────────────── */}
      <Dialog open={isSelfDepositOpen} onOpenChange={v => { if (!v) { setSelfDepositAmount(''); setSelfDepositMethod('MonCash'); } setIsSelfDepositOpen(v); }}>
        <DialogContent className="w-[94%] sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
          <DialogHeader className="p-6 bg-emerald-600 text-white relative">
            <DialogTitle className="text-xl font-black">Recharger mon Solde</DialogTitle>
            <DialogDescription className="text-emerald-100 text-sm mt-1">Via MonCash, NatCash ou Bureau / Proxy.</DialogDescription>
            <DialogClose className="absolute right-5 top-5 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Method */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Méthode de paiement</Label>
              <Select value={selfDepositMethod} onValueChange={setSelfDepositMethod}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50 font-bold">
                  <SelectValue placeholder="Choisir une méthode" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="MonCash" className="font-bold">
                    <div className="flex items-center gap-2">
                      {settings?.moncashLogoUrl && <img src={settings.moncashLogoUrl} alt="" className="h-4 w-auto" referrerPolicy="no-referrer" />}
                      MonCash (Digicel)
                    </div>
                  </SelectItem>
                  <SelectItem value="NatCash" className="font-bold">
                    <div className="flex items-center gap-2">
                      {settings?.natcashLogoUrl && <img src={settings.natcashLogoUrl} alt="" className="h-4 w-auto" referrerPolicy="no-referrer" />}
                      NatCash (Natcom)
                    </div>
                  </SelectItem>
                  <SelectItem value="Physical" className="font-bold">Bureau / Proxy (En personne)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant (USD)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={selfDepositAmount}
                  onChange={e => setSelfDepositAmount(e.target.value)}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50 font-black text-lg pl-11"
                  min="1" step="1"
                />
                <PlusCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              </div>
              {selfDepositAmount && !isNaN(parseFloat(selfDepositAmount)) && parseFloat(selfDepositAmount) > 0 && (
                <p className="text-xs text-gray-400 font-bold text-center">
                  ≈ {Math.round(parseFloat(selfDepositAmount) * rate).toLocaleString()} HTG
                </p>
              )}
            </div>

            {/* Info notice */}
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                Vous serez redirigé sur WhatsApp pour envoyer votre preuve de paiement. L'admin créditera votre solde après vérification.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button
              onClick={handleAgentSelfDeposit}
              disabled={selfDepositSubmitting || !selfDepositAmount || isNaN(parseFloat(selfDepositAmount)) || parseFloat(selfDepositAmount) <= 0}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl border-0"
            >
              {selfDepositSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer la Demande →'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Shared Direct Transaction Form ──────────────────────────────────────────

interface DirectTxFormProps {
  type: 'deposit' | 'withdrawal';
  agent: Agent;
  rate: number;
  clientSearch: string;
  setClientSearch: (v: string) => void;
  searching: boolean;
  searchResults: FoundClient[];
  setSearchResults: (v: FoundClient[]) => void;
  foundClient: FoundClient | null;
  setFoundClient: (v: FoundClient | null) => void;
  txAmount: string;
  setTxAmount: (v: string) => void;
  txNote: string;
  setTxNote: (v: string) => void;
  submitting: boolean;
  onSearch: () => void;
  onSubmit: () => void;
}

function DirectTxForm({
  type, agent, rate,
  clientSearch, setClientSearch, searching,
  searchResults, setSearchResults,
  foundClient, setFoundClient,
  txAmount, setTxAmount,
  txNote, setTxNote,
  submitting, onSearch, onSubmit,
}: DirectTxFormProps) {
  const isDeposit = type === 'deposit';
  const usd = parseFloat(txAmount);
  const htgPreview = !isNaN(usd) && usd > 0 ? usd * rate : 0;
  const color = isDeposit ? 'emerald' : 'rose';

  return (
    <Card className="rounded-[2rem] border-0 shadow-sm border border-gray-100">
      <CardContent className="p-5 space-y-4">
        {/* Multi-field client search */}
        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
            Rechercher le client (téléphone, nom ou ID Wallet)
          </Label>
          <div className="flex gap-2">
            <Input
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              placeholder="Ex: +509..., Jean Dupont, W-..."
              className="h-12 rounded-2xl bg-gray-50 border-0 font-bold flex-1"
            />
            <Button onClick={onSearch} disabled={searching}
              className="h-12 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black border-0 shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Multiple results list */}
        <AnimatePresence>
          {searchResults.length > 1 && !foundClient && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sélectionnez un client</p>
              {searchResults.map(r => (
                <button key={r.clientId} onClick={() => { setFoundClient(r); setSearchResults([]); }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-primary/40 hover:bg-primary/5 text-left transition-all">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-dark text-sm truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{r.phone} · {r.walletId}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-600 shrink-0">${r.balance.toFixed(2)}</p>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {foundClient && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Client card */}
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shrink-0">
                  {foundClient.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-dark truncate">{foundClient.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{foundClient.phone}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{foundClient.walletId}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Solde client</p>
                  <p className="text-xl font-black text-primary">${foundClient.balance.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">{(foundClient.balance * rate).toLocaleString()} HTG</p>
                </div>
                <button onClick={() => setFoundClient(null)} className="text-gray-300 hover:text-gray-500 ml-1">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Amount */}
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  Montant (USD)
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-14 rounded-2xl bg-gray-50 border-0 font-black text-2xl text-center focus:ring-2 focus:ring-primary/20"
                />
                {htgPreview > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-1 font-bold">
                    ≈ {htgPreview.toLocaleString()} HTG
                  </p>
                )}
              </div>

              {/* Warnings */}
              {isDeposit && !isNaN(usd) && usd > 0 && usd > agent.balance && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-bold">Votre solde agent est insuffisant (${agent.balance.toFixed(2)} disponible)</p>
                </div>
              )}
              {!isDeposit && !isNaN(usd) && usd > 0 && usd > foundClient.balance && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-bold">Solde client insuffisant (${foundClient.balance.toFixed(2)} disponible)</p>
                </div>
              )}

              {/* Note */}
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Note (optionnel)</Label>
                <Input
                  value={txNote}
                  onChange={e => setTxNote(e.target.value)}
                  placeholder="Ex: Remboursement, service..."
                  className="h-11 rounded-2xl bg-gray-50 border-0 font-medium"
                  maxLength={150}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={onSubmit}
                disabled={submitting || !txAmount || isNaN(parseFloat(txAmount)) || parseFloat(txAmount) <= 0}
                className={`w-full h-14 rounded-2xl font-black text-white uppercase text-[11px] tracking-widest border-0 shadow-lg transition-all ${
                  isDeposit
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                }`}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <>
                    {isDeposit ? <ArrowDownLeft className="h-4 w-4 mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                    {isDeposit
                      ? `Confirmer le dépôt${txAmount && !isNaN(parseFloat(txAmount)) ? ` — $${parseFloat(txAmount).toFixed(2)}` : ''}`
                      : `Envoyer la demande${txAmount && !isNaN(parseFloat(txAmount)) ? ` — $${parseFloat(txAmount).toFixed(2)}` : ''}`
                    }
                  </>
                )}
              </Button>
              {!isDeposit && (
                <p className="text-[10px] text-center text-rose-400 font-medium">
                  Le retrait sera effectué uniquement après confirmation du client.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
