import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, BookOpen, LogIn, LogOut, Loader2, Home, Menu, X, ChevronRight, Search, Bell, Settings } from 'lucide-react';
import { Formation, FormationPurchase, FormationProgress } from '../../types';
import { useFormations, useUserPurchases, useAllProgress, signInWithGoogle } from '../../services/formationService';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import FormationsPage from './FormationsPage';
import FormationDetail from './FormationDetail';
import MyCourses from './MyCourses';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

type SubTab = 'catalogue' | 'mes-cours';

interface FormationsViewProps {
  onGoHome?: () => void;
}

export default function FormationsView({ onGoHome }: FormationsViewProps) {
  const { user } = useAuth();
  const { formations, loading } = useFormations(true);
  const { purchases } = useUserPurchases(user?.uid || null);
  const progressList = useAllProgress(user?.uid || null);

  const [subTab, setSubTab] = useState<SubTab>('catalogue');
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  const activeCount = purchases.filter(p => p.status === 'active').length;

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
    setBurgerOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    };
    if (burgerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [burgerOpen]);

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

  const tabs = [
    { key: 'catalogue' as SubTab, icon: GraduationCap, label: 'Formations' },
    { key: 'mes-cours' as SubTab, icon: BookOpen, label: 'Mes cours', badge: activeCount > 0 ? activeCount : undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Formations top bar — sticky below main navbar */}
      <div className="bg-white border-b sticky top-14 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex items-center h-12 gap-1">

            {/* Tabs */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              {tabs.map(tab => {
                const active = subTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSubTab(tab.key)}
                    className={`relative flex flex-col items-center justify-center gap-0 px-3 sm:px-4 h-12 min-w-[64px] transition-all duration-200 border-b-2 group ${
                      active ? 'border-primary' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <tab.icon className={`h-4 w-4 transition-colors ${active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 transition-colors ${
                      active ? 'text-primary' : 'text-gray-400/60 group-hover:text-gray-500'
                    }`}>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 bg-primary text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: user + burger */}
            <div className="flex items-center gap-1.5 shrink-0">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <img
                    src={user.photoURL || ''}
                    alt={user.displayName || ''}
                    className="h-7 w-7 rounded-full border-2 border-primary/20"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&size=32`;
                    }}
                  />
                  <span className="text-xs font-bold text-gray-700 hidden sm:block max-w-[80px] truncate">{user.displayName?.split(' ')[0]}</span>
                </div>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loginLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-[#D98A1E] text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-60"
                >
                  {loginLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                  <span className="hidden xs:inline">Connexion</span>
                </button>
              )}

              {/* Burger button */}
              <div className="relative" ref={burgerRef}>
                <button
                  onClick={() => setBurgerOpen(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Options"
                >
                  {burgerOpen ? <X className="h-4 w-4 text-gray-600" /> : <Menu className="h-4 w-4 text-gray-600" />}
                </button>

                <AnimatePresence>
                  {burgerOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                    >
                      {/* User info in menu */}
                      {user && (
                        <div className="px-4 py-3 border-b bg-gray-50">
                          <p className="text-xs font-bold text-gray-800 truncate">{user.displayName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      )}

                      <div className="p-1.5 space-y-0.5">
                        {/* Home */}
                        {onGoHome && (
                          <button
                            onClick={() => { onGoHome(); setBurgerOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Home className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>Accueil</span>
                            <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300" />
                          </button>
                        )}

                        {/* Catalogue */}
                        <button
                          onClick={() => { setSubTab('catalogue'); setBurgerOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${subTab === 'catalogue' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <GraduationCap className="h-4 w-4 shrink-0" />
                          <span>Catalogue</span>
                          {subTab === 'catalogue' && <ChevronRight className="h-3.5 w-3.5 ml-auto text-primary" />}
                        </button>

                        {/* Mes cours */}
                        <button
                          onClick={() => { setSubTab('mes-cours'); setBurgerOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${subTab === 'mes-cours' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <BookOpen className="h-4 w-4 shrink-0" />
                          <span>Mes cours</span>
                          {activeCount > 0 && (
                            <span className="ml-auto bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeCount}</span>
                          )}
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        {/* Login/logout */}
                        {user ? (
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span>Se déconnecter</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleGoogleLogin(); setBurgerOpen(false); }}
                            disabled={loginLoading}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-[#D98A1E] transition-colors disabled:opacity-60"
                          >
                            {loginLoading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <LogIn className="h-4 w-4 shrink-0" />}
                            <span>Connexion Google</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {subTab === 'catalogue' && (
          <motion.div key="catalogue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <FormationsPage
              formations={formations}
              loading={loading}
              purchases={purchases}
              progressList={progressList}
              onSelectFormation={setSelectedFormation}
            />
          </motion.div>
        )}
        {subTab === 'mes-cours' && (
          <motion.div key="mes-cours" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <MyCourses
              formations={formations}
              purchases={purchases}
              progressList={progressList}
              loading={loading}
              onSelectFormation={setSelectedFormation}
              onLogin={handleGoogleLogin}
              userId={user?.uid || null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
