import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, Loader2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { checkAdminLogin } from '../services/adminService';
import { AdminAccount } from '../types';
import { toast } from 'sonner';

interface AdminLoginProps {
  onLogin: (admin: AdminAccount) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeField, setShowCodeField] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !password) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const result = await checkAdminLogin(fullName, password, loginCode);
      
      if (result.success && result.admin) {
        toast.success(`Bienvenue, ${result.admin.fullName}`);
        onLogin(result.admin);
      } else {
        toast.error(result.error || "Échec de l'authentification.");
        // If it looks like a super admin attempt (e.g. name matches Ernst), suggest entering a code
        if (fullName.toLowerCase().includes('ernst') && !loginCode) {
           setShowCodeField(true);
           toast.info("Un code de connexion est requis pour ce compte.");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
        <div className="h-2 bg-primary" />
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto bg-accent-light w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-accent-light/50 rotate-3 transform transition-transform hover:rotate-0">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-dark">Accès Administrateur</CardTitle>
          <CardDescription className="text-subtext text-sm mt-1">
            Connectez-vous pour gérer Neopay Logistics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-bold text-subtext uppercase tracking-wider pl-1">
                Nom Complet
              </Label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-subtext group-focus-within:text-primary transition-colors" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ex: Ernst Israel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-12 h-12 rounded-2xl border-muted bg-muted/50 focus:bg-white focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-subtext uppercase tracking-wider pl-1">
                Mot de Passe
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-subtext group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 rounded-2xl border-muted bg-muted/50 focus:bg-white focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {(showCodeField || fullName.toLowerCase().includes('ernst')) && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="loginCode" className="text-xs font-bold text-primary uppercase tracking-wider pl-1 flex items-center gap-2">
                  <Key className="h-3 w-3" />
                  Code de Connexion
                </Label>
                <div className="relative group">
                  <Key className="absolute left-4 top-3.5 h-5 w-5 text-primary/70 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="loginCode"
                    type="text"
                    maxLength={10}
                    placeholder="Entrez votre code unique"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value)}
                    className="pl-12 h-12 rounded-2xl border-accent-light bg-accent-light/30 focus:bg-white focus:ring-primary focus:border-primary transition-all font-mono tracking-widest text-dark"
                  />
                </div>
                <p className="text-[10px] text-primary leading-tight px-1 font-medium">
                  Requis pour l'administrateur principal. Sécurité renforcée activée.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-[#D98A1E] text-white font-black text-lg shadow-xl shadow-accent-light/50 transition-all active:scale-[0.98] mt-4 border-0"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Se Connecter"
              )}
            </Button>
          </form>

          <div className="mt-10 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
             <Info className="h-5 w-5 text-amber-500 shrink-0" />
             <div className="space-y-1">
               <p className="text-[11px] font-bold text-amber-900">Sécurité de Connexion</p>
               <p className="text-[10px] text-amber-700 leading-tight">
                 Après 5 tentatives infructueuses, le compte sera bloqué pendant 15 minutes pour prévenir les intrusions.
               </p>
             </div>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-center mt-8 text-subtext/60 text-xs font-medium">
        © Neopay Logistics Administration
      </p>
    </div>
  );
}
