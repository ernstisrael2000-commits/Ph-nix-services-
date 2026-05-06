import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Users, Star, Clock, Play, Award,
  CheckCircle2, X, Wallet, Loader2, BookOpen, Lock,
  ChevronRight, TrendingUp, Zap, Globe, Tag, User,
  FileText, Layers, BadgeCheck, Percent, MessageSquare,
  ChevronDown, ChevronUp, Video, Download, ExternalLink
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { Formation, FormationModule, FormationChapter } from '../types';
import { Client } from '../types';
import { toast } from 'sonner';

interface FormationsViewProps {
  loggedClient: Client | null;
  onOpenWallet: () => void;
}

const levelLabels: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};
const levelColors: Record<string, string> = {
  debutant: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  intermediaire: 'bg-blue-100 text-blue-700 border-blue-200',
  avance: 'bg-purple-100 text-purple-700 border-purple-200',
};
const levelGradients: Record<string, string> = {
  debutant: 'from-emerald-500 to-teal-600',
  intermediaire: 'from-blue-500 to-blue-700',
  avance: 'from-purple-500 to-indigo-700',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-semibold">{rating > 0 ? rating.toFixed(1) : '—'}</span>
    </div>
  );
}

function ModuleList({ modules, chapters, isOwned }: { modules: FormationModule[]; chapters?: FormationChapter[]; isOwned: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? modules : modules.slice(0, 4);

  const getChapterTitle = (chapterId?: string) => {
    if (!chapterId || !chapters) return null;
    return chapters.find(c => c.id === chapterId)?.title || null;
  };

  let lastChapter: string | null = null;

  return (
    <div className="space-y-1.5">
      {visible.map((mod, idx) => {
        const chapterTitle = getChapterTitle(mod.chapterId);
        const showChapterHeader = chapterTitle && chapterTitle !== lastChapter;
        lastChapter = chapterTitle;
        return (
          <div key={mod.id}>
            {showChapterHeader && (
              <div className="flex items-center gap-2 py-1.5 px-2 mb-1">
                <Layers className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{chapterTitle}</span>
              </div>
            )}
            <div className="flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition-colors group">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-dark truncate">{mod.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {mod.duration && (
                    <span className="text-[10px] text-subtext flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />{mod.duration}
                    </span>
                  )}
                  {mod.pdfUrl && (
                    <span className="text-[10px] text-blue-500 flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" />PDF
                    </span>
                  )}
                </div>
              </div>
              {isOwned ? (
                mod.videoUrl ? (
                  <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <Play className="h-3 w-3 text-primary fill-primary" />
                  </a>
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )
              ) : (
                <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              )}
            </div>
          </div>
        );
      })}
      {modules.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-semibold hover:underline py-1"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Réduire</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Voir {modules.length - 4} modules de plus</>
          )}
        </button>
      )}
    </div>
  );
}

