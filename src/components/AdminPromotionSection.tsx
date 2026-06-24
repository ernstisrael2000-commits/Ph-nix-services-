import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Loader2, X, Save, Eye, EyeOff, Check,
  Wifi, ClipboardList, Clock, Zap, CheckCircle2, XCircle,
  ChevronDown, Video, FormInput, GripVertical, Settings,
  Users, Heart, BarChart2, MessageCircle, Share2, ThumbsUp, UserPlus, Smile, Star,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';

const ADMIN_SECRET = 'rena-admin-2024';

const GRADIENT_OPTIONS = [
  { label: 'Rouge YouTube', value: 'from-red-500 to-rose-600' },
  { label: 'Noir TikTok', value: 'from-gray-800 to-gray-900' },
  { label: 'Rose Instagram', value: 'from-pink-500 to-purple-600' },
  { label: 'Bleu Facebook', value: 'from-blue-500 to-blue-700' },
  { label: 'Indigo', value: 'from-indigo-500 to-indigo-700' },
  { label: 'Vert Spotify', value: 'from-emerald-500 to-teal-600' },
  { label: 'Violet', value: 'from-purple-500 to-violet-600' },
  { label: 'Orange', value: 'from-orange-500 to-amber-600' },
  { label: 'Bleu Telegram', value: 'from-sky-400 to-blue-500' },
  { label: 'Gris X/Twitter', value: 'from-gray-600 to-gray-800' },
  { label: 'Rouge Google', value: 'from-red-400 to-yellow-400' },
];

const CATEGORY_OPTIONS = ['Vues', 'Abonnés', 'Likes', 'Commentaires', 'Partages', 'Impressions', 'Followers', 'Réactions', 'Cœurs'];
const UNIT_OPTIONS = ['vues', 'abonnés', 'likes', 'commentaires', 'partages', 'followers', 'cœurs', 'impressions', 'réactions'];

const CATEGORY_CONFIG_ADMIN: Record<string, { icon: React.ElementType; gradient: string; text: string; unit: string }> = {
  'Abonnés':     { icon: Users,         gradient: 'from-blue-500 to-indigo-600',    text: 'text-blue-600',   unit: 'abonnés' },
  'Likes':       { icon: Heart,         gradient: 'from-pink-500 to-rose-600',      text: 'text-pink-600',   unit: 'likes' },
  'Vues':        { icon: Eye,           gradient: 'from-violet-500 to-purple-600',  text: 'text-violet-600', unit: 'vues' },
  'Commentaires':{ icon: MessageCircle, gradient: 'from-orange-500 to-amber-500',   text: 'text-orange-600', unit: 'commentaires' },
  'Partages':    { icon: Share2,        gradient: 'from-emerald-500 to-teal-600',   text: 'text-emerald-600',unit: 'partages' },
  'Followers':   { icon: UserPlus,      gradient: 'from-cyan-500 to-blue-500',      text: 'text-cyan-600',   unit: 'followers' },
  'Réactions':   { icon: ThumbsUp,      gradient: 'from-yellow-400 to-orange-500',  text: 'text-yellow-600', unit: 'réactions' },
  'Cœurs':       { icon: Heart,         gradient: 'from-red-500 to-pink-600',       text: 'text-red-500',    unit: 'cœurs' },
  'Impressions': { icon: BarChart2,     gradient: 'from-teal-500 to-cyan-600',      text: 'text-teal-600',   unit: 'impressions' },
  'Boostage':    { icon: Zap,           gradient: 'from-green-500 to-emerald-600',  text: 'text-green-600',  unit: 'boosts' },
};
const FIELD_TYPE_OPTIONS = [
  { value: 'url', label: 'URL (lien)' },
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'select', label: 'Liste de choix' },
];

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: 'text-amber-600 bg-amber-50 border-amber-200',      icon: <Clock className="h-3 w-3" /> },
  active:    { label: 'En cours',   color: 'text-blue-600 bg-blue-50 border-blue-200',          icon: <Zap className="h-3 w-3" /> },
  completed: { label: 'Terminé',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Annulé',     color: 'text-red-500 bg-red-50 border-red-200',             icon: <XCircle className="h-3 w-3" /> },
};

