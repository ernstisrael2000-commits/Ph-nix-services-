import React, { useState } from 'react';
import {
  GraduationCap, Plus, Edit2, Trash2, Eye, EyeOff, Users, TrendingUp,
  BookOpen, DollarSign, Loader2, X, ChevronDown, ChevronUp, Save, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { Formation, FormationModule, FormationPurchase, FormationResource } from '../../types';
import { useFormations, useAllPurchases, createFormation, updateFormation, deleteFormation, updatePurchaseStatus } from '../../services/formationService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const levelOptions = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
];

function generateId() { return Math.random().toString(36).slice(2, 10); }

interface FormFormation {
  title: string; description: string; shortDescription: string;
  coverImage: string; price: string; level: string;
  pdfUrl: string; published: boolean;
  modules: FormationModule[];
  resources: FormationResource[];
}

const EMPTY_FORM: FormFormation = {
  title: '', description: '', shortDescription: '',
  coverImage: '', price: '0', level: 'debutant',
  pdfUrl: '', published: false,
  modules: [], resources: [],
};

export default function FormationsAdminPanel() {
  const { formations, loading } = useFormations(false);
  const { purchases, loading: pLoading } = useAllPurchases();
  const [tab, setTab] = useState<'formations' | 'purchases' | 'stats'>('formations');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFormation>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedFormation, setExpandedFormation] = useState<string | null>(null);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (f: Formation) => {
    setForm({
      title: f.title, description: f.description, shortDescription: f.shortDescription,
      coverImage: f.coverImage, price: String(f.price), level: f.level,
      pdfUrl: f.pdfUrl || '', published: f.published,
      modules: f.modules || [], resources: f.resources || [],
    });
    setEditingId(f.id!);
    setShowForm(true);
  };

  const addModule = () => {
    const m: FormationModule = { id: generateId(), title: '', videoUrl: '', duration: '0:00', order: form.modules.length + 1 };
    setForm(f => ({ ...f, modules: [...f.modules, m] }));
  };

  const updateModule = (id: string, field: keyof FormationModule, value: any) =>
    setForm(f => ({ ...f, modules: f.modules.map(m => m.id === id ? { ...m, [field]: value } : m) }));

  const removeModule = (id: string) =>
    setForm(f => ({ ...f, modules: f.modules.filter(m => m.id !== id) }));

  const addResource = () => {
    const r: FormationResource = { id: generateId(), name: '', url: '', type: 'link' };
    setForm(f => ({ ...f, resources: [...f.resources, r] }));
  };

  const updateResource = (id: string, field: keyof FormationResource, value: any) =>
    setForm(f => ({ ...f, resources: f.resources.map(r => r.id === id ? { ...r, [field]: value } : r) }));

  const removeResource = (id: string) =>
    setForm(f => ({ ...f, resources: f.resources.filter(r => r.id !== id) }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Le titre est requis.'); return; }
    setSaving(true);
    try {
      const cleanModules: FormationModule[] = form.modules.map((m, idx) => ({
        id: m.id,
        title: m.title || '',
        videoUrl: m.videoUrl || '',
        duration: m.duration || '0:00',
        order: m.order ?? idx + 1,
        description: m.description || '',
      }));

      const cleanResources: FormationResource[] = form.resources
        .filter(r => r.name && r.url)
        .map(r => ({
          id: r.id,
          name: r.name || '',
          url: r.url || '',
          type: r.type || 'link',
        }));

      const data = {
        title: form.title.trim(),
        description: form.description.trim(),
        shortDescription: form.shortDescription.trim(),
        coverImage: form.coverImage.trim(),
        price: parseFloat(form.price) || 0,
        level: form.level as any,
        pdfUrl: form.pdfUrl.trim(),
        published: form.published,
        modules: cleanModules,
        resources: cleanResources,
        rating: 0,
      };

      if (editingId) {
        await updateFormation(editingId, data);
        toast.success('Formation mise à jour !');
      } else {
        await createFormation(data as any);
        toast.success('Formation créée !');
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette formation ? Cette action est irréversible.')) return;
    setDeletingId(id);
    try {
      await deleteFormation(id);
      toast.success('Formation supprimée.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (f: Formation) => {
    await updateFormation(f.id!, { published: !f.published });
    toast.success(f.published ? 'Formation masquée.' : 'Formation publiée !');
  };

  const handlePurchaseStatus = async (p: FormationPurchase, status: 'active' | 'revoked') => {
    await updatePurchaseStatus(p.id!, status, p.formationId);
    toast.success(status === 'active' ? '✅ Accès accordé !' : 'Accès révoqué.');
  };

  const totalRevenue = purchases.filter(p => p.status === 'active').reduce((s, p) => s + p.amount, 0);
  const activeStudents = new Set(purchases.filter(p => p.status === 'active').map(p => p.userId)).size;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-dark">Gestion des Formations</h2>
            <p className="text-xs text-subtext">Créer, modifier et gérer vos cours en ligne</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-xl text-sm transition-all shadow-sm">
          <Plus className="h-4 w-4" />Nouvelle formation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {(['formations', 'purchases', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-subtext hover:text-dark'}`}>
            {t === 'formations' ? 'Formations' : t === 'purchases' ? 'Achats' : 'Statistiques'}
          </button>
        ))}
      </div>

      {/* === TAB: FORMATIONS === */}
      {tab === 'formations' && (
        <div className="space-y-3">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
            formations.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-subtext">Aucune formation créée</p>
                <button onClick={openCreate} className="mt-4 px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm">Créer la première</button>
              </div>
            ) : formations.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-14 w-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {f.coverImage ? <img src={f.coverImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-6 w-6 text-gray-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-dark text-sm truncate">{f.title}</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${f.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {f.published ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-subtext">
                      <span>{f.modules.length} leçons</span>
                      <span>{f.price.toLocaleString()} HTG</span>
                      <span>{f.studentsCount} étudiants</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleTogglePublish(f)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title={f.published ? 'Masquer' : 'Publier'}>
                      {f.published ? <EyeOff className="h-4 w-4 text-subtext" /> : <Eye className="h-4 w-4 text-emerald-600" />}
                    </button>
                    <button onClick={() => openEdit(f)} className="h-8 w-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors">
                      <Edit2 className="h-4 w-4 text-blue-500" />
                    </button>
                    <button onClick={() => handleDelete(f.id!)} disabled={deletingId === f.id} className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                      {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                    </button>
                    <button onClick={() => setExpandedFormation(expandedFormation === f.id ? null : f.id!)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                      {expandedFormation === f.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {expandedFormation === f.id && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                    <p className="text-xs text-subtext leading-relaxed">{f.shortDescription}</p>
                    {f.modules.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {[...f.modules].sort((a, b) => a.order - b.order).map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs text-subtext bg-gray-50 px-3 py-2 rounded-lg">
                            <span className="font-bold text-dark">#{m.order}</span>
                            <span className="flex-1 truncate">{m.title}</span>
                            <span className="font-mono">{m.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* === TAB: PURCHASES === */}
      {tab === 'purchases' && (
        <div className="space-y-3">
          {pLoading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
            purchases.length === 0 ? (
              <div className="text-center py-12 text-subtext">Aucun achat enregistré</div>
            ) : purchases.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'active' ? 'bg-emerald-100' : p.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {p.status === 'active' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : p.status === 'pending' ? <Clock className="h-5 w-5 text-amber-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-dark text-sm truncate">{p.userName || p.userEmail}</p>
                  <p className="text-xs text-subtext truncate">{p.formationTitle} · {p.amount.toLocaleString()} HTG · {p.method}</p>
                  <p className="text-[10px] text-gray-400">{p.userEmail}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => handlePurchaseStatus(p, 'active')}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all">
                        Approuver
                      </button>
                      <button onClick={() => handlePurchaseStatus(p, 'revoked')}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-all">
                        Refuser
                      </button>
                    </>
                  )}
                  {p.status === 'active' && (
                    <button onClick={() => handlePurchaseStatus(p, 'revoked')}
                      className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-all">
                      Révoquer
                    </button>
                  )}
                  {p.status === 'revoked' && (
                    <button onClick={() => handlePurchaseStatus(p, 'active')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all">
                      Réactiver
                    </button>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* === TAB: STATS === */}
      {tab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Formations', value: formations.length, icon: GraduationCap, color: 'bg-primary/10 text-primary' },
            { label: 'Étudiants actifs', value: activeStudents, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Achats totaux', value: purchases.filter(p => p.status === 'active').length, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Revenus HTG', value: `${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-dark">{stat.value}</p>
              <p className="text-xs text-subtext mt-1">{stat.label}</p>
            </div>
          ))}
          {formations.map(f => {
            const fPurchases = purchases.filter(p => p.formationId === f.id && p.status === 'active');
            const revenue = fPurchases.reduce((s, p) => s + p.amount, 0);
            return (
              <div key={f.id} className="col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
                <p className="font-black text-dark text-sm mb-3 truncate">{f.title}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-black text-dark">{fPurchases.length}</p><p className="text-[10px] text-subtext">Achats</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-black text-dark">{revenue.toLocaleString()}</p><p className="text-[10px] text-subtext">HTG</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === FORM MODAL === */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                <h3 className="text-lg font-black text-dark">{editingId ? 'Modifier la formation' : 'Nouvelle formation'}</h3>
                <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Titre *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ex: Maîtriser le commerce en ligne" className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm font-medium" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Description courte</label>
                    <input value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                      placeholder="Description affichée sur la carte" className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Description complète</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} placeholder="Description détaillée de la formation" className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Prix (HTG)</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0 = Gratuit" className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Niveau</label>
                    <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm font-medium bg-white">
                      {levelOptions.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Image de couverture (URL)</label>
                    <input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                      placeholder="https://..." className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">PDF (URL)</label>
                    <input value={form.pdfUrl} onChange={e => setForm(f => ({ ...f, pdfUrl: e.target.value }))}
                      placeholder="https://..." className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-primary focus:outline-none text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${form.published ? 'bg-primary' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.published ? 'left-4' : 'left-0.5'}`} />
                      </div>
                      <span className="text-sm font-bold text-dark">{form.published ? 'Publiée (visible sur le site)' : 'Brouillon (non visible)'}</span>
                    </label>
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Modules / Leçons ({form.modules.length})</label>
                    <button onClick={addModule} className="flex items-center gap-1 text-xs font-black text-primary hover:underline">
                      <Plus className="h-3.5 w-3.5" />Ajouter leçon
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.modules.map((m, idx) => (
                      <div key={m.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-subtext">Leçon #{idx + 1}</span>
                          <button onClick={() => removeModule(m.id)} className="text-red-500 hover:text-red-600"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <input value={m.title} onChange={e => updateModule(m.id, 'title', e.target.value)}
                              placeholder="Titre de la leçon" className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-primary" />
                          </div>
                          <div className="col-span-2">
                            <input value={m.videoUrl} onChange={e => updateModule(m.id, 'videoUrl', e.target.value)}
                              placeholder="URL vidéo (YouTube, Vimeo...)" className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                          </div>
                          <input value={m.duration} onChange={e => updateModule(m.id, 'duration', e.target.value)}
                            placeholder="Durée ex: 12:30" className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                          <input type="number" value={m.order} onChange={e => updateModule(m.id, 'order', parseInt(e.target.value) || 1)}
                            placeholder="Ordre" className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                          <div className="col-span-2">
                            <input value={m.description || ''} onChange={e => updateModule(m.id, 'description', e.target.value)}
                              placeholder="Description (optionnel)" className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black text-subtext uppercase tracking-widest">Ressources complémentaires</label>
                    <button onClick={addResource} className="flex items-center gap-1 text-xs font-black text-primary hover:underline">
                      <Plus className="h-3.5 w-3.5" />Ajouter
                    </button>
                  </div>
                  {form.resources.map(r => (
                    <div key={r.id} className="flex gap-2 items-center mb-2">
                      <input value={r.name} onChange={e => updateResource(r.id, 'name', e.target.value)}
                        placeholder="Nom" className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                      <input value={r.url} onChange={e => updateResource(r.id, 'url', e.target.value)}
                        placeholder="URL" className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                      <button onClick={() => removeResource(r.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 shrink-0">
                <button onClick={handleSave} disabled={saving}
                  className="w-full h-12 bg-primary hover:bg-[#D98A1E] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" />{editingId ? 'Mettre à jour' : 'Créer la formation'}</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
