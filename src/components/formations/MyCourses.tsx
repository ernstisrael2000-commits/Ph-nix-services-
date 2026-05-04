import React from 'react';
import { BookOpen, Clock, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { Formation, FormationProgress, FormationPurchase } from '../../types';
import { motion } from 'motion/react';

interface MyCoursesProps {
  formations: Formation[];
  purchases: FormationPurchase[];
  progressList: FormationProgress[];
  loading: boolean;
  onSelectFormation: (f: Formation) => void;
  onLogin: () => void;
  userId: string | null;
}

export default function MyCourses({ formations, purchases, progressList, loading, onSelectFormation, onLogin, userId }: MyCoursesProps) {
  const myFormations = formations.filter(f => purchases.some(p => p.formationId === f.id && p.status === 'active'));
  const pendingFormations = purchases.filter(p => p.status === 'pending');

  const getProgress = (formationId: string): FormationProgress | undefined =>
    progressList.find(p => p.formationId === formationId);

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-black text-dark mb-2">Connectez-vous pour voir vos cours</h3>
        <p className="text-subtext text-sm mb-6">Accédez à toutes vos formations achetées</p>
        <button onClick={onLogin} className="px-6 py-3 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-2xl transition-all shadow-lg shadow-primary/20">
          Se connecter avec Google
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-dark">Mes formations</h2>
        <p className="text-subtext text-sm mt-1">Continuez votre apprentissage là où vous vous êtes arrêté</p>
      </div>

      {/* Pending */}
      {pendingFormations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-3">En attente de validation</h3>
          <div className="space-y-2">
            {pendingFormations.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-dark text-sm">{p.formationTitle}</p>
                  <p className="text-xs text-amber-600">Demande soumise • En attente de l'admin</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myFormations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-subtext">Aucune formation achetée</p>
          <p className="text-xs text-gray-400 mt-1">Explorez notre catalogue et achetez votre première formation</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {myFormations.map(formation => {
            const progress = getProgress(formation.id!);
            const pct = progress?.percentage ?? 0;
            const totalDuration = formation.modules.reduce((acc, m) => {
              const [min = 0] = m.duration.split(':').map(Number);
              return acc + min;
            }, 0);

            return (
              <motion.div key={formation.id}
                whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400 }}
                onClick={() => onSelectFormation(formation)}
                className="cursor-pointer bg-white rounded-3xl overflow-hidden border-2 border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                  {formation.coverImage && (
                    <img src={formation.coverImage} alt={formation.title} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white text-xs font-bold mt-1">{pct}% complété</p>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-dark text-base leading-tight mb-1 line-clamp-2">{formation.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-subtext mb-4">
                    <div className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{formation.modules.length} leçons</div>
                    <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{totalDuration} min</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {pct === 100 ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-black">Terminé !</span>
                        </div>
                      ) : (
                        <p className="text-xs text-subtext">{progress?.completedModules.length ?? 0}/{formation.modules.length} leçons</p>
                      )}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-[#D98A1E] transition-all">
                      <Play className="h-3.5 w-3.5" />{pct > 0 ? 'Continuer' : 'Commencer'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
