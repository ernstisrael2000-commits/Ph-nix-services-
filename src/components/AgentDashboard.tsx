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
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';

import { useSettings } from '../services/parcelService';

interface AgentDashboardProps {
  agentUid: string;
  onLogout: () => void;
}

export default function AgentDashboard({ agentUid, onLogout }: AgentDashboardProps) {
  const { agent, loading: agentLoading } = useAgentDataByUid(agentUid);
  const { transactions: agentHistory, loading: historyLoading } = useAgentWithdrawals(agent?.id || null);
  const { settings } = useSettings();
  
  // Also need to fetch pending transactions for this agent
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingRequests = agentHistory.filter(t => t.status === 'pending_agent');
  const finishedRequests = agentHistory.filter(t => t.status !== 'pending_agent');

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
        <p className="text-gray-500">Vous n'êtes pas enregistré en tant qu'agent Neopay.</p>
        <Button onClick={onLogout} variant="outline" className="rounded-2xl h-12 w-full">Retour au Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-dark tracking-tight">Espace Agent</h1>
            <p className="text-gray-500 text-sm font-medium">Connecté : <span className="text-primary font-bold">{agent.name}</span> <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-tighter">ID: {agent.agentCode}</span></p>
          </div>
        </div>
        <Button variant="ghost" onClick={onLogout} className="rounded-2xl text-red-500 hover:bg-red-50 h-12 px-6 font-bold flex items-center gap-2 transition-all">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-0 shadow-2xl bg-slate-900 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="h-16 w-16" />
          </div>
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Solde Agent Disponible</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-black">{agent.balance.toLocaleString()}</span>
                <span className="text-xl font-black text-white/30 uppercase tracking-widest">$</span>
              </div>
              <p className="text-sm font-bold text-white/40 tracking-tight mt-1">
                ≈ {((agent.balance || 0) * (settings?.exchangeRate || 146)).toLocaleString()} HTG
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-0 shadow-xl bg-white p-8 border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[2rem] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dépôts Validés</p>
              <p className="text-3xl font-black text-dark">{finishedRequests.filter(r => r.status === 'approved').length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-dark tracking-tight flex items-center gap-2 px-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Demandes en attente
            {pendingRequests.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full ml-2 animate-pulse">{pendingRequests.length}</span>
            )}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden border-l-4 border-l-amber-400">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Affilié</p>
                      <p className="font-black text-dark text-lg uppercase truncate max-w-[200px]">
                        ID: {request.affiliateId.slice(-6)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Montant</p>
                    <p className="text-2xl font-black text-primary">{request.amount.toLocaleString()} $</p>
                    <p className="text-[10px] font-bold text-gray-400 tracking-tighter">
                      ({((request.amount || 0) * (settings?.exchangeRate || 146)).toLocaleString()} HTG)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleReject(request.id!)}
                      disabled={isProcessing}
                      variant="ghost" 
                      className="rounded-2xl h-12 px-6 text-red-500 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest"
                    >
                      Rejeter
                    </Button>
                    <Button 
                      onClick={() => handleApprove(request)}
                      disabled={isProcessing}
                      className="rounded-2xl h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 border-0"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approuver"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingRequests.length === 0 && (
            <div className="bg-gray-50 rounded-[2.5rem] p-20 text-center border-2 border-dashed border-gray-200">
               <CheckCircle2 className="h-16 w-16 text-gray-200 mx-auto mb-4" />
               <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Toutes les demandes ont été traitées</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-8 pb-12">
        <h3 className="text-xl font-black text-dark tracking-tight flex items-center gap-2 px-2">
          <History className="h-5 w-5 text-blue-500" />
          Historique des Transactions
        </h3>
        <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-0">
                <TableHead className="font-black h-14 px-8 text-[10px] uppercase tracking-widest text-gray-500">Date</TableHead>
                <TableHead className="font-black h-14 text-[10px] uppercase tracking-widest text-gray-500">Action</TableHead>
                <TableHead className="font-black h-14 text-right text-[10px] uppercase tracking-widest text-gray-500">Montant</TableHead>
                <TableHead className="font-black h-14 text-center text-[10px] uppercase tracking-widest text-gray-500 px-8">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedRequests.map((tx) => (
                <TableRow key={tx.id} className="border-gray-50">
                  <TableCell className="px-8 font-medium text-gray-500 text-xs">
                    {tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'Pp', { locale: fr }) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-dark text-sm lowercase">{tx.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-lg">{tx.amount.toLocaleString()} $</span>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tighter">
                        ≈ {((tx.amount || 0) * (settings?.exchangeRate || 146)).toLocaleString()} HTG
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-8">
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
      </div>
    </div>
  );
}