export default function FormationsView({ loggedClient, onOpenWallet }: FormationsViewProps) {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Formation | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/formations')
      .then(r => r.json())
      .then(data => setFormations(data.formations || []))
      .catch(() => toast.error('Impossible de charger les formations.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loggedClient?.id) return;
    fetch(`/api/formations/purchases/user/${loggedClient.id}`)
      .then(r => r.json())
      .then(data => {
        const active = (data.purchases || [])
          .filter((p: any) => p.status === 'active')
          .map((p: any) => p.formationId);
        setPurchasedIds(active);
      })
      .catch(() => {});
  }, [loggedClient?.id]);

  const handleWalletPurchase = async (formation: Formation) => {
    if (!loggedClient) { onOpenWallet(); return; }
    if ((loggedClient.balance ?? 0) < (formation.price ?? 0)) {
      toast.error(`Solde insuffisant. Vous avez ${(loggedClient.balance ?? 0).toLocaleString()} HTG.`);
      onOpenWallet();
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch('/api/formations/purchases/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: loggedClient.id,
          clientName: loggedClient.name,
          formationId: formation.id,
          formationTitle: formation.title,
          amount: formation.price,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de l\'achat.');
      setPurchasedIds(prev => [...prev, formation.id!]);
      toast.success(`✅ Accès à "${formation.title}" activé !`);
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(formations.map(f => f.category).filter(Boolean) as string[]))];

  const filtered = formations.filter(f => {
    const matchLevel = filterLevel === 'all' || f.level === filterLevel;
    const matchCat = filterCategory === 'all' || f.category === filterCategory;
    const matchSearch = !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase()) || (f.instructor || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchCat && matchSearch;
  });

  const isOwned = (f: Formation) => !!f.id && purchasedIds.includes(f.id);

  const discount = (f: Formation) => f.originalPrice && f.originalPrice > f.price
    ? Math.round((1 - f.price / f.originalPrice) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-subtext font-medium">Chargement des formations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden mb-10 bg-gradient-to-br from-primary via-blue-700 to-indigo-900 p-8 sm:p-12 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold mb-5 border border-white/20">
            <GraduationCap className="h-4 w-4" />
            Centre de Formations Neopay
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight">
            Développez vos<br />
            <span className="text-blue-200">compétences</span>
          </h1>
          <p className="text-white/70 max-w-lg text-base mb-6">
            Accédez à nos formations professionnelles et montez en compétences à votre rythme. Payez directement avec votre Wallet Neopay.
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { icon: BookOpen, label: `${formations.length} formations` },
              { icon: Users, label: `${formations.reduce((s, f) => s + (f.studentsCount || 0), 0).toLocaleString()} étudiants` },
              { icon: Award, label: `${formations.filter(f => f.hasCertificate).length} certifiantes` },
              { icon: Globe, label: `${categories.length - 1} catégories` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/80 font-semibold">
                <Icon className="h-4 w-4 text-blue-300" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 mb-8"
      >
        {/* Search */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Rechercher une formation ou un instructeur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-12 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
          />
        </div>

        {/* Level filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-bold text-subtext uppercase tracking-wider self-center mr-1">Niveau :</span>
          {['all', 'debutant', 'intermediaire', 'avance'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filterLevel === lvl
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary'
              }`}
            >
              {lvl === 'all' ? 'Tous' : levelLabels[lvl]}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs font-bold text-subtext uppercase tracking-wider self-center mr-1">Catégorie :</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  filterCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {cat === 'all' ? 'Toutes' : cat}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <p className="text-subtext font-medium">Aucune formation trouvée.</p>
          <p className="text-sm text-subtext/60 mt-1">Essayez de modifier vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((formation, i) => {
            const owned = isOwned(formation);
            const disc = discount(formation);
            return (
              <motion.div
                key={formation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(formation)}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col"
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shrink-0">
                  {formation.coverImage ? (
                    <img
                      src={formation.coverImage}
                      alt={formation.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${levelGradients[formation.level] || 'from-blue-500 to-blue-700'}`}>
                      <GraduationCap className="h-20 w-20 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${levelColors[formation.level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {levelLabels[formation.level] || formation.level}
                    </span>
                    {formation.hasCertificate && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <BadgeCheck className="h-2.5 w-2.5" /> Certifiant
                      </span>
                    )}
                  </div>

                  {/* Discount badge */}
                  {disc > 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-xl text-[10px] font-black">
                      -{disc}%
                    </div>
                  )}

                  {/* Owned badge */}
                  {owned && (
                    <div className="absolute bottom-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Accès activé
                    </div>
                  )}

                  {/* Play hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-xl">
                      <Play className="h-6 w-6 text-primary fill-primary" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Category + Language */}
                  {(formation.category || formation.language) && (
                    <div className="flex items-center gap-2 mb-2">
                      {formation.category && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" />{formation.category}
                        </span>
                      )}
                      {formation.language && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                          <Globe className="h-2.5 w-2.5" />{formation.language}
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="font-black text-dark text-base mb-1.5 line-clamp-2 leading-snug">{formation.title}</h3>
                  <p className="text-xs text-subtext line-clamp-2 mb-3 flex-1">{formation.shortDescription || formation.description}</p>

                  {/* Instructor */}
                  {formation.instructor && (
                    <div className="flex items-center gap-1.5 mb-3">
                      {formation.instructorAvatar ? (
                        <img src={formation.instructorAvatar} className="h-5 w-5 rounded-full object-cover border border-gray-200" onError={e => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <span className="text-xs text-subtext">{formation.instructor}</span>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-subtext mb-3">
                    {formation.totalDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{formation.totalDuration}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {(formation.modules || []).length} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {(formation.studentsCount || 0).toLocaleString()}
                    </span>
                  </div>

                  <StarRating rating={formation.rating || 0} />

                  {/* Price + Tags */}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-primary">
                          {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
                        </span>
                        {formation.originalPrice && formation.originalPrice > formation.price && (
                          <span className="text-xs text-gray-400 line-through">{formation.originalPrice.toLocaleString()} HTG</span>
                        )}
                      </div>
                      {formation.enrollmentLimit && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          {formation.enrollmentLimit - (formation.studentsCount || 0)} places restantes
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                      Voir <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <AnimatePresence>
        {selected && (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
              {/* Cover */}
              <div className="relative h-56 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden shrink-0">
                {selected.coverImage ? (
                  <img src={selected.coverImage} alt={selected.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${levelGradients[selected.level] || 'from-blue-500 to-blue-700'}`}>
                    <GraduationCap className="h-24 w-24 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <DialogClose className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-full p-2 hover:bg-black/60 transition-colors">
                  <X className="h-4 w-4 text-white" />
                </DialogClose>
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${levelColors[selected.level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {levelLabels[selected.level] || selected.level}
                    </span>
                    {selected.hasCertificate && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" /> Certifiant
                      </span>
                    )}
                    {selected.category && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                        <Tag className="h-3 w-3" />{selected.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{selected.title}</h2>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Instructor info */}
                {selected.instructor && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    {selected.instructorAvatar ? (
                      <img src={selected.instructorAvatar} className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" onError={e => (e.currentTarget.style.display='none')} />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-black text-dark">{selected.instructor}</p>
                      {selected.instructorBio && <p className="text-[11px] text-subtext leading-snug">{selected.instructorBio}</p>}
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-subtext leading-relaxed">{selected.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Users, label: 'Étudiants', value: (selected.studentsCount || 0).toLocaleString() },
                    { icon: BookOpen, label: 'Modules', value: (selected.modules || []).length },
                    { icon: Clock, label: 'Durée', value: selected.totalDuration || `${(selected.modules || []).length * 15} min` },
                    { icon: Star, label: 'Note', value: selected.rating > 0 ? selected.rating.toFixed(1) : '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-blue-50 rounded-2xl p-3 text-center">
                      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="font-black text-dark text-sm">{value}</p>
                      <p className="text-[10px] text-subtext">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Additional info */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {selected.language && (
                    <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full font-semibold text-gray-600">
                      <Globe className="h-3.5 w-3.5" /> {selected.language}
                    </div>
                  )}
                  {selected.hasCertificate && (
                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full font-semibold text-amber-700">
                      <BadgeCheck className="h-3.5 w-3.5" /> Certificat inclus
                    </div>
                  )}
                  {selected.enrollmentLimit && (
                    <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full font-semibold text-orange-700">
                      <Users className="h-3.5 w-3.5" /> {selected.enrollmentLimit} places max
                    </div>
                  )}
                </div>

                {/* Prerequisites */}
                {selected.prerequisites && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">Prérequis</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{selected.prerequisites}</p>
                  </div>
                )}

                {/* Modules list */}
                {(selected.modules || []).length > 0 && (
                  <div>
                    <h4 className="font-black text-dark text-sm mb-3 flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Contenu du cours ({(selected.modules || []).length} modules)
                    </h4>
                    <ModuleList
                      modules={selected.modules}
                      chapters={selected.chapters}
                      isOwned={isOwned(selected)}
                    />
                  </div>
                )}

                {/* Resources */}
                {selected.pdfUrl && (
                  <div>
                    <h4 className="font-black text-dark text-sm mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> Ressources
                    </h4>
                    {isOwned(selected) ? (
                      <a
                        href={selected.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary flex-1">Télécharger le support PDF</span>
                        <ExternalLink className="h-3.5 w-3.5 text-primary/60" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Support PDF — disponible après achat</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Purchase section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-5 border border-blue-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-primary">
                          {selected.price === 0 ? 'Gratuit' : `${(selected.price || 0).toLocaleString()} HTG`}
                        </p>
                        {selected.originalPrice && selected.originalPrice > selected.price && (
                          <span className="text-sm text-gray-400 line-through">{selected.originalPrice.toLocaleString()} HTG</span>
                        )}
                      </div>
                      {loggedClient && selected.price > 0 && (
                        <p className="text-xs text-subtext mt-1 flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          Votre solde: <span className={`font-bold ml-0.5 ${(loggedClient.balance ?? 0) >= selected.price ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(loggedClient.balance ?? 0).toLocaleString()} HTG
                          </span>
                        </p>
                      )}
                    </div>
                    {isOwned(selected) && (
                      <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accès activé
                      </span>
                    )}
                  </div>

                  {isOwned(selected) ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-black text-emerald-700">Vous avez accès à cette formation</p>
                      <p className="text-xs text-emerald-600 mt-1">Accédez aux vidéos ci-dessus ou contactez le support.</p>
                    </div>
                  ) : loggedClient ? (
                    selected.price === 0 ? (
                      <Button
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                        onClick={() => handleWalletPurchase(selected)}
                        disabled={purchasing}
                      >
                        {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Accéder gratuitement
                      </Button>
                    ) : (
                      <Button
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
                        onClick={() => handleWalletPurchase(selected)}
                        disabled={purchasing || (loggedClient.balance ?? 0) < selected.price}
                      >
                        {purchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wallet className="h-4 w-4" />
                        )}
                        {(loggedClient.balance ?? 0) < selected.price
                          ? 'Solde insuffisant — Recharger'
                          : 'Acheter avec mon Wallet Neopay'}
                      </Button>
                    )
                  ) : (
                    <Button
                      className="w-full h-12 rounded-2xl bg-primary hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                      onClick={() => { setSelected(null); onOpenWallet(); }}
                    >
                      <Lock className="h-4 w-4" />
                      Connectez-vous pour acheter
                    </Button>
                  )}

                  {loggedClient && !isOwned(selected) && (loggedClient.balance ?? 0) < selected.price && selected.price > 0 && (
                    <button
                      onClick={() => { setSelected(null); onOpenWallet(); }}
                      className="w-full mt-2 text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1"
                    >
                      <TrendingUp className="h-3 w-3" /> Recharger mon wallet
                    </button>
                  )}
                </div>

                <p className="text-center text-[10px] text-subtext/60">
                  Paiement sécurisé via votre Wallet Neopay · Accès immédiat après achat
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
