import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { loginAgent } from '../services/agentService';
import { loginWithGoogle } from '../services/authService';
import { isInIframe } from '../lib/google-auth';
import { toast } from 'sonner';
import { Loader2, UserCheck, ShieldCheck, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle('agent');
      if (result.error) {
        if (result.error) toast.error(result.error);
      } else if (result.agent) {
        toast.success(`Bienvenue, Agent ${result.agent.name} !`);
        onLogin(result.agent);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erreur connexion Google.");
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
              className="w-full h-14 bg-primary hover:bg-[#1D4ED8] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 border-0 transition-all hover:shadow-2xl active:scale-95"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Entrer dans l'espace agent"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white px-4 text-gray-400">Ou</span>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleGoogleLogin}
                className="w-full h-14 rounded-2xl border-gray-100 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all"
                disabled={loading}
              >
                {!loading && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> : "Accès via Google"}
              </Button>
            </motion.div>
            {isInIframe() && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mt-2">
                <ExternalLink className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Connexion Google indisponible dans cet aperçu.{' '}
                  <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    Ouvrir dans un onglet complet
                  </a>.
                </p>
              </div>
            )}
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
