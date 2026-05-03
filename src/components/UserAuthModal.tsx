import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  UserPlus, LogIn, ShieldCheck, Loader2, Eye, EyeOff, 
  ArrowLeft, User, Phone, Mail, Lock, Hash, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { registerClient, loginClient } from '../services/clientService';
import { Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';

type ModalView = 'choice' | 'client-login' | 'client-register';

interface UserAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientLogin: (client: Client) => void;
  onAdminAccess: () => void;
}

export default function UserAuthModal({ open, onOpenChange, onClientLogin, onAdminAccess }: UserAuthModalProps) {
  const [view, setView] = useState<ModalView>('choice');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSponsor, setRegSponsor] = useState('');

  const resetForms = () => {
    setLoginEmail(''); setLoginPassword('');
    setRegName(''); setRegPhone(''); setRegEmail(''); setRegPassword(''); setRegSponsor('');
    setShowPassword(false);
    setView('choice');
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForms();
    onOpenChange(val);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      const client = await loginClient(loginEmail.trim().toLowerCase(), loginPassword);
      if (!client) { toast.error("Email ou mot de passe incorrect."); return; }
      if (client.status === 'blocked') { toast.error("Votre compte est bloqué. Contactez le support."); return; }
      toast.success(`Bienvenue, ${client.name} !`);
      onClientLogin(client);
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regEmail || !regPassword) { toast.error("Veuillez remplir tous les champs obligatoires."); return; }
    if (regPassword.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setLoading(true);
    try {
      const client = await registerClient({
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        sponsorCode: regSponsor.trim() || undefined
      });
      toast.success(`Compte créé ! Bienvenue, ${client.name} !`);
      onClientLogin(client);
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl" showCloseButton={false}>
        <AnimatePresence mode="wait">
          {view === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-gradient-to-br from-primary to-[#D98A1E] p-8 text-white text-center">
                <div className="h-16 w-16 rounded-[20px] bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/30">
                  <Wallet className="h-8 w-8 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black text-white">Accès Neopay</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">Choisissez votre type d'accès</DialogDescription>
              </div>
              <div className="p-6 space-y-3 bg-white">
                <button
                  onClick={() => setView('client-login')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary/30 hover:bg-accent-light/30 transition-all group text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <LogIn className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-dark">Se connecter</p>
                    <p className="text-xs text-subtext">Accéder à votre wallet client</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('client-register')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <UserPlus className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-dark">Créer un compte</p>
                    <p className="text-xs text-subtext">Nouveau chez Neopay ? Inscrivez-vous</p>
                  </div>
                </button>
                <button
                  onClick={() => { onAdminAccess(); handleClose(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50/30 transition-all group text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <ShieldCheck className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-dark">Accès Admin / Affilié</p>
                    <p className="text-xs text-subtext">Espace professionnel Neopay</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'client-login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-gradient-to-br from-primary to-[#D98A1E] p-6 text-white">
                <button onClick={() => setView('choice')} className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <DialogTitle className="text-xl font-black text-white">Connexion Client</DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-1">Accédez à votre wallet Neopay</DialogDescription>
              </div>
              <form onSubmit={handleLogin} className="p-6 space-y-4 bg-white">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="votre@email.com" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••" className="pl-10 pr-10 h-11 rounded-xl border-gray-200" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-dark transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-[#D98A1E] text-white font-black shadow-lg shadow-primary/30">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-2" /> Connexion</>}
                </Button>
                <p className="text-center text-sm text-subtext">
                  Pas encore de compte ?{' '}
                  <button type="button" onClick={() => setView('client-register')} className="text-primary font-bold hover:underline">
                    S'inscrire
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {view === 'client-register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white">
                <button onClick={() => setView('choice')} className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <DialogTitle className="text-xl font-black text-white">Créer un compte</DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-1">Rejoignez Neopay gratuitement</DialogDescription>
              </div>
              <form onSubmit={handleRegister} className="p-6 space-y-3 bg-white max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input value={regName} onChange={e => setRegName(e.target.value)}
                      placeholder="Jean Dupont" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      placeholder="+509 XXXX XXXX" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="votre@email.com" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input type={showPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="6 caractères minimum" className="pl-10 pr-10 h-11 rounded-xl border-gray-200" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-dark transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-subtext uppercase tracking-wider">Code parrain (optionnel)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
                    <Input value={regSponsor} onChange={e => setRegSponsor(e.target.value)}
                      placeholder="Code affilié parrain" className="pl-10 h-11 rounded-xl border-gray-200" />
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5 mr-2" /> Créer mon compte</>}
                </Button>
                <p className="text-center text-sm text-subtext">
                  Déjà un compte ?{' '}
                  <button type="button" onClick={() => setView('client-login')} className="text-primary font-bold hover:underline">
                    Se connecter
                  </button>
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
