import React from 'react';
import { Star, Users, Clock, BookOpen, Lock, CheckCircle2, PlayCircle } from 'lucide-react';
import { Formation, FormationProgress } from '../../types';
import { motion } from 'motion/react';

const levelConfig = {
  debutant: { label: 'Débutant', color: 'bg-emerald-100 text-emerald-700' },
  intermediaire: { label: 'Intermédiaire', color: 'bg-amber-100 text-amber-700' },
  avance: { label: 'Avancé', color: 'bg-red-100 text-red-700' },
};

interface FormationCardProps {
  formation: Formation;
  progress?: FormationProgress | null;
  purchased?: boolean;
  onClick: () => void;
}

export default function FormationCard({ formation, progress, purchased, onClick }: FormationCardProps) {
  const lvl = levelConfig[formation.level] || levelConfig.debutant;
  const pct = progress?.percentage ?? 0;
  const totalDuration = formation.modules.reduce((acc, m) => {
    const [min = 0, sec = 0] = m.duration.split(':').map(Number);
    return acc + min + sec / 60;
  }, 0);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 hover:border-primary/20 transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="relative h-44 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {formation.coverImage ? (
          <img src={formation.coverImage} alt={formation.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${lvl.color}`}>
            {lvl.label}
          </span>
        </div>
        {purchased && (
          <div className="absolute top-3 right-3">
            <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Acheté
            </span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <PlayCircle className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Progress Bar */}
      {purchased && (
        <div className="h-1.5 w-full bg-gray-100">
          <div className="h-full bg-gradient-to-r from-primary to-[#D98A1E] transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="font-black text-dark text-base leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {formation.title}
        </h3>
        <p className="text-subtext text-xs leading-relaxed line-clamp-2 mb-4">
          {formation.shortDescription}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-subtext mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-dark">{formation.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>{formation.studentsCount.toLocaleString()} étudiants</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            <span>{formation.modules.length} leçons</span>
          </div>
          {totalDuration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span>{Math.round(totalDuration)}min</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {purchased && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-subtext uppercase tracking-wider">Progression</span>
              <span className={`text-[11px] font-black ${pct === 100 ? 'text-emerald-600' : 'text-primary'}`}>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-[#D98A1E] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-subtext mt-1">
              {pct === 0 ? 'Pas commencé' : pct === 100 ? '✅ Terminé !' : `En cours • ${progress?.completedModules.length}/${formation.modules.length} leçons`}
            </p>
          </div>
        )}

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div>
            {formation.price === 0 ? (
              <span className="text-lg font-black text-emerald-600">Gratuit</span>
            ) : (
              <div>
                <span className="text-lg font-black text-dark">{formation.price.toLocaleString()}</span>
                <span className="text-xs font-bold text-subtext ml-1">HTG</span>
              </div>
            )}
          </div>
          <button className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            purchased
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-primary text-white hover:bg-[#D98A1E] shadow-sm'
          }`}>
            {purchased ? (pct === 100 ? 'Revoir' : 'Continuer') : (formation.price === 0 ? 'Commencer' : 'Acheter')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
