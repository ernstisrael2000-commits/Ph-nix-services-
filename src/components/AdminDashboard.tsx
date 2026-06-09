import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, ShoppingBag, Bell, LogOut, Plus, Pencil, Trash2,
  Loader2, Search, X, Check, AlertCircle, Truck, MapPin,
  RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff,
  CheckCheck, Trash, LayoutGrid, Hash, Image as ImageIcon,
  FileText, DollarSign, Tag, List, MessageSquare, Zap,
  Clock, CheckCircle, XCircle, AlertTriangle, Info,
  ArrowUpDown, Copy, ShieldCheck, Menu
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  useCardTopups, saveCardTopup, deleteCardTopup,
  useParcels, saveParcel, deleteParcel,
} from '../services/parcelService';
import { toast } from 'sonner';
import { AdminAccount, CardTopup, Parcel, ParcelStatus } from '../types';

const ADMIN_SECRET = 'rena-admin-2024';

async function adminFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_SECRET,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur serveur (${res.status})`);
  return data;
}

function generateTrackingNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PHX${y}${m}${d}${rand}`;
}

function formatDate(ts: any): string {
  if (!ts) return '—';
  const s = ts?._seconds ?? ts?.seconds;
  const date = s ? new Date(s * 1000) : new Date(ts);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PARCEL_STATUSES: ParcelStatus[] = ['En route', 'En transit', 'Arrivé', 'Livré'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'En route':  { label: 'En route',  color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: Truck },
  'En transit':{ label: 'En transit',color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: ArrowUpDown },
  'Arrivé':    { label: 'Arrivé',    color: 'bg-purple-100 text-purple-700 border-purple-200',icon: MapPin },
  'Livré':     { label: 'Livré',     color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
};

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  deposit:      { icon: DollarSign,    color: 'bg-green-100 text-green-600' },
  withdrawal:   { icon: ArrowUpDown,   color: 'bg-red-100 text-red-600' },
  purchase:     { icon: ShoppingBag,   color: 'bg-blue-100 text-blue-600' },
  transfer:     { icon: ArrowUpDown,   color: 'bg-indigo-100 text-indigo-600' },
  alert:        { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  info:         { icon: Info,          color: 'bg-gray-100 text-gray-600' },
  default:      { icon: Bell,          color: 'bg-gray-100 text-gray-600' },
};

type Tab = 'services' | 'colis' | 'notifications';

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('services');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'services' as Tab,       label: 'Services',       icon: ShoppingBag },
    { id: 'colis' as Tab,          label: 'Colis',          icon: Package },
    { id: 'notifications' as Tab,  label: 'Notifications',  icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar (slide-in) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col shadow-2xl md:hidden"
          >
            <SidebarContent admin={admin} tabs={tabs} tab={tab} setTab={(t) => { setTab(t); setSidebarOpen(false); }} onLogout={onLogout} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0 shrink-0">
        <SidebarContent admin={admin} tabs={tabs} tab={tab} setTab={setTab} onLogout={onLogout} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <span className="font-black text-gray-800">
            {tabs.find(t => t.id === tab)?.label}
          </span>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'services'      && <ServicesTab />}
              {tab === 'colis'         && <ColisTab />}
              {tab === 'notifications' && <NotificationsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ admin, tabs, tab, setTab, onLogout }: {
  admin: AdminAccount;
  tabs: { id: Tab; label: string; icon: React.ElementType }[];
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-tight">Phénix Services</p>
            <p className="text-xs text-gray-400 font-medium">Administration</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              tab === id
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Admin info + logout */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
            {admin.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 truncate">{admin.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </>
  );
}

// ─── SERVICES TAB ─────────────────────────────────────────────────────────────

interface ServiceFormData {
  name: string;
  image: string;
  description: string;
  price: string;
  stock: string;
  whatsappMessage: string;
  goldRate: string;
  presets: string;
  customFields: { key: string; value: string }[];
}

const EMPTY_SERVICE: ServiceFormData = {
  name: '', image: '', description: '', price: '', stock: '',
  whatsappMessage: '', goldRate: '', presets: '',
  customFields: [],
};

function ServicesTab() {
  const { cards, loading } = useCardTopups();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CardTopup | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_SERVICE);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filtered = cards.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_SERVICE);
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const openEdit = (card: CardTopup) => {
    setEditing(card);
    const customFields: { key: string; value: string }[] = [];
    const knownKeys = new Set(['id','name','image','description','price','stock','whatsappMessage','goldRate','presets','createdAt','updatedAt']);
    for (const [k, v] of Object.entries(card as any)) {
      if (!knownKeys.has(k)) customFields.push({ key: k, value: String(v ?? '') });
    }
    setForm({
      name: card.name || '',
      image: card.image || '',
      description: card.description || '',
      price: card.price || '',
      stock: String(card.stock ?? ''),
      whatsappMessage: card.whatsappMessage || '',
      goldRate: String(card.goldRate ?? ''),
      presets: (card.presets || []).join(', '),
      customFields,
    });
    setShowAdvanced(customFields.length > 0 || !!card.whatsappMessage || !!card.goldRate || !!(card.presets?.length));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Le nom est requis.'); return; }
    if (!form.price.trim()) { toast.error('Le prix est requis.'); return; }
    setSaving(true);
    try {
      const data: any = {
        name: form.name.trim(),
        image: form.image.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        ...(form.stock !== '' && { stock: Number(form.stock) }),
        ...(form.whatsappMessage.trim() && { whatsappMessage: form.whatsappMessage.trim() }),
        ...(form.goldRate !== '' && { goldRate: Number(form.goldRate) }),
        ...(form.presets.trim() && {
          presets: form.presets.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
        }),
      };
      for (const cf of form.customFields) {
        if (cf.key.trim()) data[cf.key.trim()] = cf.value;
      }
      await saveCardTopup(data, editing?.id);
      toast.success(editing ? 'Service mis à jour.' : 'Service créé.');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCardTopup(deleteId);
      toast.success('Service supprimé.');
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setDeleting(false);
    }
  };

  const addCustomField = () => {
    setForm(f => ({ ...f, customFields: [...f.customFields, { key: '', value: '' }] }));
  };

  const removeCustomField = (i: number) => {
    setForm(f => ({ ...f, customFields: f.customFields.filter((_, idx) => idx !== i) }));
  };

  const updateCustomField = (i: number, field: 'key' | 'value', val: string) => {
    setForm(f => {
      const cf = [...f.customFields];
      cf[i] = { ...cf[i], [field]: val };
      return { ...f, customFields: cf };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les produits affichés dans la section Services</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20 gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={ShoppingBag} label="Total services" value={cards.length} color="blue" />
        <StatCard icon={Tag} label="Recherche active" value={search ? filtered.length : '—'} color="indigo" />
        <StatCard icon={Zap} label="Dernière mise à jour" value="Temps réel" color="green" />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher un service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-2xl border-gray-200 bg-white"
        />
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucun service" description={search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier service.'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(card => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {card.image && (
                <div className="h-36 overflow-hidden bg-gray-100">
                  <img src={card.image} alt={card.name} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = 'none'; }} />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-black text-gray-900 text-sm leading-tight">{card.name}</h3>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 shrink-0 text-xs">{card.price}</Badge>
                </div>
                {card.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{card.description}</p>
                )}
                {card.presets && card.presets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {card.presets.map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">${p}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(card)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 text-xs font-bold transition-all">
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </button>
                  <button onClick={() => setDeleteId(card.id!)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold transition-all">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-gray-900">
              {editing ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
            <DialogDescription>Remplissez les informations du service.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Champs de base */}
            <FormField label="Nom du service *" icon={Tag}>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Visa Prépayée" className="rounded-xl" />
            </FormField>

            <FormField label="Prix affiché *" icon={DollarSign}>
              <Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Ex: 2 500 HTG" className="rounded-xl" />
            </FormField>

            <FormField label="URL de l'image" icon={ImageIcon}>
              <Input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." className="rounded-xl" />
              {form.image && (
                <img src={form.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-xl" onError={e => { (e.target as any).style.display='none'; }} />
              )}
            </FormField>

            <FormField label="Description" icon={FileText}>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du service..." className="rounded-xl resize-none" rows={2} />
            </FormField>

            <FormField label="Stock (optionnel)" icon={Hash}>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Ex: 100" className="rounded-xl" />
            </FormField>

            {/* Section avancée */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition-all"
            >
              <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Options avancées</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <FormField label="Montants prédéfinis (séparés par virgule)" icon={List}>
                    <Input value={form.presets} onChange={e => setForm(f => ({ ...f, presets: e.target.value }))} placeholder="Ex: 25, 50, 100, 200" className="rounded-xl" />
                    <p className="text-xs text-gray-400 mt-1">Ces montants s'affichent comme boutons rapides.</p>
                  </FormField>

                  <FormField label="Message WhatsApp personnalisé" icon={MessageSquare}>
                    <Textarea value={form.whatsappMessage} onChange={e => setForm(f => ({ ...f, whatsappMessage: e.target.value }))} placeholder="Message pré-rempli WhatsApp..." className="rounded-xl resize-none" rows={2} />
                  </FormField>

                  <FormField label="Taux d'échange spécifique (HTG/USD)" icon={DollarSign}>
                    <Input type="number" value={form.goldRate} onChange={e => setForm(f => ({ ...f, goldRate: e.target.value }))} placeholder="Ex: 146" className="rounded-xl" />
                  </FormField>

                  {/* Champs personnalisés */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-black text-gray-500 uppercase tracking-wide">Champs personnalisés</Label>
                      <button type="button" onClick={addCustomField} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" /> Ajouter un champ
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.customFields.map((cf, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input value={cf.key} onChange={e => updateCustomField(i, 'key', e.target.value)} placeholder="Clé" className="rounded-xl flex-1 text-sm" />
                          <Input value={cf.value} onChange={e => updateCustomField(i, 'value', e.target.value)} placeholder="Valeur" className="rounded-xl flex-1 text-sm" />
                          <button type="button" onClick={() => removeCustomField(i)} className="p-2 rounded-xl hover:bg-red-50 text-red-400">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Mettre à jour' : 'Créer le service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-gray-900">Supprimer ce service ?</DialogTitle>
            <DialogDescription>Cette action est irréversible. Le service disparaîtra de la page Services.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-500 hover:bg-red-600 text-white gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── COLIS TAB ────────────────────────────────────────────────────────────────

interface ColisFormData {
  trackingNumber: string;
  status: ParcelStatus;
  currentLocation: string;
  estimatedArrival: string;
  paymentStatus: 'Payé' | 'Non payé';
  recipientName: string;
  recipientPhone: string;
  description: string;
  weight: string;
  origin: string;
  destination: string;
}

const EMPTY_COLIS: ColisFormData = {
  trackingNumber: '',
  status: 'En route',
  currentLocation: '',
  estimatedArrival: '',
  paymentStatus: 'Non payé',
  recipientName: '',
  recipientPhone: '',
  description: '',
  weight: '',
  origin: '',
  destination: '',
};

function ColisTab() {
  const { parcels, loading } = useParcels();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Parcel | null>(null);
  const [form, setForm] = useState<ColisFormData>(EMPTY_COLIS);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = parcels.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.trackingNumber?.toLowerCase().includes(q)
      || (p as any).recipientName?.toLowerCase().includes(q)
      || p.currentLocation?.toLowerCase().includes(q)
      || (p as any).destination?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: parcels.length,
    enRoute: parcels.filter(p => p.status === 'En route').length,
    enTransit: parcels.filter(p => p.status === 'En transit').length,
    arrivé: parcels.filter(p => p.status === 'Arrivé').length,
    livré: parcels.filter(p => p.status === 'Livré').length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_COLIS, trackingNumber: generateTrackingNumber() });
    setShowMore(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Parcel) => {
    setEditing(p);
    const pa = p as any;
    setForm({
      trackingNumber: p.trackingNumber || '',
      status: p.status || 'En route',
      currentLocation: p.currentLocation || '',
      estimatedArrival: pa.estimatedArrival || '',
      paymentStatus: p.paymentStatus || 'Non payé',
      recipientName: pa.recipientName || '',
      recipientPhone: pa.recipientPhone || '',
      description: pa.description || '',
      weight: pa.weight ? String(pa.weight) : '',
      origin: pa.origin || '',
      destination: pa.destination || '',
    });
    setShowMore(!!(pa.recipientPhone || pa.description || pa.weight || pa.origin || pa.destination));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.trackingNumber.trim()) { toast.error('Le numéro de suivi est requis.'); return; }
    if (!form.currentLocation.trim()) { toast.error('La localisation actuelle est requise.'); return; }
    setSaving(true);
    try {
      const data: any = {
        trackingNumber: form.trackingNumber.trim().toUpperCase(),
        status: form.status,
        currentLocation: form.currentLocation.trim(),
        paymentStatus: form.paymentStatus,
        ...(form.estimatedArrival && { estimatedArrival: form.estimatedArrival }),
        ...(form.recipientName.trim() && { recipientName: form.recipientName.trim() }),
        ...(form.recipientPhone.trim() && { recipientPhone: form.recipientPhone.trim() }),
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.weight && { weight: form.weight }),
        ...(form.origin.trim() && { origin: form.origin.trim() }),
        ...(form.destination.trim() && { destination: form.destination.trim() }),
      };
      await saveParcel(data, editing?.id);
      toast.success(editing ? 'Colis mis à jour.' : 'Colis créé.');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteParcel(deleteId);
      toast.success('Colis supprimé.');
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setDeleting(false);
    }
  };

  const copyTracking = async (num: string) => {
    await navigator.clipboard.writeText(num).catch(() => {});
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickStatus = async (parcel: Parcel, status: ParcelStatus) => {
    try {
      await saveParcel({ ...parcel, status }, parcel.id);
      toast.success(`Statut mis à jour : ${status}`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Colis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les colis et leurs statuts</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20 gap-2">
          <Plus className="h-4 w-4" /> Nouveau colis
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={() => setStatusFilter('all')} className={`rounded-2xl p-4 text-left transition-all border-2 ${statusFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white'}`}>
          <p className="text-2xl font-black text-gray-900">{counts.total}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Total colis</p>
        </button>
        {PARCEL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = parcels.filter(p => p.status === s).length;
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)} className={`rounded-2xl p-4 text-left transition-all border-2 ${statusFilter === s ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white'}`}>
              <p className="text-2xl font-black text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="N° de suivi, destinataire, destination..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-2xl border-gray-200 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 rounded-2xl border-gray-200 bg-white">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Tous les statuts</SelectItem>
            {PARCEL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucun colis" description={search || statusFilter !== 'all' ? 'Aucun résultat pour ce filtre.' : 'Créez votre premier colis.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(parcel => {
            const pa = parcel as any;
            const cfg = STATUS_CONFIG[parcel.status] || STATUS_CONFIG['En route'];
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={parcel.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-gray-900 text-sm font-mono">{parcel.trackingNumber}</span>
                      <button onClick={() => copyTracking(parcel.trackingNumber)} className={`p-1 rounded-lg transition-all ${copiedId === parcel.trackingNumber ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}>
                        {copiedId === parcel.trackingNumber ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <Badge className={`text-xs border ${cfg.color}`}>{parcel.status}</Badge>
                      <Badge className={`text-xs border ${parcel.paymentStatus === 'Payé' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {parcel.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{parcel.currentLocation}</span>
                      {pa.recipientName && <span>{pa.recipientName}</span>}
                      {pa.destination && <span>→ {pa.destination}</span>}
                      {pa.estimatedArrival && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{pa.estimatedArrival}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(parcel.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(parcel)} className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-all">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(parcel.id!)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Quick status buttons */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {PARCEL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => parcel.status !== s && quickStatus(parcel, s)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                        parcel.status === s
                          ? STATUS_CONFIG[s].color + ' cursor-default'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-gray-900">
              {editing ? 'Modifier le colis' : 'Nouveau colis'}
            </DialogTitle>
            <DialogDescription>Remplissez les informations du colis.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Numéro de suivi */}
            <div>
              <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Numéro de suivi *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.trackingNumber}
                  onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value.toUpperCase() }))}
                  placeholder="PHX..."
                  className="rounded-xl font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(f => ({ ...f, trackingNumber: generateTrackingNumber() }))}
                  className="rounded-xl px-3 gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Générer
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Statut *</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ParcelStatus }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {PARCEL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Paiement</Label>
                <Select value={form.paymentStatus} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v as any }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Non payé">Non payé</SelectItem>
                    <SelectItem value="Payé">Payé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <FormField label="Localisation actuelle *" icon={MapPin}>
              <Input value={form.currentLocation} onChange={e => setForm(f => ({ ...f, currentLocation: e.target.value }))} placeholder="Ex: Miami, FL" className="rounded-xl" />
            </FormField>

            <FormField label="Date d'arrivée estimée" icon={Clock}>
              <Input value={form.estimatedArrival} onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))} placeholder="Ex: 15 Janvier 2026" className="rounded-xl" />
            </FormField>

            {/* Infos supplémentaires */}
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition-all"
            >
              <span className="flex items-center gap-2"><Info className="h-4 w-4" /> Informations supplémentaires</span>
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Nom du destinataire" icon={Tag}>
                      <Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Jean Dupont" className="rounded-xl" />
                    </FormField>
                    <FormField label="Téléphone" icon={Hash}>
                      <Input value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} placeholder="+509..." className="rounded-xl" />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Origine" icon={MapPin}>
                      <Input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="Ex: New York" className="rounded-xl" />
                    </FormField>
                    <FormField label="Destination" icon={MapPin}>
                      <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Ex: Port-au-Prince" className="rounded-xl" />
                    </FormField>
                  </div>
                  <FormField label="Poids" icon={Hash}>
                    <Input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="Ex: 2.5 kg" className="rounded-xl" />
                  </FormField>
                  <FormField label="Description du contenu" icon={FileText}>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Vêtements, électronique..." className="rounded-xl resize-none" rows={2} />
                  </FormField>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Mettre à jour' : 'Créer le colis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-gray-900">Supprimer ce colis ?</DialogTitle>
            <DialogDescription>Le colis et son historique de suivi seront supprimés définitivement.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-500 hover:bg-red-600 text-white gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── NOTIFICATIONS TAB ────────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message?: string;
  amount?: number;
  clientId?: string;
  clientName?: string;
  read: boolean;
  createdAt: any;
  [key: string]: any;
}

function NotificationsTab() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/admin/notifications');
      setNotifications(data.notifications || []);
    } catch (e: any) {
      toast.error(e.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await adminFetch('/api/admin/notifications/read-all', { method: 'PATCH' });
      setNotifications(n => n.map(notif => ({ ...notif, read: true })));
      toast.success('Toutes les notifications marquées comme lues.');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setMarking(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await adminFetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));
    } catch {}
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await adminFetch('/api/admin/notifications/clear-all', { method: 'DELETE' });
      setNotifications([]);
      toast.success('Toutes les notifications supprimées.');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setClearing(false);
    }
  };

  const types = Array.from(new Set(notifications.map(n => n.type).filter(Boolean)));
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Centre d'alertes et de commandes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={loadNotifications}
            disabled={loading}
            className="rounded-xl gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} disabled={marking} className="rounded-xl gap-2 text-sm">
              {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Tout marquer lu
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" onClick={clearAll} disabled={clearing} className="rounded-xl gap-2 text-sm text-red-500 hover:text-red-600 hover:border-red-200">
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
              Tout effacer
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Bell} label="Total" value={notifications.length} color="blue" />
        <StatCard icon={AlertCircle} label="Non lues" value={unreadCount} color="red" />
        <StatCard icon={CheckCircle} label="Lues" value={notifications.length - unreadCount} color="green" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-bold transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Toutes' : 'Non lues'}
            </button>
          ))}
        </div>
        {types.length > 0 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 rounded-2xl border-gray-200 bg-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Tous les types</SelectItem>
              {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Notification cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description={filter === 'unread' ? 'Tout est lu !' : 'Aucune notification pour le moment.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const conf = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
            const Icon = conf.icon;
            return (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl border shadow-sm p-4 transition-all ${!notif.read ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${conf.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">{notif.title || notif.type || 'Notification'}</span>
                        {notif.type && (
                          <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-200 border capitalize">{notif.type}</Badge>
                        )}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    </div>
                    {notif.message && (
                      <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      {notif.clientName && <span>Client : <span className="font-bold text-gray-600">{notif.clientName}</span></span>}
                      {notif.amount != null && (
                        <span>Montant : <span className="font-bold text-gray-700">{notif.amount.toLocaleString('fr-FR')} HTG</span></span>
                      )}
                      {notif.clientId && <span>ID : {notif.clientId}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(notif.createdAt)}</span>
                    </div>
                    {/* Extra fields */}
                    {Object.entries(notif)
                      .filter(([k]) => !['id','type','title','message','amount','clientId','clientName','read','createdAt','updatedAt'].includes(k))
                      .slice(0, 4)
                      .map(([k, v]) => v != null && (
                        <div key={k} className="mt-1 text-xs text-gray-400">
                          <span className="capitalize">{k}</span> : <span className="font-medium text-gray-600">{String(v)}</span>
                        </div>
                      ))
                    }
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markOneRead(notif.id)}
                      className="shrink-0 p-2 rounded-xl hover:bg-green-50 hover:text-green-600 text-gray-400 transition-all"
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: 'blue' | 'indigo' | 'green' | 'red';
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function FormField({ label, icon: Icon, children }: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="font-black text-gray-700 text-lg">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </div>
  );
}
