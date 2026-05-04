import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  UserPlus, LogIn, ShieldCheck, Loader2, Eye, EyeOff,
  ArrowLeft, User, Phone, Mail, Lock, Hash, Wallet,
  AlertCircle, Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  registerClient, loginClient,
  loginClientWithGoogle, registerClientWithGoogle
} from '../services/clientService';
import { loginAdminWithGoogle } from '../services/adminService';
import { Client, AdminAccount } from '../types';

type ModalView = 'choice' | 'client-login' | 'client-register' | 'admin-access' | 'google-register';

interface UserAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientLogin: (client: Client) => void;
  onAdminLogin: (admin: AdminAccount) => void;
  onAffiliateAccess: () => void;
}

// Plain Google icon — no motion, no framer
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GoogleBtn = ({
  onClick, label, loading
}: { onClick: () => void; label: string; loading: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
  >
    {loading
      ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      : <><GoogleIcon /><span className="font-bold text-sm text-gray-700">{label}</span></>
    }
  </button>
);

const Divider = ({ label = 'ou' }: { label?: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-gray-100" />
    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

export default function UserAuthModal({
  open, onOpenChange, onClientLogin, onAdminLogin, onAffiliateAccess
}: UserAuthModalProps) {
  const [view, setView] = useState<ModalView>('choice');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSponsor, setRegSponsor] = useState('');

  const [googleUser, setGoogleUser] = useState<{
    uid: string; email: string; name: string; photoUrl?: string
  } | null>(null);
  const [googleRegPhone, setGoogleRegPhone] = useState('');
  const [googleRegSponsor, setGoogleRegSponsor] = useState('');

  // Stores pending google result when dialog is closed during auth
  const pendingGoogleResult = useRef<any>(null);

  const resetForms = () => {
    setLoginEmail(''); setLoginPassword('');
    setRegName(''); setRegPhone(''); setRegEmail(''); setRegPassword(''); setRegSponsor('');
    setGoogleUser(null); setGoogleRegPhone(''); setGoogleRegSponsor('');
    setShowPassword(false); setGoogleError(null);
    setView('choice');
    setLoading(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForms();
    onOpenChange(val);
  };

  // ── Email/password login ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      const client = await loginClient(loginEmail.trim().toLowerCase(), loginPassword);
      if (!client) { toast.error("Email ou mot de passe incorrect."); return; }
      if ((client as any).status === 'blocked') { toast.error("Votre compte est bloqué. Contactez le support."); return; }
      toast.success(`Bienvenue, ${client.name} !`);
      onClientLogin(client);
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  // ── Email/password register ──────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regEmail || !regPassword) { toast.error("Veuillez remplir tous les champs obligatoires."); return; }
    if (regPassword.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setLoading(true);
    try {
      const client = await registerClient({
        name: regName.trim(), phone: regPhone.trim(),
        email: regEmail.trim().toLowerCase(), password: regPassword,
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

  // ── Google client login — CLOSE DIALOG FIRST to avoid DOM conflicts ──────
  // Firebase signInWithPopup injects/removes hidden iframes into document.body.
  // Having an animated Radix Dialog portal open at the same time causes React
  // to throw "insertBefore/removeChild: node is not a child" errors.
  // Solution: close the dialog before calling signInWithPopup, reopen if needed.
  const handleGoogleClientLogin = () => {
    setGoogleError(null);
    // Close modal immediately — Firebase popup needs a clean DOM
    onOpenChange(false);

    setLoading(true);
    // Small delay lets Radix finish its exit animation before Firebase injects iframes
    setTimeout(async () => {
      try {
        const result = await loginClientWithGoogle();

        if (result.error) {
          if (result.error) toast.error(result.error);
          // Reopen modal so user can try again
          setLoading(false);
          onOpenChange(true);
          return;
        }

        if (result.noAccount) {
          // Store data, reopen modal to google-register view
          setGoogleUser({
            uid: result.googleUid!,
            email: result.googleEmail!,
            name: result.googleName!,
            photoUrl: result.googlePhotoUrl
          });
          setLoading(false);
          setView('google-register');
          onOpenChange(true);
          return;
        }

        if (result.client) {
          toast.success(`Bienvenue, ${result.client.name} !`);
          onClientLogin(result.client);
          setLoading(false);
          resetForms();
        }
      } catch (err: any) {
        setLoading(false);
        toast.error(err.message || "Erreur de connexion Google.");
        onOpenChange(true);
      }
    }, 150);
  };

  // ── Google register (complete profile) ──────────────────────────────────
  const handleGoogleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    if (!googleRegPhone.trim()) { toast.error("Le numéro de téléphone est requis."); return; }
    setLoading(true);
    try {
      const client = await registerClientWithGoogle({
        phone: googleRegPhone.trim(),
        sponsorCode: googleRegSponsor.trim() || undefined,
        googleUser
      });
      toast.success(`Compte créé ! Bienvenue, ${client.name} !`);
      onClientLogin(client);
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google admin login ───────────────────────────────────────────────────
  const handleGoogleAdminLogin = () => {
    setGoogleError(null);
    onOpenChange(false);
    setLoading(true);

    setTimeout(async () => {
      try {
        const result = await loginAdminWithGoogle();
        if (!result.success || !result.admin) {
          setLoading(false);
          setGoogleError(result.error || "Accès refusé.");
          setView('admin-access');
          onOpenChange(true);
          return;
        }
        toast.success(`Bienvenue Admin, ${result.admin.fullName} !`);
        onAdminLogin(result.admin);
        setLoading(false);
        resetForms();
      } catch (err: any) {
        setLoading(false);
        setGoogleError(err.message || "Erreur lors de la connexion Google.");
        setView('admin-access');
        onOpenChange(true);
      }
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-sm rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl"
        showCloseButton={false}
      >
        {/* No AnimatePresence / motion.div — plain conditional rendering to avoid DOM conflicts */}

        {/* ── CHOICE ── */}
        {view === 'choice' && (
          <div>
            <div className="bg-gradient-to-br from-primary to-[#D98A1E] p-8 text-white text-center">
              <div className="h-16 w-16 rounded-[20px] bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/30">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black text-white">Accès Neopay</DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-1">Choisissez votre type d'accès</DialogDescription>
            </div>
            <div className="p-6 space-y-3 bg-white">
              <button onClick={() => setView('client-login')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary/30 hover:bg-orange-50/30 transition-all group text-left active:scale-[0.98]">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-dark">Se connecter</p>
                  <p className="text-xs text-gray-500">Accéder à votre wallet client</p>
                </div>
              </button>
              <button onClick={() => setView('client-register')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group text-left active:scale-[0.98]">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <UserPlus className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-dark">Créer un compte</p>
                  <p className="text-xs text-gray-500">Nouveau chez Neopay ? Inscrivez-vous</p>
                </div>
              </button>
              <button onClick={() => setView('admin-access')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50/30 transition-all group text-left active:scale-[0.98]">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-dark">Accès Admin / Affilié</p>
                  <p className="text-xs text-gray-500">Espace professionnel Neopay</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── ADMIN ACCESS ── */}
        {view === 'admin-access' && (
          <div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white">
              <button onClick={() => { setView('choice'); setGoogleError(null); }}
                className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-white">Espace Professionnel</DialogTitle>
                  <DialogDescription className="text-white/60 text-xs mt-0.5">Accès administrateur ou affilié</DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connexion Administrateur</p>
                <GoogleBtn onClick={handleGoogleAdminLogin} label="Se connecter en tant qu'administrateur" loading={loading} />
                {googleError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed">{googleError}</p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Seuls les emails autorisés par Neopay peuvent accéder au tableau de bord admin.
                </p>
              </div>
              <Divider />
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Espace Affilié / Agent</p>
                <button onClick={() => { onAffiliateAccess(); handleClose(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50/30 transition-all group text-left active:scale-[0.98]">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-dark">Accès Affilié / Agent</p>
                    <p className="text-xs text-gray-500">Tableau de bord affiliés et agents</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENT LOGIN ── */}
        {view === 'client-login' && (
          <div>
            <div className="bg-gradient-to-br from-primary to-[#D98A1E] p-6 text-white">
              <button onClick={() => setView('choice')}
                className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <DialogTitle className="text-xl font-black text-white">Connexion Client</DialogTitle>
              <DialogDescription className="text-white/70 text-xs mt-1">Accédez à votre wallet Neopay</DialogDescription>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <GoogleBtn onClick={handleGoogleClientLogin} label="Se connecter avec Google" loading={loading} />
              <Divider />
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="votre@email.com" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••" className="pl-10 pr-10 h-11 rounded-xl border-gray-200" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-[#D98A1E] text-white font-black shadow-lg shadow-primary/30">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-2" />Connexion</>}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <button type="button" onClick={() => setView('client-register')} className="text-primary font-bold hover:underline">
                  S'inscrire
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── CLIENT REGISTER ── */}
        {view === 'client-register' && (
          <div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white">
              <button onClick={() => setView('choice')}
                className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <DialogTitle className="text-xl font-black text-white">Créer un compte</DialogTitle>
              <DialogDescription className="text-white/70 text-xs mt-1">Rejoignez Neopay gratuitement</DialogDescription>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <GoogleBtn onClick={handleGoogleClientLogin} label="S'inscrire avec Google" loading={loading} />
              <Divider label="ou manuellement" />
              <form onSubmit={handleRegister} className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={regName} onChange={e => setRegName(e.target.value)}
                      placeholder="Jean Dupont" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      placeholder="+509 XXXX XXXX" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="votre@email.com" className="pl-10 h-11 rounded-xl border-gray-200" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type={showPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="6 caractères minimum" className="pl-10 pr-10 h-11 rounded-xl border-gray-200" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Code parrain (optionnel)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={regSponsor} onChange={e => setRegSponsor(e.target.value)}
                      placeholder="Code affilié parrain" className="pl-10 h-11 rounded-xl border-gray-200" />
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5 mr-2" />Créer mon compte</>}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500">
                Déjà un compte ?{' '}
                <button type="button" onClick={() => setView('client-login')} className="text-primary font-bold hover:underline">
                  Se connecter
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── GOOGLE REGISTER — complete profile ── */}
        {view === 'google-register' && googleUser && (
          <div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
              <button onClick={() => setView('client-register')}
                className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <DialogTitle className="text-xl font-black text-white">Compléter votre profil</DialogTitle>
              <DialogDescription className="text-white/70 text-xs mt-1">Un dernier détail pour finaliser l'inscription</DialogDescription>
            </div>
            <form onSubmit={handleGoogleRegister} className="p-6 space-y-4 bg-white">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                {googleUser.photoUrl
                  ? <img src={googleUser.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  : <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center"><User className="h-5 w-5 text-blue-600" /></div>
                }
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-dark truncate">{googleUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{googleUser.email}</p>
                </div>
                <GoogleIcon />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={googleRegPhone} onChange={e => setGoogleRegPhone(e.target.value)}
                    placeholder="+509 XXXX XXXX" className="pl-10 h-11 rounded-xl border-gray-200" required autoFocus />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Code parrain (optionnel)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={googleRegSponsor} onChange={e => setGoogleRegSponsor(e.target.value)}
                    placeholder="Code affilié parrain" className="pl-10 h-11 rounded-xl border-gray-200" />
                </div>
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5 mr-2" />Créer mon compte</>}
              </Button>
            </form>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
