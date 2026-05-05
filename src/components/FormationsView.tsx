import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Users, Star, Clock, Play, Award,
  CheckCircle2, X, Wallet, Loader2, BookOpen, Lock,
  ChevronRight, AlertCircle, TrendingUp, Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Formation, Client } from '../types';
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
  debutant: 'bg-green-100 text-green-700',
  intermediaire: 'bg-blue-100 text-blue-700',
  avance: 'bg-purple-100 text-purple-700',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating > 0 ? rating.toFixed(1) : '—'}</span>
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

  const filtered = filterLevel === 'all'
    ? formations
    : formations.filter(f => f.level === filterLevel);

  const isOwned = (f: Formation) => !!f.id && purchasedIds.includes(f.id);

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold mb-4">
          <GraduationCap className="h-4 w-4" />
          Centre de Formations Neopay
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-dark mb-3">
          Développez vos compétences
        </h1>
        <p className="text-subtext max-w-xl mx-auto text-base">
          Accédez à nos formations en ligne et montez en compétences à votre rythme. Payez directement avec votre wallet Neopay.
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { icon: BookOpen, label: 'Formations', value: formations.length },
          { icon: Users, label: 'Étudiants', value: formations.reduce((s, f) => s + (f.studentsCount || 0), 0) },
          { icon: Award, label: 'Certifications', value: formations.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-black text-dark">{value.toLocaleString()}</p>
            <p className="text-xs text-subtext">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'debutant', 'intermediaire', 'avance'].map(lvl => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filterLevel === lvl
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {lvl === 'all' ? 'Toutes' : levelLabels[lvl]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <p className="text-subtext font-medium">Aucune formation disponible pour le moment.</p>
          <p className="text-sm text-subtext/60 mt-1">Revenez bientôt !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((formation, i) => (
            <motion.div
              key={formation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(formation)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
            >
              {/* Cover */}
              <div className="relative h-44 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
                {formation.coverImage ? (
                  <img
                    src={formation.coverImage}
                    alt={formation.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-blue-200" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${levelColors[formation.level] || 'bg-gray-100 text-gray-600'}`}>
                    {levelLabels[formation.level] || formation.level}
                  </span>
                  {isOwned(formation) && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Acheté
                    </span>
                  )}
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 rounded-full p-3 shadow-lg">
                    <Play className="h-6 w-6 text-primary fill-primary" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-black text-dark text-base mb-1 line-clamp-2 leading-snug">{formation.title}</h3>
                <p className="text-xs text-subtext line-clamp-2 mb-3">{formation.shortDescription || formation.description}</p>

                <div className="flex items-center gap-3 text-xs text-subtext mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {(formation.studentsCount || 0).toLocaleString()} étudiants
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {(formation.modules || []).length} modules
                  </span>
                </div>

                <StarRating rating={formation.rating || 0} />

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    {formation.price === 0 ? 'Gratuit' : `${(formation.price || 0).toLocaleString()} HTG`}
                  </span>
                  <button className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    Voir <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <AnimatePresence>
        {selected && (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Cover */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden shrink-0">
                {selected.coverImage ? (
                  <img src={selected.coverImage} alt={selected.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="h-20 w-20 text-blue-200" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <DialogClose className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 hover:bg-white transition-colors">
                  <X className="h-4 w-4 text-gray-600" />
                </DialogClose>
                <div className="absolute bottom-3 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${levelColors[selected.level] || 'bg-gray-100 text-gray-600'}`}>
                    {levelLabels[selected.level] || selected.level}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-dark leading-snug">{selected.title}</DialogTitle>
                  <DialogDescription className="text-sm text-subtext">{selected.description}</DialogDescription>
                </DialogHeader>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: 'Étudiants', value: (selected.studentsCount || 0).toLocaleString() },
                    { icon: BookOpen, label: 'Modules', value: (selected.modules || []).length },
                    { icon: Star, label: 'Note', value: selected.rating > 0 ? selected.rating.toFixed(1) : '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-blue-50 rounded-xl p-3 text-center">
                      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="font-black text-dark text-sm">{value}</p>
                      <p className="text-[10px] text-subtext">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Modules list */}
                {(selected.modules || []).length > 0 && (
                  <div>
                    <h4 className="font-bold text-dark text-sm mb-2 flex items-center gap-2">
                      <Play className="h-4 w-4 text-primary" /> Contenu de la formation
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {selected.modules.map((mod, idx) => (
                        <div key={mod.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-dark truncate">{mod.title}</p>
                            {mod.duration && <p className="text-[10px] text-subtext flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{mod.duration}</p>}
                          </div>
                          {isOwned(selected) ? (
                            <Play className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase section */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-2xl font-black text-primary">
                        {selected.price === 0 ? 'Gratuit' : `${(selected.price || 0).toLocaleString()} HTG`}
                      </p>
                      {loggedClient && selected.price > 0 && (
                        <p className="text-xs text-subtext mt-0.5 flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          Votre solde: <span className={`font-bold ${loggedClient.balance >= selected.price ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(loggedClient.balance ?? 0).toLocaleString()} HTG
                          </span>
                        </p>
                      )}
                    </div>
                    {isOwned(selected) && (
                      <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accès activé
                      </span>
                    )}
                  </div>

                  {isOwned(selected) ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-emerald-700">Vous avez accès à cette formation</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Contactez le support pour accéder au contenu.</p>
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
                          : `Acheter avec mon Wallet`}
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
