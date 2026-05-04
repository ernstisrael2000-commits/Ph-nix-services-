import React, { useState } from 'react';
import { GraduationCap, Search, BookOpen, Loader2, SlidersHorizontal } from 'lucide-react';
import { Formation, FormationProgress, FormationPurchase } from '../../types';
import FormationCard from './FormationCard';
import { motion } from 'motion/react';

const levelOptions = [
  { value: 'all', label: 'Tous les niveaux' },
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
];

interface FormationsPageProps {
  formations: Formation[];
  loading: boolean;
  purchases: FormationPurchase[];
  progressList: FormationProgress[];
  onSelectFormation: (f: Formation) => void;
}

export default function FormationsPage({ formations, loading, purchases, progressList, onSelectFormation }: FormationsPageProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const getProgress = (id: string) => progressList.find(p => p.formationId === id) ?? null;
  const isPurchased = (id: string) => purchases.some(p => p.formationId === id && p.status === 'active');

  const filtered = formations.filter(f => {
    const matchSearch = !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.shortDescription.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || f.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-w-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-primary text-xs font-black uppercase tracking-widest">Neopay Formations</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Développez vos<br />
              <span className="text-primary">compétences</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Des formations professionnelles adaptées au marché haïtien. Apprenez à votre rythme, progressez à votre vitesse.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border-b sticky top-[104px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext" />
            <input
              type="text"
              placeholder="Rechercher une formation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 h-11 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm font-medium bg-gray-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-subtext shrink-0" />
            <div className="flex gap-2">
              {levelOptions.map(opt => (
                <button key={opt.value} onClick={() => setLevelFilter(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${levelFilter === opt.value ? 'bg-primary text-white' : 'bg-gray-100 text-subtext hover:bg-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Formations Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-xl font-black text-dark">Aucune formation trouvée</p>
            <p className="text-subtext text-sm mt-1">Modifiez vos filtres ou revenez bientôt</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-subtext font-bold mb-6">{filtered.length} formation{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <FormationCard
                    formation={f}
                    progress={getProgress(f.id!)}
                    purchased={isPurchased(f.id!)}
                    onClick={() => onSelectFormation(f)}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
