import React, { useState } from 'react';
import { GraduationCap, BookOpen, User, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Formation, FormationPurchase, FormationProgress } from '../../types';
import { useFormations, useUserPurchases, useAllProgress, signInWithGoogle } from '../../services/formationService';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import FormationsPage from './FormationsPage';
import FormationDetail from './FormationDetail';
import MyCourses from './MyCourses';
import { toast } from 'sonner';
import { motion } from 'motion/react';

type SubTab = 'catalogue' | 'mes-cours';

export default function FormationsView() {
  const { user } = useAuth();
  const { formations, loading } = useFormations(true);
  const { purchases } = useUserPurchases(user?.uid || null);
  const progressList = useAllProgress(user?.uid || null);

  const [subTab, setSubTab] = useState<SubTab>('catalogue');
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Connecté avec Google !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur de connexion Google.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Déconnecté.');
  };

  if (selectedFormation) {
    return (
      <FormationDetail
        formation={selectedFormation}
        userId={user?.uid || null}
        userEmail={user?.email || ''}
        userName={user?.displayName || ''}
        purchases={purchases}
        onBack={() => setSelectedFormation(null)}
        onRequestLogin={handleGoogleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub Navigation */}
      <div className="bg-white border-b sticky top-16 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {([
                { key: 'catalogue', icon: GraduationCap, label: 'Formations' },
                { key: 'mes-cours', icon: BookOpen, label: 'Mes cours' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setSubTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${subTab === tab.key ? 'text-primary border-primary' : 'text-subtext border-transparent hover:text-dark'}`}>
                  <tab.icon className="h-4 w-4" />{tab.label}
                  {tab.key === 'mes-cours' && purchases.length > 0 && (
                    <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{purchases.filter(p => p.status === 'active').length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Auth area */}
            <div className="flex items-center gap-2 py-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt={user.displayName || ''} className="h-7 w-7 rounded-full border"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&size=32`; }} />
                  <span className="text-xs font-bold text-dark hidden sm:block">{user.displayName?.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-subtext hover:text-red-500 transition-colors">
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={handleGoogleLogin} disabled={loginLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-[#D98A1E] text-white text-xs font-black rounded-xl transition-all disabled:opacity-60">
                  {loginLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Connexion Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {subTab === 'catalogue' && (
        <FormationsPage
          formations={formations}
          loading={loading}
          purchases={purchases}
          progressList={progressList}
          onSelectFormation={setSelectedFormation}
        />
      )}

      {subTab === 'mes-cours' && (
        <MyCourses
          formations={formations}
          purchases={purchases}
          progressList={progressList}
          loading={loading}
          onSelectFormation={setSelectedFormation}
          onLogin={handleGoogleLogin}
          userId={user?.uid || null}
        />
      )}
    </div>
  );
}
