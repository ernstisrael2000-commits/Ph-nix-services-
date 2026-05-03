import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, User, Key, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { toast } from 'sonner';
import { checkAdminLogin, signInWithGoogleAdmin } from '../services/adminService';
import { AdminAccount } from '../types';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminAccount) => void;
  onBack: () => void;
}

export default function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      toast.error('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogleAdmin();
      if (result.success && result.admin) {
        toast.success(`Bienvenue, ${result.admin.fullName} !`);
        onLoginSuccess(result.admin);
      } else {
        toast.error(result.error || 'Erreur de connexion Google');
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de la connexion Google.');
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
              Connectez-vous pour gérer la plateforme Neopay.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Entrez votre nom"
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
                className="w-full h-14 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-2xl shadow-lg shadow-accent-light/50 transition-all active:scale-[0.98] mt-4"
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

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">OU</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="w-full h-14 rounded-2xl border-gray-100 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
                Se connecter avec Google
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
