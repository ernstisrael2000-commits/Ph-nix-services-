import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Loader2, X, Save, Youtube, Instagram, Facebook,
  ChevronDown, ChevronRight, Eye, EyeOff, Check, Wifi,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

const ADMIN_SECRET = 'rena-admin-2024';

const GRADIENT_OPTIONS = [
  { label: 'Rouge YouTube', value: 'from-red-500 to-rose-600' },
  { label: 'Noir TikTok', value: 'from-gray-800 to-gray-900' },
  { label: 'Rose Instagram', value: 'from-pink-500 to-purple-600' },
  { label: 'Bleu Facebook', value: 'from-blue-500 to-blue-700' },
  { label: 'Indigo', value: 'from-indigo-500 to-indigo-700' },
  { label: 'Vert', value: 'from-emerald-500 to-teal-600' },
  { label: 'Violet', value: 'from-purple-500 to-violet-600' },
  { label: 'Orange', value: 'from-orange-500 to-amber-600' },
];

const CATEGORY_OPTIONS = ['Vues', 'Abonnés', 'Likes', 'Commentaires', 'Partages', 'Impressions', 'Followers', 'Réactions', 'Cœurs'];

const UNIT_OPTIONS = ['vues', 'abonnés', 'likes', 'commentaires', 'partages', 'followers', 'cœurs', 'impressions', 'réactions'];

interface PromoPlatform {
  id: string;
  name: string;
  key: string;
  gradient: string;
  lightBg?: string;
  border?: string;
  text?: string;
  active: boolean;
  order: number;
}

interface PromoService {
  id: string;
  platformId: string;
  platformKey: string;
  category: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
  minQty: number;
  maxQty: number;
  popular: boolean;
  active: boolean;
  order: number;
}

