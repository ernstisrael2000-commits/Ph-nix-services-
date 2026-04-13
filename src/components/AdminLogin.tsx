import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { loginAdmin } from '../services/adminAuthService';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, User, Key } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const admin = await loginAdmin(cleanUsername, cleanPassword);
      if (admin) {
        toast.success(`Bienvenue, ${admin.name || admin.username} !`);
        // The auth state will be updated by onAuthStateChanged or useAuth
      } else {
        toast.error("Identifiants incorrects.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card className="shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Espace Administrateur</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à la gestion Neopay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  placeholder="admin_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Accès réservé au personnel autorisé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