interface CustomField {
  id: string;
  label: string;
  type: 'url' | 'text' | 'textarea' | 'select';
  placeholder: string;
  required: boolean;
  options?: string;
}

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
  videoUrl?: string;
  logoUrl?: string;
  customFields?: CustomField[];
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

const EMPTY_PLATFORM: Omit<PromoPlatform, 'id'> = {
  name: '', key: '', gradient: 'from-gray-500 to-gray-700',
  lightBg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700',
  active: true, order: 99, videoUrl: '', logoUrl: '', customFields: [],
};

const EMPTY_SERVICE: Omit<PromoService, 'id'> = {
  platformId: '', platformKey: '', category: 'Vues', name: '', description: '',
  pricePerUnit: 1000, unit: 'vues', minQty: 100, maxQty: 100000, popular: false, active: true, order: 99,
};

function newField(): CustomField {
  return { id: crypto.randomUUID(), label: '', type: 'url', placeholder: '', required: true, options: '' };
}

export default function AdminPromotionSection() {
  const [tab, setTab] = useState<'platforms' | 'services' | 'orders' | 'settings'>('platforms');
  const [platforms, setPlatforms] = useState<PromoPlatform[]>([]);
  const [services, setServices] = useState<PromoService[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const [mainVideoUrlInput, setMainVideoUrlInput] = useState('');

  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PromoPlatform | null>(null);
  const [platformForm, setPlatformForm] = useState<Omit<PromoPlatform, 'id'>>(EMPTY_PLATFORM);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<PromoService | null>(null);
  const [serviceForm, setServiceForm] = useState<Omit<PromoService, 'id'>>(EMPTY_SERVICE);

  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [ordersFilter, setOrdersFilter] = useState<string>('all');
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

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

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/promotion/orders', { headers: { 'x-admin-secret': ADMIN_SECRET } });
      const d = await r.json();
      setOrders(d.orders || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/promotion/settings');
      const d = await r.json();
      const url = d.mainVideoUrl || '';
      setMainVideoUrl(url);
      setMainVideoUrlInput(url);
    } catch {}
  }, []);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await fetch('/api/admin/promotion/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ mainVideoUrl: mainVideoUrlInput }),
      });
      setMainVideoUrl(mainVideoUrlInput);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {}
    setSettingsSaving(false);
  };

  useEffect(() => {
    loadPlatforms();
    loadServices();
    loadOrders();
    loadSettings();
  }, [loadPlatforms, loadServices, loadOrders, loadSettings]);

  // ── Platform CRUD ──────────────────────────────────────────────────────────
  const openAddPlatform = () => {
    setEditingPlatform(null);
    setPlatformForm({ ...EMPTY_PLATFORM, customFields: [] });
    setShowPlatformModal(true);
  };

  const openEditPlatform = (p: PromoPlatform) => {
    setEditingPlatform(p);
    setPlatformForm({ ...p, customFields: p.customFields || [] });
    setShowPlatformModal(true);
  };

  const savePlatform = async () => {
    setSaving(true);
    try {
      const payload = { ...platformForm };
      if (editingPlatform) {
        await fetch(`/api/admin/promotion/platforms/${editingPlatform.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/admin/promotion/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
          body: JSON.stringify(payload),
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

  // ── Custom fields helpers ──────────────────────────────────────────────────
  const addField = () => {
    setPlatformForm(f => ({ ...f, customFields: [...(f.customFields || []), newField()] }));
  };

  const updateField = (fieldId: string, patch: Partial<CustomField>) => {
    setPlatformForm(f => ({
      ...f,
      customFields: (f.customFields || []).map(cf => cf.id === fieldId ? { ...cf, ...patch } : cf),
    }));
  };

  const removeField = (fieldId: string) => {
    setPlatformForm(f => ({ ...f, customFields: (f.customFields || []).filter(cf => cf.id !== fieldId) }));
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

  // ── Orders ─────────────────────────────────────────────────────────────────
  const updateOrderStatus = async (id: string, status: string) => {
    setUpdatingOrder(id);
    try {
      await fetch(`/api/admin/promotion/orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ status }),
      });
      await loadOrders();
    } catch {}
    setUpdatingOrder(null);
  };

  const filteredServices = selectedPlatformFilter === 'all' ? services : services.filter(s => s.platformId === selectedPlatformFilter);
  const filteredOrders = ordersFilter === 'all' ? orders : orders.filter(o => o.status === ordersFilter);
  const orderDetail = orderDetailId ? orders.find(o => o.id === orderDetailId) : null;

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Gestion Promotion</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {platforms.length} plateforme{platforms.length !== 1 ? 's' : ''} · {services.length} service{services.length !== 1 ? 's' : ''} · {orders.length} commande{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        {(tab === 'platforms' || tab === 'services') && (
          <Button onClick={tab === 'platforms' ? openAddPlatform : openAddService}
            size="sm" className="gap-1.5 rounded-xl text-xs">
            <Plus className="h-3.5 w-3.5" />
            {tab === 'platforms' ? 'Plateforme' : 'Service'}
          </Button>
        )}
        {tab === 'orders' && (
          <button onClick={loadOrders} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors">
            <Loader2 className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
        {([
          { key: 'platforms', label: 'Plateformes' },
          { key: 'services',  label: 'Services' },
          { key: 'orders',    label: 'Commandes' },
          { key: 'settings',  label: 'Paramètres' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`relative px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {label}
            {key === 'orders' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && tab !== 'orders' ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* ── Platforms Tab ── */}
          {tab === 'platforms' && (
            <div>
              {platforms.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Wifi className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune plateforme</p>
                  <button onClick={openAddPlatform} className="mt-3 text-primary text-xs font-black hover:underline">+ Ajouter une plateforme</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {platforms.map(p => {
                    const svcCount = services.filter(s => s.platformId === p.id).length;
                    const fieldCount = (p.customFields || []).length;
                    return (
                      <div key={p.id} className={`relative bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all ${p.active ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-60'}`}>
                        {/* Logo / gradient header */}
                        <div className={`h-20 w-full bg-gradient-to-br ${p.gradient} relative overflow-hidden`}>
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-white font-black text-3xl drop-shadow">{p.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          {/* Active badge */}
                          <span className={`absolute top-2 right-2 h-2 w-2 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        </div>

                        {/* Info */}
                        <div className="p-3 flex-1">
                          <p className="font-black text-gray-900 text-sm leading-tight truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{p.key}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-1.5 py-0.5 rounded-md bg-primary/8 text-primary text-[9px] font-black">{svcCount} svc</span>
                            {fieldCount > 0 && <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 text-[9px] font-black">{fieldCount} champs</span>}
                            {p.videoUrl && <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Video className="h-2.5 w-2.5" />vidéo</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-50 px-2 py-1.5 flex items-center justify-between gap-1">
                          <button
                            onClick={() => { setEditingService(null); setServiceForm({ ...EMPTY_SERVICE, platformId: p.id, platformKey: p.key }); setShowServiceModal(true); }}
                            className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Svc
                          </button>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => togglePlatformActive(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400" title={p.active ? 'Désactiver' : 'Activer'}>
                              {p.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => openEditPlatform(p)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-gray-400 hover:text-primary" title="Modifier">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deletePlatform(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500" title="Supprimer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Services Tab ── */}
          {tab === 'services' && (
            <div className="space-y-4">
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {plt && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${plt.gradient} text-white`}>{plt.name}</span>}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">{s.category}</span>
                            {s.popular && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-600">⭐ Populaire</span>}
                            {!s.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-400">Inactif</span>}
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

          {/* ── Orders Tab ── */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {/* Status filter */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'active', 'completed', 'cancelled'] as const).map(s => {
                  const cnt = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
                  return (
                    <button key={s} onClick={() => setOrdersFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${ordersFilter === s
                        ? s === 'all' ? 'bg-gray-800 text-white'
                          : s === 'pending' ? 'bg-amber-500 text-white'
                          : s === 'active' ? 'bg-blue-500 text-white'
                          : s === 'completed' ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                      {s === 'all' ? 'Toutes' : ORDER_STATUS_MAP[s]?.label} ({cnt})
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Aucune commande</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map(order => {
                    const status = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
                    const isDetail = orderDetailId === order.id;
                    const customValues = order.customFieldValues || {};
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${status.color}`}>
                                  {status.icon}{status.label}
                                </span>
                                {order.platformName && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">{order.platformName}</span>
                                )}
                              </div>
                              <p className="font-black text-gray-900 text-sm leading-tight">{order.serviceName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {order.qty?.toLocaleString()} {order.unit || ''} · {order.totalPrice?.toLocaleString()} HTG
                              </p>
                            </div>
                            <button onClick={() => setOrderDetailId(isDetail ? null : order.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isDetail ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          {/* Client info */}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white font-black text-[10px] shrink-0">
                              {(order.clientName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{order.clientName || 'Client'}</span>
                            {order.clientPhone && <span className="text-gray-300">·</span>}
                            {order.clientPhone && <span>{order.clientPhone}</span>}
                            {order.createdAt && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{new Date(order.createdAt._seconds ? order.createdAt._seconds * 1000 : order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isDetail && (
                          <div className="border-t border-gray-50 bg-gray-50/50 p-4 space-y-3">
                            {/* Custom field values */}
                            {Object.keys(customValues).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Informations du client</p>
                                {Object.entries(customValues).map(([key, val]) => (
                                  <div key={key} className="flex items-start gap-2">
                                    <span className="text-xs font-bold text-gray-500 shrink-0 min-w-24">{key}:</span>
                                    <span className="text-xs text-gray-700 break-all font-medium">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Status actions */}
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Changer le statut</p>
                              <div className="flex gap-2 flex-wrap">
                                {(['pending', 'active', 'completed', 'cancelled'] as const).map(s => (
                                  <button key={s}
                                    disabled={order.status === s || updatingOrder === order.id}
                                    onClick={() => updateOrderStatus(order.id, s)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-40 flex items-center gap-1 ${
                                      order.status === s
                                        ? ORDER_STATUS_MAP[s].color + ' border'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}>
                                    {updatingOrder === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : ORDER_STATUS_MAP[s].icon}
                                    {ORDER_STATUS_MAP[s].label}
                                    {order.status === s && <Check className="h-3 w-3" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab ── */}
          {tab === 'settings' && (
            <div className="space-y-6">
              {/* Main video */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">Vidéo "Comment ça marche"</p>
                    <p className="text-[11px] text-gray-400">Affichée sur la page d'accueil de la section Promotion</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">URL de la vidéo</Label>
                    <Input
                      value={mainVideoUrlInput}
                      onChange={e => setMainVideoUrlInput(e.target.value)}
                      placeholder="https://youtube.com/embed/XXXX  ou  /ma-video.mp4"
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                      Accepte : lien <strong>YouTube embed</strong> (youtube.com/embed/…), lien <strong>Vimeo embed</strong>, ou un fichier vidéo direct (.mp4). Laissez vide pour masquer la section vidéo.
                    </p>
                  </div>

                  {mainVideoUrlInput && (
                    <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video">
                      {mainVideoUrlInput.includes('youtube.com') || mainVideoUrlInput.includes('vimeo.com') ? (
                        <iframe src={mainVideoUrlInput} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen title="Aperçu vidéo" />
                      ) : (
                        <video src={mainVideoUrlInput} className="w-full h-full object-cover" controls />
                      )}
                    </div>
                  )}

                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving || mainVideoUrlInput === mainVideoUrl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-black disabled:opacity-50 hover:bg-primary/90 transition-all"
                  >
                    {settingsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : settingsSaved ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Save className="h-3.5 w-3.5" />}
                    {settingsSaved ? 'Enregistré !' : 'Enregistrer la vidéo'}
                  </button>

                  {mainVideoUrl && (
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Vidéo active : {mainVideoUrl.length > 55 ? mainVideoUrl.slice(0, 55) + '…' : mainVideoUrl}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Accès rapides</p>
                <div className="space-y-2">
                  <button onClick={() => setTab('platforms')} className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left">
                    <Wifi className="h-4 w-4 text-primary shrink-0" /> Gérer les plateformes ({platforms.length})
                  </button>
                  <button onClick={() => setTab('services')} className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left">
                    <Settings className="h-4 w-4 text-blue-500 shrink-0" /> Gérer les services ({services.length})
                  </button>
                  <button onClick={() => setTab('orders')} className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left">
                    <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" /> Voir les commandes ({orders.length})
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Platform Modal ── */}
      <Dialog open={showPlatformModal} onOpenChange={setShowPlatformModal}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlatform ? 'Modifier' : 'Ajouter'} une plateforme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Logo upload */}
            <div>
              <Label className="text-xs font-bold mb-2 block">Logo de la plateforme</Label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${platformForm.gradient} flex items-center justify-center shrink-0 overflow-hidden shadow-md`}>
                  {platformForm.logoUrl ? (
                    <img src={platformForm.logoUrl} alt="logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="text-white font-black text-2xl">{platformForm.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  {/* File upload */}
                  <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-500">Importer une image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setPlatformForm(f => ({ ...f, logoUrl: ev.target?.result as string }));
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }} />
                  </label>
                  {/* URL input */}
                  <Input
                    value={platformForm.logoUrl || ''}
                    onChange={e => setPlatformForm(f => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="ou coller une URL d'image…"
                    className="rounded-xl text-xs h-8"
                  />
                  {platformForm.logoUrl && (
                    <button type="button" onClick={() => setPlatformForm(f => ({ ...f, logoUrl: '' }))}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-semibold">
                      <X className="h-3 w-3" /> Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Nom *</Label>
                <Input value={platformForm.name} onChange={e => setPlatformForm(f => ({ ...f, name: e.target.value }))} placeholder="YouTube" className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Clé unique *</Label>
                <Input value={platformForm.key} onChange={e => setPlatformForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="youtube" className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Gradient couleur (fond)</Label>
                <select value={platformForm.gradient} onChange={e => setPlatformForm(f => ({ ...f, gradient: e.target.value }))}
                  className="w-full border rounded-xl p-2 text-sm">
                  {GRADIENT_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Ordre d'affichage</Label>
                <Input type="number" value={platformForm.order} onChange={e => setPlatformForm(f => ({ ...f, order: Number(e.target.value) }))} className="rounded-xl" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={platformForm.active} onChange={e => setPlatformForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                <span className="text-sm font-semibold">Plateforme active</span>
              </label>
            </div>

            {/* Video URL */}
            <div className="border-t pt-3">
              <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 block">
                <Video className="h-3.5 w-3.5 text-primary" /> Vidéo d'explication (URL)
              </Label>
              <Input
                value={platformForm.videoUrl || ''}
                onChange={e => setPlatformForm(f => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/embed/... ou /video.mp4"
                className="rounded-xl"
              />
              <p className="text-[10px] text-gray-400 mt-1">URL d'une vidéo YouTube embed ou un fichier vidéo direct</p>
            </div>

            {/* Custom fields */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <FormInput className="h-3.5 w-3.5 text-primary" /> Champs du formulaire de commande
                </Label>
                <button onClick={addField}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black transition-colors">
                  <Plus className="h-3 w-3" /> Ajouter un champ
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Ces champs seront demandés à l'utilisateur lors d'une commande sur cette plateforme.</p>

              {(platformForm.customFields || []).length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400">Aucun champ. Cliquez sur "Ajouter un champ".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(platformForm.customFields || []).map((field, idx) => (
                    <div key={field.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Champ {idx + 1}</span>
                        <button onClick={() => removeField(field.id)} className="ml-auto p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-bold mb-1 block">Label *</Label>
                          <Input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })}
                            placeholder="Lien de la chaîne" className="rounded-lg h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold mb-1 block">Type</Label>
                          <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as any })}
                            className="w-full border rounded-lg p-1.5 text-xs">
                            {FIELD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-bold mb-1 block">Placeholder</Label>
                          <Input value={field.placeholder} onChange={e => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="ex: https://youtube.com/@machaîne" className="rounded-lg h-8 text-xs" />
                        </div>
                        {field.type === 'select' && (
                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold mb-1 block">Options (séparées par des virgules)</Label>
                            <Input value={field.options || ''} onChange={e => updateField(field.id, { options: e.target.value })}
                              placeholder="Option 1, Option 2, Option 3" className="rounded-lg h-8 text-xs" />
                          </div>
                        )}
                        <div className="col-span-2 flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="rounded" />
                            <span className="text-xs font-semibold">Champ obligatoire</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <DialogTitle className="text-base font-black">
              {editingService ? '✏️ Modifier le service' : '➕ Ajouter un service'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Platform */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Plateforme *</Label>
              <select value={serviceForm.platformId} onChange={e => {
                const plt = platforms.find(p => p.id === e.target.value);
                setServiceForm(f => ({ ...f, platformId: e.target.value, platformKey: plt?.key || '' }));
              }} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">-- Choisir une plateforme --</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Name */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Nom du service *</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Abonnés YouTube Premium" className="rounded-xl" />
            </div>

            {/* Category — visual card grid */}
            <div>
              <Label className="text-xs font-bold mb-2 block">Catégorie *</Label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {CATEGORY_OPTIONS.map(cat => {
                  const cfg = CATEGORY_CONFIG_ADMIN[cat];
                  const Icon = cfg?.icon || Star;
                  const selected = serviceForm.category === cat;
                  return (
                    <button key={cat} type="button"
                      onClick={() => setServiceForm(f => ({ ...f, category: cat, unit: cfg?.unit || f.unit }))}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center
                        ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}>
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${cfg?.gradient || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white shadow-sm`}>
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <span className={`text-[10px] font-black leading-tight ${selected ? 'text-primary' : 'text-gray-600'}`}>{cat}</span>
                      {selected && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
              {/* Custom category fallback */}
              {serviceForm.category && !CATEGORY_OPTIONS.includes(serviceForm.category) && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-xs font-bold text-primary flex-1">Catégorie : {serviceForm.category}</span>
                  <button type="button" onClick={() => setServiceForm(f => ({ ...f, category: '' }))} className="text-gray-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <input value={serviceForm.category} onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ou saisir une catégorie personnalisée…"
                className="mt-2 w-full border border-dashed border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30" />
            </div>

            {/* Unit */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Unité</Label>
              <input
                list="unit-suggestions"
                value={serviceForm.unit}
                onChange={e => setServiceForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="ex: abonnés"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <datalist id="unit-suggestions">
                {UNIT_OPTIONS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Description</Label>
              <Textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description du service..." className="rounded-xl text-sm" rows={2} />
            </div>

            {/* Price */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Prix par unité (HTG) *</Label>
              <Input type="number" min={0} value={serviceForm.pricePerUnit}
                onChange={e => setServiceForm(f => ({ ...f, pricePerUnit: Number(e.target.value) }))} className="rounded-xl" />
            </div>

            {/* Qty min/max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Quantité min</Label>
                <Input type="number" min={1} value={serviceForm.minQty}
                  onChange={e => setServiceForm(f => ({ ...f, minQty: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Quantité max</Label>
                <Input type="number" min={1} value={serviceForm.maxQty}
                  onChange={e => setServiceForm(f => ({ ...f, maxQty: Number(e.target.value) }))} className="rounded-xl" />
              </div>
            </div>

            {/* Order + checkboxes */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Ordre d'affichage</Label>
                <Input type="number" min={0} value={serviceForm.order}
                  onChange={e => setServiceForm(f => ({ ...f, order: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-primary" checked={serviceForm.popular}
                    onChange={e => setServiceForm(f => ({ ...f, popular: e.target.checked }))} />
                  <span className="text-sm font-semibold text-gray-700">⭐ Populaire</span>
                </label>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-primary" checked={serviceForm.active}
                    onChange={e => setServiceForm(f => ({ ...f, active: e.target.checked }))} />
                  <span className="text-sm font-semibold text-gray-700">Actif</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {(serviceForm.name || serviceForm.pricePerUnit > 0) && (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Aperçu</p>
                <p className="font-black text-sm text-gray-900">{serviceForm.name || '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {serviceForm.pricePerUnit > 0 ? `${serviceForm.pricePerUnit.toLocaleString()} HTG/${serviceForm.unit || 'unité'}` : '—'}
                  {serviceForm.minQty > 0 ? ` · min ${serviceForm.minQty.toLocaleString()}` : ''}
                  {serviceForm.maxQty > 0 ? ` · max ${serviceForm.maxQty.toLocaleString()}` : ''}
                </p>
                {serviceForm.category && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary">{serviceForm.category}</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowServiceModal(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={saveService} disabled={saving || !serviceForm.name || !serviceForm.platformId || !serviceForm.category} className="rounded-xl gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingService ? 'Sauvegarder les modifications' : 'Créer le service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
