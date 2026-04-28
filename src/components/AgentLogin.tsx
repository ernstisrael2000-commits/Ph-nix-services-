import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { loginAgent } from '../services/agentService';
import { toast } from 'sonner';
import { Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { Agent } from '../types';

interface AgentLoginProps {
  onLogin: (agent: Agent) => void;
}

export default function AgentLogin({ onLogin }: AgentLoginProps) {
  const [agentCode, setAgentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentCode.trim() || !phone.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const agent = await loginAgent(agentCode.trim(), phone.trim());
      if (agent) {
        toast.success(`Bienvenue Agent ${agent.name} !`);
        onLogin(agent);
      } else {
        toast.error("Code agent ou téléphone incorrect, ou agent inactif.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4 animate-in zoom-in duration-300">
      <Card className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border-0 rounded-[2.5rem] overflow-hidden">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center space-y-4 pt-10 px-8">
          <div className="bg-primary/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner relative group">
            <UserCheck className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
            <div className="absolute -top-1 -right-1">
              <ShieldCheck className="h-6 w-6 text-emerald-500 fill-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-black text-dark tracking-tight">Accès Agent</CardTitle>
            <CardDescription className="text-gray-500 font-medium px-4">
              Connectez-vous pour valider les dépôts de vos clients.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agentCode" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Code Agent Unique</Label>
              <Input
                id="agentCode"
                placeholder="Ex: 12345678"
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value)}
                className="h-14 rounded-2xl bg-gray-50 border-0 focus:ring-2 focus:ring-primary/20 text-center text-xl font-black tracking-[0.2em]"
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Numéro de Téléphone associé</Label>
              <Input
                id="phone"
                placeholder="Ex: +509..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 rounded-2xl bg-gray-50 border-0 focus:ring-2 focus:ring-primary/20 font-bold"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-[#D98A1E] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 border-0 transition-all hover:shadow-2xl active:scale-95"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Entrer dans l'espace agent"}
            </Button>
          </form>
          <div className="mt-10 pt-8 border-t border-gray-50 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Système de Sécurité Neopay
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
