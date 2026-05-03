import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Plus, 
  Send, 
  Banknote,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../types';
import { createTransactionRequest, useClientTransactions, ClientTransaction } from '../services/transactionService';
import { toast } from 'sonner';

interface WalletProps {
  client: Client;
}

export default function Wallet({ client }: WalletProps) {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdrawal' | 'transfer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  
  // For transfer
  const [recipientEmail, setRecipientEmail] = useState('');
  
  // For deposit/withdraw
  const [method, setMethod] = useState('');

  useEffect(() => {
    if (client.id) {
      const unsubscribe = useClientTransactions(client.id, (txs) => {
        setTransactions(txs);
      });
      return () => unsubscribe();
    }
  }, [client.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      const numAmount = parseFloat(amount);
      
      if (activeAction === 'withdrawal' && numAmount > (client.balance || 0)) {
        toast.error("Solde insuffisant.");
        setLoading(false);
        return;
      }

      await createTransactionRequest({
        clientId: client.id!,
        type: activeAction!,
        amount: numAmount,
        status: 'pending',
        method: method,
        recipientId: activeAction === 'transfer' ? recipientEmail : undefined,
        description: activeAction === 'transfer' ? `Transfert vers ${recipientEmail}` : undefined
      });

      toast.success("Demande envoyée ! En attente d'approbation admin.");
      setActiveAction(null);
      setAmount('');
      setMethod('');
      setRecipientEmail('');
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la demande.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Balance Card */}
      <Card className="bg-primary border-0 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(251,191,36,0.3)] text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <WalletIcon className="h-32 w-32 rotate-12" />
        </div>
        <CardContent className="p-8 sm:p-12 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-white/60 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Mon Solde Neopay</p>
              <h2 className="text-5xl sm:text-6xl font-black tracking-tight flex items-baseline gap-2">
                {client.balance?.toLocaleString()} 
                <span className="text-2xl opacity-60">HTG</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              <Button 
                onClick={() => setActiveAction('deposit')}
                className="flex flex-col h-20 w-full sm:w-24 bg-white/10 hover:bg-white/20 border-white/10 rounded-2xl gap-2 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px] uppercase font-black tracking-widest">Dépôt</span>
              </Button>
              <Button 
                onClick={() => setActiveAction('transfer')}
                className="flex flex-col h-20 w-full sm:w-24 bg-white/10 hover:bg-white/20 border-white/10 rounded-2xl gap-2 transition-all"
              >
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-[10px] uppercase font-black tracking-widest">Transfert</span>
              </Button>
              <Button 
                onClick={() => setActiveAction('withdrawal')}
                className="flex flex-col h-20 w-full sm:w-24 bg-white/10 hover:bg-white/20 border-white/10 rounded-2xl gap-2 transition-all"
              >
                <Banknote className="h-5 w-5" />
                <span className="text-[10px] uppercase font-black tracking-widest">Retrait</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {activeAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-primary/20 rounded-[2rem] shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-black text-dark uppercase tracking-wide">
                  {activeAction === 'deposit' ? 'Effectuer un Dépôt' : 
                   activeAction === 'withdrawal' ? 'Demander un Retrait' : 'Transférer HTG'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)}>Annuler</Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-subtext">Montant (HTG)</Label>
                      <Input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-12 text-lg font-bold rounded-xl border-gray-100 bg-gray-50 focus:ring-primary/20"
                        required
                      />
                    </div>
                    
                    {activeAction === 'transfer' ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-subtext">Email du Destinataire</Label>
                        <Input 
                          type="email" 
                          value={recipientEmail} 
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="client@neopay.com"
                          className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-primary/20"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-subtext">Méthode</Label>
                        <select 
                          className="w-full h-12 rounded-xl border-gray-100 bg-gray-50 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                          required
                        >
                          <option value="">Choisir...</option>
                          <option value="MonCash">MonCash</option>
                          <option value="NatCash">NatCash</option>
                          <option value="Dépôt Physique">Dépôt Physique (Agent)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-dark hover:bg-black text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        {activeAction === 'deposit' ? <Plus className="h-5 w-5" /> : 
                         activeAction === 'withdrawal' ? <Banknote className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                        Confirmer la demande
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 sm:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-black text-dark uppercase tracking-widest">Historique Récent</CardTitle>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">Tout voir</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-subtext italic">Aucune transaction pour le moment.</div>
            ) : transactions.map((tx) => (
              <div key={tx.id} className="p-4 sm:px-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${
                    tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                    tx.type === 'withdrawal' ? 'bg-red-100 text-red-600' :
                    tx.type === 'purchase' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="h-5 w-5" /> :
                     tx.type === 'withdrawal' ? <ArrowUpRight className="h-5 w-5" /> :
                     tx.type === 'purchase' ? <Banknote className="h-5 w-5" /> :
                     <ArrowRightLeft className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-dark uppercase tracking-tight">
                      {tx.type === 'deposit' ? 'Dépôt' : 
                       tx.type === 'withdrawal' ? 'Retrait' : 
                       tx.type === 'purchase' ? 'Achat Produit' : 'Transfert'}
                    </p>
                    <p className="text-[10px] text-subtext font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Récemment'}
                      <span className="opacity-20">•</span>
                      {getStatusIcon(tx.status)}
                      <span className={
                        tx.status === 'completed' || tx.status === 'approved' ? 'text-green-600' :
                        tx.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                      }>
                        {tx.status === 'pending' ? 'En attente' : 
                         tx.status === 'approved' || tx.status === 'completed' ? 'Validé' : 'Refusé'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${
                    tx.type === 'deposit' ? 'text-green-600' : 
                    tx.type === 'transfer' && tx.recipientId !== client.email ? 'text-amber-600' : 
                    'text-red-600'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()} HTG
                  </p>
                  <p className="text-[9px] font-black uppercase text-subtext/40 tracking-wider font-mono">#{tx.id?.slice(-8)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