const EMPTY_PLATFORM: Omit<PromoPlatform, 'id'> = { name: '', key: '', gradient: 'from-gray-500 to-gray-700', lightBg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', active: true, order: 99 };
const EMPTY_SERVICE: Omit<PromoService, 'id'> = { platformId: '', platformKey: '', category: 'Vues', name: '', description: '', pricePerUnit: 1000, unit: 'vues', minQty: 100, maxQty: 100000, popular: false, active: true, order: 99 };

export default function AdminPromotionSection() {
  const [tab, setTab] = useState<'platforms' | 'services'>('platforms');
  const [platforms, setPlatforms] = useState<PromoPlatform[]>([]);
  const [services, setServices] = useState<PromoService[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Platform modal
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PromoPlatform | null>(null);
  const [platformForm, setPlatformForm] = useState<Omit<PromoPlatform, 'id'>>(EMPTY_PLATFORM);

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<PromoService | null>(null);
  const [serviceForm, setServiceForm] = useState<Omit<PromoService, 'id'>>(EMPTY_SERVICE);

  // Filter
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');

  const loadPlatforms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/promotion/platforms');
      const d = await r.json();
      setPlatforms(d.platforms || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/promotion/services', { headers: { 'x-admin-secret': ADMIN_SECRET } });
      const d = await r.json();
      setServices(d.services || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPlatforms(); loadServices(); }, [loadPlatforms, loadServices]);

  // ── Platform CRUD ──────────────────────────────────────────────────────────
  const openAddPlatform = () => { setEditingPlatform(null); setPlatformForm(EMPTY_PLATFORM); setShowPlatformModal(true); };
  const openEditPlatform = (p: PromoPlatform) => { setEditingPlatform(p); setPlatformForm(p); setShowPlatformModal(true); };

  const savePlatform = async () => {
    setSaving(true);
    try {
      if (editingPlatform) {
        await fetch(`/api/admin/promotion/platforms/${editingPlatform.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(platformForm),
        });
      } else {
        await fetch('/api/admin/promotion/platforms', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(platformForm),
        });
      }
      setShowPlatformModal(false);
      await loadPlatforms();
    } catch {}
    setSaving(false);
  };

  const deletePlatform = async (id: string) => {
    if (!confirm('Supprimer cette plateforme et tous ses services ?')) return;
    await fetch(`/api/admin/promotion/platforms/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } });
    await Promise.all([loadPlatforms(), loadServices()]);
  };

  const togglePlatformActive = async (p: PromoPlatform) => {
    await fetch(`/api/admin/promotion/platforms/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ active: !p.active }),
    });
    await loadPlatforms();
  };

  // ── Service CRUD ───────────────────────────────────────────────────────────
  const openAddService = () => {
    const first = platforms[0];
    setEditingService(null);
    setServiceForm({ ...EMPTY_SERVICE, platformId: first?.id || '', platformKey: first?.key || '' });
    setShowServiceModal(true);
  };
  const openEditService = (s: PromoService) => { setEditingService(s); setServiceForm(s); setShowServiceModal(true); };

  const saveService = async () => {
    setSaving(true);
    try {
      const platform = platforms.find(p => p.id === serviceForm.platformId);
      const data = { ...serviceForm, platformKey: platform?.key || serviceForm.platformKey };
      if (editingService) {
        await fetch(`/api/admin/promotion/services/${editingService.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/admin/promotion/services', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(data),
        });
      }
      setShowServiceModal(false);
      await loadServices();
    } catch {}
    setSaving(false);
  };

  const deleteService = async (id: string) => {
    if (!confirm('Supprimer ce service ?')) return;
    await fetch(`/api/admin/promotion/services/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } });
    await loadServices();
  };

  const toggleServiceActive = async (s: PromoService) => {
    await fetch(`/api/admin/promotion/services/${s.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ active: !s.active }),
    });
    await loadServices();
  };

  const filteredServices = selectedPlatformFilter === 'all' ? services : services.filter(s => s.platformId === selectedPlatformFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Gestion Promotion</h2>
          <p className="text-xs text-gray-400 mt-0.5">{platforms.length} plateforme{platforms.length !== 1 ? 's' : ''} · {services.length} service{services.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={tab === 'platforms' ? openAddPlatform : openAddService}
          size="sm" className="gap-1.5 rounded-xl text-xs">
          <Plus className="h-3.5 w-3.5" />
          {tab === 'platforms' ? 'Plateforme' : 'Service'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {(['platforms', 'services'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {t === 'platforms' ? 'Plateformes' : 'Services'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* ── Platforms Tab ── */}
          {tab === 'platforms' && (
            <div className="space-y-3">
              {platforms.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Wifi className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune plateforme</p>
                  <button onClick={openAddPlatform} className="mt-3 text-primary text-xs font-black hover:underline">+ Ajouter une plateforme</button>
                </div>
              ) : (
                platforms.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">key: {p.key} · order: {p.order}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                        {p.active ? 'Actif' : 'Inactif'}
                      </span>
                      <button onClick={() => togglePlatformActive(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                        {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEditPlatform(p)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-gray-400 hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deletePlatform(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Services Tab ── */}
          {tab === 'services' && (
            <div className="space-y-4">
              {/* Platform filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setSelectedPlatformFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedPlatformFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                  Tous ({services.length})
                </button>
                {platforms.map(p => {
                  const cnt = services.filter(s => s.platformId === p.id).length;
                  return (
                    <button key={p.id} onClick={() => setSelectedPlatformFilter(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedPlatformFilter === p.id ? `bg-gradient-to-r ${p.gradient} text-white` : 'bg-gray-100 text-gray-500'}`}>
                      {p.name} ({cnt})
                    </button>
                  );
                })}
              </div>

              {filteredServices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <p className="text-sm font-bold text-gray-400">Aucun service</p>
                  <button onClick={openAddService} className="mt-3 text-primary text-xs font-black hover:underline">+ Ajouter un service</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map(s => {
                    const plt = platforms.find(p => p.id === s.platformId);
                    return (
                      <div key={s.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${s.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {plt && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${plt.gradient} text-white`}>
                                {plt.name}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
                              {s.category}
                            </span>
                            {s.popular && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-600">⭐ Populaire</span>}
                          </div>
                          <p className="font-black text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.pricePerUnit} HTG/{s.unit} · min {s.minQty.toLocaleString()} · max {s.maxQty.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => toggleServiceActive(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                            {s.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button onClick={() => openEditService(s)} className="p-1.5 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteService(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Platform Modal ── */}
      <Dialog open={showPlatformModal} onOpenChange={setShowPlatformModal}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingPlatform ? 'Modifier' : 'Ajouter'} une plateforme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Nom *</Label>
                <Input value={platformForm.name} onChange={e => setPlatformForm(f => ({ ...f, name: e.target.value }))} placeholder="YouTube" className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Clé unique *</Label>
                <Input value={platformForm.key} onChange={e => setPlatformForm(f => ({ ...f, key: e.target.value.toLowerCase() }))} placeholder="youtube" className="rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Gradient</Label>
              <select value={platformForm.gradient} onChange={e => setPlatformForm(f => ({ ...f, gradient: e.target.value }))}
                className="w-full border rounded-xl p-2 text-sm">
                {GRADIENT_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Ordre</Label>
                <Input type="number" value={platformForm.order} onChange={e => setPlatformForm(f => ({ ...f, order: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={platformForm.active} onChange={e => setPlatformForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-semibold">Actif</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPlatformModal(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={savePlatform} disabled={saving || !platformForm.name || !platformForm.key} className="rounded-xl gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Service Modal ── */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Modifier' : 'Ajouter'} un service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Plateforme *</Label>
                <select value={serviceForm.platformId} onChange={e => {
                  const plt = platforms.find(p => p.id === e.target.value);
                  setServiceForm(f => ({ ...f, platformId: e.target.value, platformKey: plt?.key || '' }));
                }} className="w-full border rounded-xl p-2 text-sm">
                  <option value="">-- Choisir --</option>
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Catégorie *</Label>
                <select value={serviceForm.category} onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-xl p-2 text-sm">
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Nom du service *</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Abonnés YouTube Premium" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Description</Label>
              <Textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du service..." className="rounded-xl text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Prix par unité (HTG) *</Label>
                <Input type="number" value={serviceForm.pricePerUnit} onChange={e => setServiceForm(f => ({ ...f, pricePerUnit: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Unité</Label>
                <select value={serviceForm.unit} onChange={e => setServiceForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border rounded-xl p-2 text-sm">
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Quantité min</Label>
                <Input type="number" value={serviceForm.minQty} onChange={e => setServiceForm(f => ({ ...f, minQty: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Quantité max</Label>
                <Input type="number" value={serviceForm.maxQty} onChange={e => setServiceForm(f => ({ ...f, maxQty: Number(e.target.value) }))} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Ordre</Label>
                <Input type="number" value={serviceForm.order} onChange={e => setServiceForm(f => ({ ...f, order: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={serviceForm.popular} onChange={e => setServiceForm(f => ({ ...f, popular: e.target.checked }))} />
                  <span className="text-sm font-semibold">Populaire</span>
                </label>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={serviceForm.active} onChange={e => setServiceForm(f => ({ ...f, active: e.target.checked }))} />
                  <span className="text-sm font-semibold">Actif</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowServiceModal(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={saveService} disabled={saving || !serviceForm.name || !serviceForm.platformId} className="rounded-xl gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
