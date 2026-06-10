import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, ShoppingBag, Bell, LogOut, Plus, Pencil, Trash2,
  Loader2, Search, X, Check, AlertCircle, Truck, MapPin,
  RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff,
  CheckCheck, Trash, LayoutGrid, Hash, Image as ImageIcon,
  FileText, DollarSign, Tag, List, MessageSquare, Zap,
  Clock, CheckCircle, XCircle, AlertTriangle, Info,
  ArrowUpDown, Copy, ShieldCheck, Menu, CreditCard, Settings, Link,
  GraduationCap, BookOpen, ToggleLeft, ToggleRight, ShoppingCart,
  ExternalLink, Globe, Users, Star
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
import { AdminAccount, CardTopup, FeeTier, Parcel, ParcelStatus, PaymentMethod, DEFAULT_PAYMENT_METHODS, Formation, FormationPurchase, FormationModule, FormationChapter } from '../types';
import { usePendingClientCount } from '../services/clientService';

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
  card_order:   { icon: CreditCard,    color: 'bg-violet-100 text-violet-600' },
  alert:        { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  info:         { icon: Info,          color: 'bg-gray-100 text-gray-600' },
  default:      { icon: Bell,          color: 'bg-gray-100 text-gray-600' },
};

type Tab = 'services' | 'colis' | 'notifications' | 'formations' | 'settings';

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('services');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pendingClientCount = usePendingClientCount();

  const tabs = [
    { id: 'services' as Tab,       label: 'Services',       icon: ShoppingBag,   badge: 0 },
    { id: 'colis' as Tab,          label: 'Colis',          icon: Package,       badge: 0 },
    { id: 'notifications' as Tab,  label: 'Notifications',  icon: Bell,          badge: 0 },
    { id: 'formations' as Tab,     label: 'Formations',     icon: GraduationCap, badge: 0 },
    { id: 'settings' as Tab,       label: 'Paramètres',     icon: Settings,      badge: 0 },
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
            <SidebarContent admin={admin} tabs={tabs} tab={tab} setTab={(t) => { setTab(t); setSidebarOpen(false); }} onLogout={onLogout} pendingCount={pendingClientCount} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0 shrink-0">
        <SidebarContent admin={admin} tabs={tabs} tab={tab} setTab={setTab} onLogout={onLogout} pendingCount={pendingClientCount} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="relative p-2 rounded-xl hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
            {(pendingClientCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow">
                {(pendingClientCount ?? 0) > 99 ? '99+' : pendingClientCount}
              </span>
            )}
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
              {tab === 'formations'    && <FormationsAdminTab />}
              {tab === 'settings'      && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ admin, tabs, tab, setTab, onLogout, pendingCount }: {
  admin: AdminAccount;
  tabs: { id: Tab; label: string; icon: React.ElementType; badge: number }[];
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout: () => void;
  pendingCount?: number;
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
        {tabs.map(({ id, label, icon: Icon }) => {
          const showBadge = id === 'notifications' && (pendingCount ?? 0) > 0;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative ${
                tab === id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {(pendingCount ?? 0) > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin info + logout */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
            {admin.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 truncate">{admin.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{admin.isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
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

interface RechargeFieldForm {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface ServiceFormData {
  name: string;
  image: string;
  description: string;
  price: string;
  stock: string;
  whatsappMessage: string;
  goldRate: string;
  presets: string;
  rechargeFeePercent: string;
  customFields: { key: string; value: string }[];
  rechargeFields: RechargeFieldForm[];
  rechargeFeesTiers: FeeTier[];
}

const EMPTY_SERVICE: ServiceFormData = {
  name: '', image: '', description: '', price: '', stock: '',
  whatsappMessage: '', goldRate: '', presets: '', rechargeFeePercent: '',
  customFields: [],
  rechargeFields: [],
  rechargeFeesTiers: [],
};

function FeeTierEditor({ tiers, onChange }: { tiers: FeeTier[]; onChange: (t: FeeTier[]) => void }) {
  const add = () => onChange([...tiers, { minAmount: 0, maxAmount: 0, feeType: 'fixed', feeValue: 0 }]);
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));
  const update = (i: number, k: keyof FeeTier, v: any) => {
    const arr = [...tiers]; arr[i] = { ...arr[i], [k]: v }; onChange(arr);
  };
  return (
    <div className="space-y-2">
      {tiers.length === 0 ? (
        <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl px-3 py-2">
          Aucun palier — le pourcentage global s'applique si défini.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/60">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-black text-gray-500">Min USD</Label>
                  <Input type="number" value={tier.minAmount} onChange={e => update(i, 'minAmount', parseFloat(e.target.value) || 0)}
                    className="h-9 rounded-xl text-sm mt-0.5" min="0" step="0.01" />
                </div>
                <div>
                  <Label className="text-[10px] font-black text-gray-500">Max USD (0=illimité)</Label>
                  <Input type="number" value={tier.maxAmount} onChange={e => update(i, 'maxAmount', parseFloat(e.target.value) || 0)}
                    className="h-9 rounded-xl text-sm mt-0.5" min="0" step="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-black text-gray-500">Type</Label>
                  <Select value={tier.feeType} onValueChange={v => update(i, 'feeType', v)}>
                    <SelectTrigger className="h-9 rounded-xl mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixe ($)</SelectItem>
                      <SelectItem value="percent">Pourcentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-black text-gray-500">Valeur</Label>
                  <div className="flex gap-1.5 mt-0.5">
                    <Input type="number" value={tier.feeValue} onChange={e => update(i, 'feeValue', parseFloat(e.target.value) || 0)}
                      className="h-9 rounded-xl text-sm flex-1" min="0" step="0.01" />
                    <button type="button" onClick={() => remove(i)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold">
                {tier.maxAmount === 0 ? `≥ $${tier.minAmount}` : `$${tier.minAmount} – $${tier.maxAmount}`}
                {' → frais '}{tier.feeType === 'fixed' ? `$${tier.feeValue}` : `${tier.feeValue}%`}
              </p>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline transition-colors">
        <Plus className="h-3.5 w-3.5" /> Ajouter un palier
      </button>
    </div>
  );
}

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
    const knownKeys = new Set(['id','name','image','description','price','stock','whatsappMessage','goldRate','presets','rechargeFields','rechargeFeePercent','rechargeFeesTiers','createdAt','updatedAt']);
    for (const [k, v] of Object.entries(card as any)) {
      if (!knownKeys.has(k)) customFields.push({ key: k, value: String(v ?? '') });
    }
    const rechargeFields: RechargeFieldForm[] = (card.rechargeFields || []).map(f => ({
      id: f.id || String(Math.random()),
      label: f.label || '',
      placeholder: f.placeholder || '',
      required: f.required ?? false,
    }));
    setForm({
      name: card.name || '',
      image: card.image || '',
      description: card.description || '',
      price: card.price || '',
      stock: String(card.stock ?? ''),
      whatsappMessage: card.whatsappMessage || '',
      goldRate: String(card.goldRate ?? ''),
      presets: (card.presets || []).join(', '),
      rechargeFeePercent: String(card.rechargeFeePercent ?? ''),
      customFields,
      rechargeFields,
      rechargeFeesTiers: (card.rechargeFeesTiers || []) as FeeTier[],
    });
    setShowAdvanced(customFields.length > 0 || rechargeFields.length > 0 || !!card.whatsappMessage || !!card.goldRate || !!(card.presets?.length) || card.rechargeFeePercent !== undefined || !!(card.rechargeFeesTiers?.length));
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
        ...(form.rechargeFeePercent !== '' && { rechargeFeePercent: Number(form.rechargeFeePercent) }),
        ...(form.rechargeFeesTiers?.length > 0 && { rechargeFeesTiers: form.rechargeFeesTiers }),
        ...(form.presets.trim() && {
          presets: form.presets.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
        }),
        ...(form.rechargeFields.length > 0 && {
          rechargeFields: form.rechargeFields
            .filter(f => f.label.trim())
            .map(f => ({ id: f.id, label: f.label.trim(), placeholder: f.placeholder.trim(), required: f.required }))
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

                  <FormField label="Frais de recharge (%) — fallback sans paliers" icon={DollarSign}>
                    <Input type="number" value={form.rechargeFeePercent} onChange={e => setForm(f => ({ ...f, rechargeFeePercent: e.target.value }))} placeholder="Ex: 5" min="0" max="100" step="0.1" className="rounded-xl" />
                    <p className="text-xs text-gray-400 mt-1">Pourcentage global appliqué si aucun palier n'est défini ci-dessous.</p>
                  </FormField>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Label className="text-xs font-black text-gray-500 uppercase tracking-wide">Paliers de frais par tranche</Label>
                        <p className="text-[10px] text-gray-400 mt-0.5">Définissez des frais fixes ou % selon le montant rechargé (USD).</p>
                      </div>
                    </div>
                    <FeeTierEditor
                      tiers={form.rechargeFeesTiers}
                      onChange={tiers => setForm(f => ({ ...f, rechargeFeesTiers: tiers }))}
                    />
                  </div>

                  {/* Champs de saisie du formulaire de recharge */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Label className="text-xs font-black text-gray-500 uppercase tracking-wide">Champs du formulaire de recharge</Label>
                        <p className="text-[10px] text-gray-400 mt-0.5">Ces champs s'affichent quand le client remplit sa demande de recharge.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          rechargeFields: [...f.rechargeFields, { id: String(Date.now()), label: '', placeholder: '', required: false }]
                        }))}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </button>
                    </div>
                    {form.rechargeFields.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl px-3 py-2">Aucun champ configuré — les champs par défaut (Titulaire, Numéro de carte) seront utilisés.</p>
                    ) : (
                      <div className="space-y-3">
                        {form.rechargeFields.map((rf, i) => (
                          <div key={rf.id} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                            <div className="flex items-center gap-2">
                              <Input
                                value={rf.label}
                                onChange={e => setForm(f => {
                                  const arr = [...f.rechargeFields];
                                  arr[i] = { ...arr[i], label: e.target.value };
                                  return { ...f, rechargeFields: arr };
                                })}
                                placeholder="Label du champ (ex: Numéro de compte)"
                                className="rounded-xl flex-1 text-sm"
                              />
                              <button type="button" onClick={() => setForm(f => ({ ...f, rechargeFields: f.rechargeFields.filter((_, idx) => idx !== i) }))} className="p-2 rounded-xl hover:bg-red-50 text-red-400 shrink-0">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <Input
                              value={rf.placeholder}
                              onChange={e => setForm(f => {
                                const arr = [...f.rechargeFields];
                                arr[i] = { ...arr[i], placeholder: e.target.value };
                                return { ...f, rechargeFields: arr };
                              })}
                              placeholder="Placeholder (ex: Ex: 4111 1111 1111 1111)"
                              className="rounded-xl text-sm"
                            />
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={rf.required}
                                onChange={e => setForm(f => {
                                  const arr = [...f.rechargeFields];
                                  arr[i] = { ...arr[i], required: e.target.checked };
                                  return { ...f, rechargeFields: arr };
                                })}
                                className="rounded"
                              />
                              Champ obligatoire
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Champs personnalisés */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-black text-gray-500 uppercase tracking-wide">Champs personnalisés (métadonnées)</Label>
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
  proofImage: string;
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
  proofImage: '',
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
      proofImage: pa.proofOfDelivery || '',
    });
    setShowMore(!!(pa.recipientPhone || pa.description || pa.weight || pa.origin || pa.destination || pa.proofOfDelivery));
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
        ...(form.proofImage.trim() && { proofOfDelivery: form.proofImage.trim() }),
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
                  <FormField label="Preuve de livraison (URL image)" icon={ImageIcon}>
                    <Input value={form.proofImage} onChange={e => setForm(f => ({ ...f, proofImage: e.target.value }))} placeholder="https://..." className="rounded-xl" />
                    {form.proofImage && (
                      <img src={form.proofImage} alt="Preuve" className="mt-2 h-28 w-full object-cover rounded-xl border border-gray-200" onError={e => { (e.target as any).style.display='none'; }} />
                    )}
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
  const [actioning, setActioning] = useState<Set<string>>(new Set());

  const handleTxAction = async (notif: AdminNotification, action: 'approve' | 'reject') => {
    const txId = notif.transactionId;
    if (!txId) return;
    const isDeposit = notif.type === 'client_deposit';
    const endpoint = isDeposit
      ? `/api/admin/client-deposit/${txId}/${action}`
      : `/api/admin/client-withdrawal/${txId}/${action}`;
    setActioning(s => new Set(s).add(notif.id));
    try {
      await adminFetch(endpoint, { method: 'POST', body: JSON.stringify({}) });
      toast.success(action === 'approve'
        ? (isDeposit ? 'Dépôt approuvé ✅' : 'Retrait approuvé ✅')
        : (isDeposit ? 'Dépôt rejeté ❌' : 'Retrait rejeté ❌')
      );
      setNotifications(n => n.map(notif2 =>
        notif2.id === notif.id ? { ...notif2, actioned: action, read: true } : notif2
      ));
      markOneRead(notif.id);
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setActioning(s => { const ns = new Set(s); ns.delete(notif.id); return ns; });
    }
  };

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
                      .filter(([k]) => !['id','type','title','message','amount','clientId','clientName','read','createdAt','updatedAt','transactionId','actioned'].includes(k))
                      .slice(0, 4)
                      .map(([k, v]) => v != null && (
                        <div key={k} className="mt-1 text-xs text-gray-400">
                          <span className="capitalize">{k}</span> : <span className="font-medium text-gray-600">{String(v)}</span>
                        </div>
                      ))
                    }
                    {/* Approve / Reject for deposit & withdrawal notifications */}
                    {(notif.type === 'client_deposit' || notif.type === 'client_withdrawal') && notif.transactionId && !notif.actioned && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleTxAction(notif, 'approve')}
                          disabled={actioning.has(notif.id)}
                          className="flex-1 h-8 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold gap-1.5"
                        >
                          {actioning.has(notif.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTxAction(notif, 'reject')}
                          disabled={actioning.has(notif.id)}
                          className="flex-1 h-8 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold gap-1.5"
                        >
                          {actioning.has(notif.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {(notif.type === 'client_deposit' || notif.type === 'client_withdrawal') && notif.actioned && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${notif.actioned === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notif.actioned === 'approve' ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {notif.actioned === 'approve' ? 'Approuvé' : 'Rejeté'}
                      </div>
                    )}
                  </div>
                  {!notif.read && !actioning.has(notif.id) && (
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

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PaymentMethod>>({});

  // Rates & fees state
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [depositFee, setDepositFee] = useState<string>('');
  const [withdrawalFee, setWithdrawalFee] = useState<string>('');
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch('/api/admin/settings-data');
        const s = data.settings || {};
        const saved: PaymentMethod[] = s.paymentMethods;
        if (saved && saved.length > 0) {
          setMethods(saved);
        } else {
          setMethods(DEFAULT_PAYMENT_METHODS.map(m => ({ ...m })));
        }
        if (s.exchangeRate !== undefined) setExchangeRate(String(s.exchangeRate));
        if (s.depositFeePercent !== undefined) setDepositFee(String(s.depositFeePercent));
        if (s.withdrawalFeePercent !== undefined) setWithdrawalFee(String(s.withdrawalFeePercent));
      } catch {
        setMethods(DEFAULT_PAYMENT_METHODS.map(m => ({ ...m })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveRates = async () => {
    const rate = parseFloat(exchangeRate);
    const depFee = parseFloat(depositFee);
    const witFee = parseFloat(withdrawalFee);
    if (isNaN(rate) || rate <= 0) { toast.error('Taux de conversion invalide.'); return; }
    if (isNaN(depFee) || depFee < 0 || depFee > 100) { toast.error('Frais de dépôt invalide (0–100%).'); return; }
    if (isNaN(witFee) || witFee < 0 || witFee > 100) { toast.error('Frais de retrait invalide (0–100%).'); return; }
    setSavingRates(true);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ exchangeRate: rate, depositFeePercent: depFee, withdrawalFeePercent: witFee }),
      });
      toast.success('Taux et frais enregistrés.');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setSavingRates(false);
    }
  };

  const startEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setEditForm({ ...m });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = methods.map(m => m.id === editingId ? { ...m, ...editForm } : m);
    setSaving(true);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ paymentMethods: updated }),
      });
      setMethods(updated);
      setEditingId(null);
      setEditForm({});
      toast.success('Méthode mise à jour.');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMethod = async (id: string) => {
    if (!window.confirm('Supprimer cette méthode de paiement ?')) return;
    const updated = methods.filter(m => m.id !== id);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ paymentMethods: updated }),
      });
      setMethods(updated);
      toast.success('Méthode supprimée.');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" /> Paramètres
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Taux, frais et méthodes de paiement</p>
        </div>
      </div>

      {/* ── Taux de conversion & Frais ──────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Taux de conversion & Frais
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Ces valeurs s'appliquent aux wallets de tous les clients</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Exchange rate */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" /> Taux de conversion (1 USD = X Gourdes)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">1 USD =</span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  placeholder="135"
                  className="pl-[72px] pr-14 h-11 rounded-xl text-sm font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-500">HTG</span>
              </div>
            </div>
            {exchangeRate && !isNaN(parseFloat(exchangeRate)) && parseFloat(exchangeRate) > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                → 1 HTG = ${(1 / parseFloat(exchangeRate)).toFixed(5)} USD
              </p>
            )}
          </div>

          {/* Fees row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-emerald-500" /> Frais de dépôt
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={depositFee}
                  onChange={e => setDepositFee(e.target.value)}
                  placeholder="0"
                  className="pr-8 h-11 rounded-xl text-sm font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-rose-500" /> Frais de retrait
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={withdrawalFee}
                  onChange={e => setWithdrawalFee(e.target.value)}
                  placeholder="0"
                  className="pr-8 h-11 rounded-xl text-sm font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-rose-500">%</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {(depositFee || withdrawalFee) && (
            <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Exemple dépôt 100 HTG</p>
                <p className="text-base font-black text-gray-800 mt-0.5">
                  {depositFee ? (100 - 100 * parseFloat(depositFee) / 100).toFixed(2) : '100'} HTG net
                </p>
                <p className="text-[10px] text-gray-400">{depositFee || '0'}% de frais</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Exemple retrait 100 HTG</p>
                <p className="text-base font-black text-gray-800 mt-0.5">
                  {withdrawalFee ? (100 - 100 * parseFloat(withdrawalFee) / 100).toFixed(2) : '100'} HTG net
                </p>
                <p className="text-[10px] text-gray-400">{withdrawalFee || '0'}% de frais</p>
              </div>
            </div>
          )}

          <Button
            onClick={saveRates}
            disabled={savingRates}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
          >
            {savingRates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer le taux et les frais
          </Button>
        </div>
      </div>

      {/* ── Méthodes de paiement ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Méthodes de paiement
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configurez le logo de chaque méthode affiché aux clients</p>
        </div>
        <div className="divide-y divide-gray-50">
          {methods.map(m => (
            <div key={m.id} className="p-4">
              {editingId === m.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-black text-gray-800">{m.name}</span>
                  </div>
                  <div>
                    <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5" /> URL du logo
                    </Label>
                    <Input
                      value={editForm.logoUrl || ''}
                      onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                      placeholder="https://exemple.com/logo.png"
                      className="rounded-xl h-10 text-sm"
                    />
                    {editForm.logoUrl && (
                      <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        <img
                          src={editForm.logoUrl}
                          alt="preview"
                          className="h-10 w-16 object-contain rounded-lg bg-white border border-gray-200"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                        />
                        <span className="text-xs text-gray-500 truncate">{editForm.logoUrl}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={saveEdit} disabled={saving} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold gap-1.5">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={cancelEdit} className="flex-1 h-9 rounded-xl text-sm font-bold">
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {m.logoUrl ? (
                      <img
                        src={m.logoUrl}
                        alt={m.name}
                        className="h-10 w-14 object-contain rounded-xl bg-gray-50 border border-gray-100 shrink-0"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-10 w-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xl">
                        {m.icon}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {m.logoUrl ? (
                          <span className="flex items-center gap-1 text-blue-500">
                            <Link className="h-3 w-3" />{m.logoUrl.substring(0, 40)}{m.logoUrl.length > 40 ? '…' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic">Aucun logo configuré</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(m)}
                      className="shrink-0 p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-all"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMethod(m.id)}
                      className="shrink-0 p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-300 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FORMATIONS ADMIN TAB ─────────────────────────────────────────────────────

type FormationsSubTab = 'list' | 'purchases' | 'payment-requests';

function FormationsAdminTab() {
  const [subTab, setSubTab] = useState<FormationsSubTab>('list');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [purchases, setPurchases] = useState<FormationPurchase[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const EMPTY_FORMATION: Omit<Formation, 'id' | 'createdAt' | 'updatedAt'> = {
    title: '', description: '', shortDescription: '', coverImage: '',
    price: 0, level: 'debutant', rating: 0, studentsCount: 0,
    modules: [], published: false, comingSoon: false, hasCertificate: false,
    instructor: '', category: '',
  };
  const [form, setForm] = useState<Partial<Formation>>({ ...EMPTY_FORMATION });

  const loadFormations = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/formations');
      setFormations(data.formations || []);
    } catch { /* silent */ }
  }, []);

  const loadPurchases = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/formations/purchases');
      setPurchases(data.purchases || []);
    } catch { /* silent */ }
  }, []);

  const loadPaymentRequests = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/formations/payment-requests');
      setPaymentRequests(data.requests || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadFormations(), loadPurchases(), loadPaymentRequests()]).finally(() => setLoading(false));
  }, [loadFormations, loadPurchases, loadPaymentRequests]);

  const openCreate = () => { setForm({ ...EMPTY_FORMATION }); setEditingFormation(null); setShowModal(true); };
  const openEdit = (f: Formation) => { setForm({ ...f }); setEditingFormation(f); setShowModal(true); };

  const saveFormation = async () => {
    if (!form.title?.trim()) { toast.error('Le titre est requis.'); return; }
    setSaving(true);
    try {
      if (editingFormation?.id) {
        await adminFetch(`/api/admin/formations/${editingFormation.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Formation mise à jour.');
      } else {
        await adminFetch('/api/admin/formations', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Formation créée.');
      }
      setShowModal(false);
      await loadFormations();
    } catch (e: any) { toast.error(e.message || 'Erreur.'); } finally { setSaving(false); }
  };

  const deleteFormation = async (id: string, title: string) => {
    if (!window.confirm(`Supprimer « ${title} » ?`)) return;
    try {
      await adminFetch(`/api/admin/formations/${id}`, { method: 'DELETE' });
      toast.success('Formation supprimée.');
      await loadFormations();
    } catch (e: any) { toast.error(e.message || 'Erreur.'); }
  };

  const togglePublish = async (f: Formation) => {
    try {
      await adminFetch(`/api/admin/formations/${f.id}`, { method: 'PUT', body: JSON.stringify({ ...f, published: !f.published }) });
      toast.success(f.published ? 'Formation masquée.' : 'Formation publiée.');
      await loadFormations();
    } catch (e: any) { toast.error(e.message || 'Erreur.'); }
  };

  const handlePurchaseStatus = async (id: string, formationId: string, status: string) => {
    try {
      await adminFetch(`/api/admin/formations/purchases/${id}`, { method: 'PATCH', body: JSON.stringify({ status, formationId }) });
      toast.success('Statut mis à jour.');
      await loadPurchases();
    } catch (e: any) { toast.error(e.message || 'Erreur.'); }
  };

  const handlePaymentRequest = async (id: string, action: 'approve' | 'reject') => {
    try {
      await adminFetch(`/api/admin/formations/payment-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      toast.success(action === 'approve' ? 'Demande approuvée.' : 'Demande rejetée.');
      await Promise.all([loadPaymentRequests(), loadPurchases()]);
    } catch (e: any) { toast.error(e.message || 'Erreur.'); }
  };

  const filteredFormations = formations.filter(f =>
    !searchQ || f.title.toLowerCase().includes(searchQ.toLowerCase()) || (f.category || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const pendingPaymentRequests = paymentRequests.filter(r => r.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-purple-600" /> Formations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{formations.length} formation{formations.length !== 1 ? 's' : ''} · {purchases.length} achat{purchases.length !== 1 ? 's' : ''}</p>
        </div>
        {subTab === 'list' && (
          <Button onClick={openCreate} className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2">
            <Plus className="h-4 w-4" /> Nouvelle formation
          </Button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        {([
          { id: 'list' as FormationsSubTab, label: 'Formations', count: formations.length },
          { id: 'purchases' as FormationsSubTab, label: 'Achats', count: purchases.length },
          { id: 'payment-requests' as FormationsSubTab, label: 'Demandes paiement', count: pendingPaymentRequests },
        ]).map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              subTab === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                id === 'payment-requests' && pendingPaymentRequests > 0
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-200 text-gray-600'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Formations list ── */}
      {subTab === 'list' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Rechercher une formation…"
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-300"
            />
          </div>
          {filteredFormations.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Aucune formation" description="Cliquez sur « Nouvelle formation » pour en créer une." />
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredFormations.map(f => (
                <div key={f.id} className="p-4 flex items-center gap-4">
                  {f.coverImage ? (
                    <img src={f.coverImage} alt={f.title} className="h-14 w-20 object-cover rounded-xl shrink-0 bg-gray-100" />
                  ) : (
                    <div className="h-14 w-20 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-purple-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-gray-800 text-sm truncate">{f.title}</p>
                      {f.published ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Brouillon</span>
                      )}
                      {f.comingSoon && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Bientôt</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{f.shortDescription || f.description?.substring(0, 60)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-purple-600">{f.price.toLocaleString()} HTG</span>
                      <span className="text-xs text-gray-400">{f.level}</span>
                      {f.studentsCount > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="h-3 w-3" />{f.studentsCount}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublish(f)}
                      className={`p-2 rounded-xl transition-all ${f.published ? 'hover:bg-green-50 text-green-500' : 'hover:bg-gray-100 text-gray-300'}`}
                      title={f.published ? 'Masquer' : 'Publier'}
                    >
                      {f.published ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => openEdit(f)}
                      className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-all"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFormation(f.id!, f.title)}
                      className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-300 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Purchases ── */}
      {subTab === 'purchases' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {purchases.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Aucun achat" description="Les achats de formations apparaîtront ici." />
          ) : (
            <div className="divide-y divide-gray-50">
              {purchases.map((p: FormationPurchase & { id: string }) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 text-sm">{p.formationTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.userEmail} · {p.userName}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-bold text-purple-600">{p.amount?.toLocaleString()} HTG</span>
                      <span className="text-xs text-gray-400">{p.method}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>{p.status}</span>
                    </div>
                  </div>
                  {p.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePurchaseStatus(p.id, p.formationId, 'active')}
                        className="h-8 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold gap-1"
                      >
                        <Check className="h-3 w-3" /> Activer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePurchaseStatus(p.id, p.formationId, 'cancelled')}
                        className="h-8 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold gap-1"
                      >
                        <X className="h-3 w-3" /> Annuler
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payment requests ── */}
      {subTab === 'payment-requests' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {paymentRequests.length === 0 ? (
            <EmptyState icon={DollarSign} title="Aucune demande" description="Les demandes de paiement manuel apparaîtront ici." />
          ) : (
            <div className="divide-y divide-gray-50">
              {paymentRequests.map((r: any) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 text-sm">{r.formationTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.userEmail} · {r.userName}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-bold text-purple-600">{r.amount?.toLocaleString()} HTG</span>
                      <span className="text-xs text-gray-400">{r.method}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>{r.status}</span>
                    </div>
                    {r.notes && <p className="text-xs text-gray-400 mt-1 italic">"{r.notes}"</p>}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePaymentRequest(r.id, 'approve')}
                        className="h-8 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold gap-1"
                      >
                        <Check className="h-3 w-3" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePaymentRequest(r.id, 'reject')}
                        className="h-8 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold gap-1"
                      >
                        <X className="h-3 w-3" /> Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal création/édition ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-gray-900">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {editingFormation ? 'Modifier la formation' : 'Nouvelle formation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Titre *</Label>
                <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la formation" className="rounded-xl h-10" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Description courte</Label>
                <Input value={form.shortDescription || ''} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder="Résumé en une phrase" className="rounded-xl h-10" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Description complète</Label>
                <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description détaillée…" className="rounded-xl min-h-[80px]" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Image de couverture (URL)</Label>
                <Input value={form.coverImage || ''} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="https://…" className="rounded-xl h-10" />
                {form.coverImage && (
                  <img src={form.coverImage} alt="preview" className="mt-2 h-24 w-full object-cover rounded-xl bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Prix (HTG)</Label>
                <Input type="number" value={form.price || 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="rounded-xl h-10" min={0} />
              </div>
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Niveau</Label>
                <Select value={form.level || 'débutant'} onValueChange={v => setForm(f => ({ ...f, level: v as any }))}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="débutant">Débutant</SelectItem>
                    <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
                    <SelectItem value="avancé">Avancé</SelectItem>
                    <SelectItem value="tous niveaux">Tous niveaux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Instructeur</Label>
                <Input value={form.instructor || ''} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} placeholder="Nom de l'instructeur" className="rounded-xl h-10" />
              </div>
              <div>
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5 block">Catégorie</Label>
                <Input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Entrepreneuriat" className="rounded-xl h-10" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-bold text-gray-700">Publié</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.comingSoon} onChange={e => setForm(f => ({ ...f, comingSoon: e.target.checked }))} className="w-4 h-4 rounded accent-orange-500" />
                <span className="text-sm font-bold text-gray-700">Bientôt disponible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.hasCertificate} onChange={e => setForm(f => ({ ...f, hasCertificate: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm font-bold text-gray-700">Certificat</span>
              </label>
            </div>

            {/* ── Chapitres & Leçons ── */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" /> Chapitres & Leçons
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const newChapter: FormationChapter = {
                      id: `ch-${Date.now()}`,
                      title: '',
                      order: (form.chapters?.length ?? 0) + 1,
                    };
                    setForm(f => ({ ...f, chapters: [...(f.chapters || []), newChapter] }));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un chapitre
                </button>
              </div>

              {(!form.chapters || form.chapters.length === 0) ? (
                <div className="text-center py-6 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">Aucun chapitre — cliquez sur « Ajouter un chapitre »</p>
                  <p className="text-[10px] mt-1 text-gray-300">Chaque chapitre peut contenir plusieurs leçons.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(form.chapters || []).map((chapter, ci) => {
                    const chapterLessons = (form.modules || []).filter(m => m.chapterId === chapter.id);
                    return (
                      <div key={chapter.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Chapter header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50/60 border-b border-purple-100/50">
                          <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest shrink-0 w-8">Ch.{ci + 1}</span>
                          <Input
                            value={chapter.title}
                            onChange={e => {
                              const updated = [...(form.chapters || [])];
                              updated[ci] = { ...updated[ci], title: e.target.value };
                              setForm(f => ({ ...f, chapters: updated }));
                            }}
                            placeholder="Titre du chapitre"
                            className="rounded-xl h-8 text-sm bg-white flex-1 border-purple-100"
                          />
                          <button
                            type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              chapters: (f.chapters || []).filter((_, i) => i !== ci),
                              modules: (f.modules || []).filter(m => m.chapterId !== chapter.id),
                            }))}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Lessons */}
                        <div className="p-3 space-y-2">
                          {chapterLessons.map((lesson, li) => {
                            const lessonGlobalIdx = (form.modules || []).findIndex(m => m.id === lesson.id);
                            return (
                              <div key={lesson.id} className="bg-white rounded-xl p-2.5 border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Leçon {li + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, modules: (f.modules || []).filter(m => m.id !== lesson.id) }))}
                                    className="p-1 rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <Input
                                  value={lesson.title}
                                  onChange={e => {
                                    const updated = [...(form.modules || [])];
                                    updated[lessonGlobalIdx] = { ...updated[lessonGlobalIdx], title: e.target.value };
                                    setForm(f => ({ ...f, modules: updated }));
                                  }}
                                  placeholder="Titre de la leçon"
                                  className="rounded-xl h-8 text-sm bg-gray-50"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="relative">
                                    <Input
                                      value={lesson.videoUrl}
                                      onChange={e => {
                                        const updated = [...(form.modules || [])];
                                        updated[lessonGlobalIdx] = { ...updated[lessonGlobalIdx], videoUrl: e.target.value };
                                        setForm(f => ({ ...f, modules: updated }));
                                      }}
                                      placeholder="URL vidéo (YouTube…)"
                                      className="rounded-xl h-8 text-sm bg-gray-50 pl-8"
                                    />
                                    <ExternalLink className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-300" />
                                  </div>
                                  <Input
                                    value={lesson.duration}
                                    onChange={e => {
                                      const updated = [...(form.modules || [])];
                                      updated[lessonGlobalIdx] = { ...updated[lessonGlobalIdx], duration: e.target.value };
                                      setForm(f => ({ ...f, modules: updated }));
                                    }}
                                    placeholder="Durée (ex: 12:30)"
                                    className="rounded-xl h-8 text-sm bg-gray-50"
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              const newLesson: FormationModule = {
                                id: `les-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                title: '',
                                videoUrl: '',
                                duration: '',
                                order: chapterLessons.length + 1,
                                description: '',
                                chapterId: chapter.id,
                              };
                              setForm(f => ({ ...f, modules: [...(f.modules || []), newLesson] }));
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-500 text-xs font-bold hover:bg-indigo-50 transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Ajouter une leçon
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl font-bold">Annuler</Button>
            <Button onClick={saveFormation} disabled={saving} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingFormation ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
