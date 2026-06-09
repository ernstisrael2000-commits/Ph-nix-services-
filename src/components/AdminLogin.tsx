import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, User, Key, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { toast } from 'sonner';
import { checkAdminLogin, loginAdminWithGoogle, linkAdminGoogle } from '../services/adminService';
import { AdminAccount } from '../types';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminAccount) => void;
  onBack: () => void;
}

type Step = 'login' | 'link-google';

export default function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [step, setStep] = useState<Step>('login');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // For link-google step
  const [linkCode, setLinkCode] = useState('');
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState('');
  const [pendingGoogleUid, setPendingGoogleUid] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !password) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    try {
      const result = await checkAdminLogin(fullName, password, loginCode);
      if (result.success && result.admin) {
        toast.success(`Bienvenue, ${result.admin.fullName} !`);
        onLoginSuccess(result.admin);
      } else {
        toast.error(result.error || 'Erreur de connexion');
      }
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await loginAdminWithGoogle();
      if (result.success && result.admin) {
        toast.success(`Bienvenue, ${result.admin.fullName} !`);
        onLoginSuccess(result.admin);
      } else if (result.googleEmail && result.googleUid) {
        // Google auth succeeded but account not linked yet — prompt link
        setPendingGoogleEmail(result.googleEmail);
        setPendingGoogleUid(result.googleUid);
        setStep('link-google');
        toast.info('Compte Google non lié. Entrez votre code de liaison.');
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error('Erreur lors de la connexion Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode) { toast.error('Entrez votre code de liaison.'); return; }
    setLoading(true);
    try {
      const result = await linkAdminGoogle(linkCode, pendingGoogleEmail, pendingGoogleUid);
      if (result.success && result.admin) {
        toast.success(`Compte lié ! Bienvenue, ${result.admin.fullName} !`);
        onLoginSuccess(result.admin);
      } else {
        toast.error(result.error || 'Code invalide.');
      }
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-gray-50/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-3 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardHeader className="pt-8 pb-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-dark">Accès Administrateur</CardTitle>
            <CardDescription className="text-gray-500 font-medium pt-1">
              Connectez-vous pour gérer la plateforme Phénix Services.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <AnimatePresence mode="wait">

              {/* ── Step: Login ── */}
              {step === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  {/* Accès rapide par défaut */}
                  <div className="mb-5 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Accès par défaut</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Nom : <span className="font-black text-indigo-700">Admin</span> · Mot de passe : <span className="font-black text-indigo-700">admin2024</span></p>
                    </div>
                  </div>

                  {/* Google Login */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full h-12 mb-4 flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all font-black text-gray-700 text-sm disabled:opacity-60 shadow-sm"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Se connecter avec Google
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs text-gray-400 font-bold">OU</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Ex: Admin"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-12 h-13 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-13 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Code de connexion (Optionnel)</Label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Code requis pour Super Admin"
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value)}
                          className="pl-12 h-13 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 bg-primary hover:bg-[#1D4ED8] text-white font-black rounded-2xl shadow-lg shadow-accent-light/50 transition-all active:scale-[0.98] mt-4"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={onBack}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-primary transition-colors mt-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à l'accueil
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── Step: Link Google ── */}
              {step === 'link-google' && (
                <motion.div key="link" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-blue-700 uppercase tracking-wide">Compte Google détecté</p>
                      <p className="text-xs text-blue-500 mt-0.5">{pendingGoogleEmail}</p>
                      <p className="text-xs text-blue-400 mt-1">Ce compte n'est pas encore lié. Entrez votre code de liaison pour continuer.</p>
                    </div>
                  </div>

                  <form onSubmit={handleLinkGoogle} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Code de liaison (loginCode)</Label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Votre code secret d'administrateur"
                          value={linkCode}
                          onChange={(e) => setLinkCode(e.target.value)}
                          className="pl-12 h-13 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 bg-primary hover:bg-[#1D4ED8] text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                    >
                      {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Liaison...</> : 'Lier et se connecter'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setStep('login')}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-primary transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à la connexion
                    </button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
