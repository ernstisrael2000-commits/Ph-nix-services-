import React, { useState } from 'react';
import { ArrowLeft, Star, Users, BookOpen, Clock, FileText, Download, Lock, CheckCircle2, Play, ChevronDown, ChevronUp, Loader2, ShoppingCart, Wallet } from 'lucide-react';
import { Formation, FormationProgress, FormationPurchase } from '../../types';
import { markModuleCompleted, useFormationProgress, requestFormationAccess } from '../../services/formationService';
import VideoPlayer from './VideoPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useSettings } from '../../services/parcelService';

const levelLabel = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
const levelColor = { debutant: 'bg-emerald-100 text-emerald-700', intermediaire: 'bg-amber-100 text-amber-700', avance: 'bg-red-100 text-red-700' };

interface FormationDetailProps {
  formation: Formation;
  userId: string | null;
  userEmail: string;
  userName: string;
  purchases: FormationPurchase[];
  onBack: () => void;
  onRequestLogin: () => void;
}

export default function FormationDetail({ formation, userId, userEmail, userName, purchases, onBack, onRequestLogin }: FormationDetailProps) {
  const { settings } = useSettings();
  const adminPhone = settings?.whatsappAdminNumber || '+50944813185';
  const purchased = purchases.some(p => p.formationId === formation.id && p.status === 'active');
  const pendingRequest = purchases.some(p => p.formationId === formation.id && p.status === 'pending');

  const { progress, refresh: refreshProgress } = useFormationProgress(userId, formation.id || null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [completingModule, setCompletingModule] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyMethod, setBuyMethod] = useState('MonCash');
  const [buyLoading, setBuyLoading] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const sortedModules = [...formation.modules].sort((a, b) => a.order - b.order);
  const activeModule = sortedModules[activeModuleIdx];
  const pct = progress?.percentage ?? 0;

  const handleMarkComplete = async () => {
    if (!userId || !activeModule) return;
    setCompletingModule(activeModule.id);
    try {
      await markModuleCompleted(userId, userEmail, formation.id!, activeModule.id, sortedModules.length);
      refreshProgress();
      toast.success('✅ Leçon marquée comme terminée !');
      if (activeModuleIdx < sortedModules.length - 1) {
        setTimeout(() => setActiveModuleIdx(i => i + 1), 600);
      }
    } catch {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setCompletingModule(null);
    }
  };

  const handleBuy = async () => {
    if (!userId) { onRequestLogin(); return; }
    setBuyLoading(true);
    try {
      await requestFormationAccess(userId, userEmail, userName, formation, buyMethod, adminPhone);
      toast.success('Demande envoyée ! Vous serez redirigé vers WhatsApp pour finaliser.');
      setShowBuyModal(false);
    } catch {
      toast.error('Erreur lors de la demande.');
    } finally {
      setBuyLoading(false);
    }
  };

  const totalDuration = sortedModules.reduce((acc, m) => {
    const [min = 0, sec = 0] = m.duration.split(':').map(Number);
    return acc + min + sec / 60;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">Retour aux formations</span>
          </button>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${levelColor[formation.level]}`}>
                {levelLabel[formation.level]}
              </span>
              <h1 className="text-3xl font-black mt-4 mb-3 leading-tight">{formation.title}</h1>
              <p className="text-white/70 text-base leading-relaxed mb-6">{formation.description}</p>

              <div className="flex flex-wrap items-center gap-5 text-sm text-white/60">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(formation.rating) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                    ))}
                  </div>
                  <span className="font-bold text-white">{formation.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /><span>{formation.studentsCount.toLocaleString()} étudiants</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /><span>{sortedModules.length} leçons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /><span>{Math.round(totalDuration)} min</span>
                </div>
              </div>
            </div>

            {/* Purchase Card (Desktop) */}
            <div className="hidden md:block">
              <div className="bg-white rounded-3xl p-6 text-dark shadow-2xl">
                {formation.coverImage && (
                  <img src={formation.coverImage} alt={formation.title} className="w-full h-36 object-cover rounded-2xl mb-4" />
                )}
                {purchased ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 rounded-2xl p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Progression</span>
                        <span className="text-lg font-black text-emerald-600">{pct}%</span>
                      </div>
                      <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button onClick={() => setActiveModuleIdx(0)} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all">
                      <Play className="h-5 w-5" />{pct > 0 ? 'Continuer' : 'Commencer'}
                    </button>
                  </div>
                ) : pendingRequest ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                      <p className="font-black text-amber-700">En attente de validation</p>
                      <p className="text-xs text-amber-600 mt-1">L'admin validera votre accès sous peu.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center mb-2">
                      {formation.price === 0
                        ? <p className="text-3xl font-black text-emerald-600">Gratuit</p>
                        : <><p className="text-3xl font-black text-dark">{formation.price.toLocaleString()} HTG</p><p className="text-xs text-subtext">Accès à vie</p></>
                      }
                    </div>
                    <button onClick={() => formation.price === 0 ? handleBuy() : setShowBuyModal(true)}
                      className="w-full h-12 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
                      <ShoppingCart className="h-5 w-5" />{formation.price === 0 ? 'Commencer maintenant' : 'Acheter'}
                    </button>
                    <ul className="space-y-2 text-sm text-subtext">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Accès illimité</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{sortedModules.length} vidéos de cours</li>
                      {formation.pdfUrl && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />PDF inclus</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile purchase bar */}
      {!purchased && !pendingRequest && (
        <div className="md:hidden sticky top-16 z-30 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
          <div>
            {formation.price === 0
              ? <span className="font-black text-emerald-600">Gratuit</span>
              : <span className="font-black text-dark">{formation.price.toLocaleString()} HTG</span>
            }
          </div>
          <button onClick={() => formation.price === 0 ? handleBuy() : setShowBuyModal(true)}
            className="px-5 py-2.5 bg-primary text-white font-black rounded-xl text-sm flex items-center gap-2 shadow-sm">
            <ShoppingCart className="h-4 w-4" />Acheter
          </button>
        </div>
      )}

      {/* Progress bar (mobile, if purchased) */}
      {purchased && (
        <div className="md:hidden bg-white border-b px-4 py-3">
          <div className="flex justify-between mb-1 text-xs font-bold">
            <span className="text-subtext">Progression</span>
            <span className="text-primary">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-[#D98A1E] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* Video Player */}
            {activeModule && (
              <div>
                <h2 className="text-lg font-black text-dark mb-3">
                  Leçon {activeModuleIdx + 1} : {activeModule.title}
                </h2>
                <VideoPlayer
                  videoUrl={activeModule.videoUrl}
                  locked={!purchased}
                  title={activeModule.title}
                  completed={!!progress?.completedModules.includes(activeModule.id)}
                  onComplete={handleMarkComplete}
                  loading={completingModule === activeModule.id}
                />
              </div>
            )}

            {/* Modules List */}
            <div>
              <h2 className="text-xl font-black text-dark mb-4">Contenu du cours</h2>
              <div className="space-y-2">
                {sortedModules.map((module, idx) => {
                  const isCompleted = progress?.completedModules.includes(module.id);
                  const isActive = idx === activeModuleIdx;
                  return (
                    <button key={module.id} onClick={() => setActiveModuleIdx(idx)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        isActive ? 'border-primary bg-primary/5' : isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                        isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-gray-100 text-subtext'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span>{idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isActive ? 'text-primary' : 'text-dark'}`}>{module.title}</p>
                        {module.description && <p className="text-xs text-subtext truncate">{module.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-subtext font-mono">{module.duration}</span>
                        {!purchased && <Lock className="h-3.5 w-3.5 text-subtext/40" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PDF / Resources */}
            {purchased && (formation.pdfUrl || (formation.resources && formation.resources.length > 0)) && (
              <div>
                <h2 className="text-xl font-black text-dark mb-4">Ressources</h2>
                <div className="space-y-2">
                  {formation.pdfUrl && (
                    <a href={formation.pdfUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl border-2 border-red-100 bg-red-50 hover:border-red-200 transition-all group">
                      <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-dark text-sm">Document PDF</p>
                        <p className="text-xs text-subtext">Matériel de cours complet</p>
                      </div>
                      <Download className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {formation.resources?.map(res => (
                    <a key={res.id} href={res.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:border-blue-200 transition-all group">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Download className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-dark text-sm">{res.name}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (sticky purchase card on desktop) — rendered above in header */}
          <div className="hidden md:block" />
        </div>
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBuyModal(false)} />
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl">
              <h3 className="text-xl font-black text-dark mb-1">Acheter la formation</h3>
              <p className="text-sm text-subtext mb-5">{formation.title}</p>
              <div className="bg-primary/5 rounded-2xl p-4 mb-5 flex justify-between items-center">
                <span className="font-bold text-subtext">Prix</span>
                <span className="text-2xl font-black text-primary">{formation.price.toLocaleString()} HTG</span>
              </div>
              <p className="text-xs font-black text-subtext uppercase tracking-widest mb-2">Moyen de paiement</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {['MonCash', 'NatCash', 'Admi'].map(m => (
                  <button key={m} onClick={() => setBuyMethod(m)}
                    className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${buyMethod === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 text-subtext hover:border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {!userId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 font-bold">
                  Vous devez être connecté avec Google pour acheter une formation.
                </div>
              )}
              <button onClick={handleBuy} disabled={buyLoading || !userId}
                className="w-full h-12 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50">
                {buyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShoppingCart className="h-5 w-5" />Confirmer & envoyer WhatsApp</>}
              </button>
              {!userId && (
                <button onClick={onRequestLogin} className="w-full mt-2 h-11 border-2 border-gray-100 text-subtext font-bold rounded-2xl text-sm hover:border-primary hover:text-primary transition-all">
                  Se connecter avec Google
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
