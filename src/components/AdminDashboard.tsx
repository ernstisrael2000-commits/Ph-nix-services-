import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Trash2, Search, Bell, Edit2,
  Loader2, CheckCircle2, Truck, Clock, AlertCircle,
  LogOut, X, LayoutGrid, ChevronDown, Info,
  AlertTriangle, Zap, Wallet, QrCode,
  ToggleLeft, ToggleRight, CreditCard, Smartphone,
  Building2, Globe, Bitcoin, GraduationCap, Settings,
  ArrowDownToLine, ArrowUpFromLine, ShoppingBag,
  Tag, Star, Users, CheckCheck, RefreshCw, Menu,
  MapPin, Weight, FileText, ChevronUp, Video,
  Link as LinkIcon, ArrowLeft, BookOpen,
  Layers, Save, Eye, EyeOff, GripVertical,
  Wifi, TrendingUp, List, ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  useParcels, saveParcel, deleteParcel,
  useProducts, saveProduct, deleteProduct,
  useSettings, updateSettings,
  useAdminFormations, saveAdminFormation, deleteAdminFormation,
  useCardTopups, saveCardTopup, deleteCardTopup,
} from '../services/parcelService';
import {
  AdminAccount, Parcel, ParcelStatus, PaymentStatus, Product,
  PaymentMethod, DEFAULT_PAYMENT_METHODS, Formation, FormationLevel,
  FormationModule, FormationChapter, FormationResource, CardTopup, RechargeField,
} from '../types';
import AdminWalletManager from './AdminWalletManager';
import AdminPromotionSection from './AdminPromotionSection';
import PhenixAgent from './PhenixAgent';

const ADMIN_SECRET = 'rena-admin-2024';

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
}

type Section = 'parcels' | 'products' | 'payment-methods' | 'notifications' | 'requests' | 'formations' | 'wallet' | 'cards' | 'promotion';

interface SystemNotif {
  id: string;
  title?: string | null;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  adminName: string;
  read: boolean;
  createdAt: any;
}

interface AdminNotif {
  id: string;
  type: 'client_deposit' | 'client_withdrawal' | 'card_order' | string;
  clientId?: string;
  clientName?: string;
  clientWalletId?: string;
  transactionId?: string;
  amount?: number;
  htgAmount?: number;
  exchangeRate?: number;
  method?: string;
  accountNumber?: string;
  accountName?: string;
  cardDetails?: Record<string, any>;
  message?: string;
  title?: string;
  proofImageUrl?: string;
  read: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string;
  required: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const STATUS_CONFIG: Record<ParcelStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'En route':   { label: 'En route',   color: 'bg-blue-100 text-blue-700',    icon: <Truck className="h-3 w-3" /> },
  'En transit': { label: 'En transit', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-3 w-3" /> },
  'Arrivé':     { label: 'Arrivé',     color: 'bg-purple-100 text-purple-700', icon: <AlertCircle className="h-3 w-3" /> },
  'Livré':      { label: 'Livré',      color: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="h-3 w-3" /> },
};

const NOTIF_CONFIG = {
  info:    { label: 'Info',      color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: <Info className="h-4 w-4" /> },
  success: { label: 'Succès',    color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className="h-4 w-4" /> },
  warning: { label: 'Attention', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-4 w-4" /> },
  error:   { label: 'Erreur',    color: 'bg-red-50 text-red-700 border-red-200',       icon: <AlertCircle className="h-4 w-4" /> },
};

function getMethodTypeIcon(type: string) {
  switch (type) {
    case 'mobile_money':  return <Smartphone className="h-4 w-4" />;
    case 'crypto':        return <Bitcoin className="h-4 w-4" />;
    case 'bank_transfer': return <Building2 className="h-4 w-4" />;
    case 'payment_app':   return <Globe className="h-4 w-4" />;
    case 'card':          return <CreditCard className="h-4 w-4" />;
    default:              return <Wallet className="h-4 w-4" />;
  }
}

// ─── Hook: notifications système ──────────────────────────────────────────────
function useSystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/system-notifications', { headers: { 'x-admin-secret': ADMIN_SECRET } })
      .then(r => r.json()).then(d => setNotifications(d.notifications || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  return { notifications, loading, reload: load };
}

function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch('/api/admin/notifications', { headers: { 'x-admin-secret': ADMIN_SECRET } })
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false); });
  }, []);
  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, [load]);
  return { notifications, loading, reload: () => load(false) };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'requests'        as Section, label: 'Demandes',    icon: Bell },
  { id: 'parcels'         as Section, label: 'Colis',       icon: Package },
  { id: 'products'        as Section, label: 'Produits',    icon: LayoutGrid },
  { id: 'cards'           as Section, label: 'Cartes',      icon: CreditCard },
  { id: 'formations'      as Section, label: 'Formations',  icon: GraduationCap },
  { id: 'promotion'       as Section, label: 'Promotion',   icon: Wifi },
  { id: 'payment-methods' as Section, label: 'Paiements',   icon: Wallet },
  { id: 'notifications'   as Section, label: 'Annonces',    icon: Info },
  { id: 'wallet'          as Section, label: 'Paramètres',  icon: Settings },
];

interface SidebarProps {
  section: Section;
  setSection: (s: Section) => void;
  admin: AdminAccount;
  onLogout: () => void;
  pendingCount: number;
  onClose?: () => void;
}

function AdminSidebar({ section, setSection, admin, onLogout, pendingCount, onClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Administration</p>
            <p className="text-xs text-gray-400 truncate max-w-[130px]">{admin.fullName}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-gray-800 hover:bg-red-500 text-gray-400 hover:text-white transition-all duration-200 shadow-sm shrink-0"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = section === id;
          const badge = id === 'requests' && pendingCount > 0 ? pendingCount : 0;
          return (
            <button key={id} onClick={() => { setSection(id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all">
          <LogOut className="h-4 w-4" />Déconnexion
        </button>
      </div>
    </div>
  );
}

// ─── Formation Full-Page Editor ───────────────────────────────────────────────
type FormationEditorTab = 'general' | 'chapitres' | 'lecons' | 'ressources';

function FormationEditor({
  formation, onClose, onSaved,
}: {
  formation: Partial<Formation> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !formation?.id;
  const [tab, setTab] = useState<FormationEditorTab>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // General fields
  const [general, setGeneral] = useState<Partial<Formation>>({
    title: '', shortDescription: '', description: '', coverImage: '',
    previewVideoUrl: '', price: 0, originalPrice: undefined,
    level: 'debutant', category: '', language: 'Français', totalDuration: '',
    instructor: '', instructorBio: '', instructorAvatar: '',
    hasCertificate: false, published: false, comingSoon: false,
    rating: 5, studentsCount: 0,
    ...formation,
  });

  // Chapters
  const [chapters, setChapters] = useState<FormationChapter[]>(formation?.chapters || []);

  // Lessons (modules)
  const [modules, setModules] = useState<FormationModule[]>(formation?.modules || []);

  // Resources
  const [resources, setResources] = useState<FormationResource[]>(formation?.resources || []);

  // Chapter helpers
  function addChapter() {
    const newCh: FormationChapter = { id: uid(), title: '', order: chapters.length + 1 };
    setChapters(c => [...c, newCh]);
  }
  function updateChapter(id: string, key: keyof FormationChapter, val: any) {
    setChapters(c => c.map(ch => ch.id === id ? { ...ch, [key]: val } : ch));
  }
  function removeChapter(id: string) {
    setChapters(c => c.filter(ch => ch.id !== id));
    setModules(m => m.filter(mod => mod.chapterId !== id));
  }
  function moveChapter(id: string, dir: 'up' | 'down') {
    setChapters(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(c => c.id === id);
      if (dir === 'up' && idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }
      if (dir === 'down' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
      return arr.map((c, i) => ({ ...c, order: i + 1 }));
    });
  }

  // Module helpers
  function addModule() {
    const newMod: FormationModule = {
      id: uid(), title: '', videoUrl: '', duration: '',
      order: modules.length + 1, chapterId: chapters[0]?.id || '',
    };
    setModules(m => [...m, newMod]);
  }
  function updateModule(id: string, key: keyof FormationModule, val: any) {
    setModules(m => m.map(mod => mod.id === id ? { ...mod, [key]: val } : mod));
  }
  function removeModule(id: string) { setModules(m => m.filter(mod => mod.id !== id)); }
  function moveModule(id: string, dir: 'up' | 'down') {
    setModules(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(m => m.id === id);
      if (dir === 'up' && idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }
      if (dir === 'down' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
      return arr.map((m, i) => ({ ...m, order: i + 1 }));
    });
  }

  // Resource helpers
  function addResource() {
    setResources(r => [...r, { id: uid(), name: '', url: '', type: 'link' }]);
  }
  function updateResource(id: string, key: keyof FormationResource, val: any) {
    setResources(r => r.map(res => res.id === id ? { ...res, [key]: val } : res));
  }
  function removeResource(id: string) { setResources(r => r.filter(res => res.id !== id)); }

  async function handleSave() {
    if (!general.title?.trim()) { setError('Le titre est requis.'); setTab('general'); return; }
    setSaving(true); setError('');
    try {
      await saveAdminFormation({
        ...general,
        price: Number(general.price) || 0,
        originalPrice: general.originalPrice ? Number(general.originalPrice) : undefined,
        modules, chapters, resources,
      }, formation?.id);
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setSaving(false); }
  }

  const TABS: { id: FormationEditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',    label: 'Général',   icon: <Info className="h-4 w-4" /> },
    { id: 'chapitres',  label: `Chapitres (${chapters.length})`, icon: <Layers className="h-4 w-4" /> },
    { id: 'lecons',     label: `Leçons (${modules.length})`,     icon: <BookOpen className="h-4 w-4" /> },
    { id: 'ressources', label: `Ressources (${resources.length})`, icon: <LinkIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{isNew ? 'Nouvelle formation' : `Modifier — ${general.title || '…'}`}</p>
            <p className="text-xs text-gray-400">{isNew ? 'Remplissez les informations ci-dessous' : 'Toutes les modifications sont sauvegardées'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setGeneral(g => ({ ...g, published: !g.published }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                general.published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
              {general.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {general.published ? 'Publié' : 'Brouillon'}
            </button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 h-9 px-4">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </Button>
          </div>
        </div>
        {/* Tab nav */}
        <div className="max-w-4xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

          {/* ── Tab: Général */}
          {tab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-bold">Titre de la formation *</Label>
                  <Input className="rounded-xl h-11" placeholder="Ex: Maîtrisez le Marketing Digital" value={general.title || ''} onChange={e => setGeneral(g => ({ ...g, title: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-bold">Résumé court</Label>
                  <Input className="rounded-xl" placeholder="Une phrase accrocheuse" value={general.shortDescription || ''} onChange={e => setGeneral(g => ({ ...g, shortDescription: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-bold">Description complète</Label>
                  <Textarea className="rounded-xl resize-none" rows={4} placeholder="Décrivez le contenu, les objectifs, ce que l'apprenant va gagner…" value={general.description || ''} onChange={e => setGeneral(g => ({ ...g, description: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-bold">Image de couverture (URL)</Label>
                  <Input className="rounded-xl" placeholder="https://…" value={general.coverImage || ''} onChange={e => setGeneral(g => ({ ...g, coverImage: e.target.value }))} />
                  {general.coverImage && (
                    <img src={general.coverImage} alt="cover" className="mt-2 h-32 w-full object-cover rounded-xl border" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-bold">Vidéo de prévisualisation (URL)</Label>
                  <Input className="rounded-xl" placeholder="https://youtube.com/…" value={general.previewVideoUrl || ''} onChange={e => setGeneral(g => ({ ...g, previewVideoUrl: e.target.value }))} />
                </div>
              </div>

              {/* Pricing & meta */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <h3 className="font-bold text-gray-800">Tarification & Détails</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prix ($) *</Label>
                    <Input className="rounded-xl" type="number" placeholder="0" value={general.price ?? ''} onChange={e => setGeneral(g => ({ ...g, price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prix barré ($)</Label>
                    <Input className="rounded-xl" type="number" placeholder="—" value={general.originalPrice ?? ''} onChange={e => setGeneral(g => ({ ...g, originalPrice: parseFloat(e.target.value) || undefined }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Niveau</Label>
                    <Select value={general.level || 'debutant'} onValueChange={v => setGeneral(g => ({ ...g, level: v as FormationLevel }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debutant">Débutant</SelectItem>
                        <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                        <SelectItem value="avance">Avancé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Langue</Label>
                    <Input className="rounded-xl" placeholder="Français" value={general.language || ''} onChange={e => setGeneral(g => ({ ...g, language: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Durée totale</Label>
                    <Input className="rounded-xl" placeholder="Ex: 12h 30min" value={general.totalDuration || ''} onChange={e => setGeneral(g => ({ ...g, totalDuration: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Catégorie</Label>
                    <Input className="rounded-xl" placeholder="Ex: Marketing" value={general.category || ''} onChange={e => setGeneral(g => ({ ...g, category: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Limite d'inscrits</Label>
                    <Input className="rounded-xl" type="number" placeholder="Illimité" value={general.enrollmentLimit ?? ''} onChange={e => setGeneral(g => ({ ...g, enrollmentLimit: parseInt(e.target.value) || undefined }))} />
                  </div>
                </div>
              </div>

              {/* Instructor */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <h3 className="font-bold text-gray-800">Formateur / Instructeur</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nom du formateur</Label>
                    <Input className="rounded-xl" placeholder="Ex: Jean Dupont" value={general.instructor || ''} onChange={e => setGeneral(g => ({ ...g, instructor: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Photo (URL)</Label>
                    <Input className="rounded-xl" placeholder="https://…" value={general.instructorAvatar || ''} onChange={e => setGeneral(g => ({ ...g, instructorAvatar: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Bio du formateur</Label>
                    <Textarea className="rounded-xl resize-none" rows={2} value={general.instructorBio || ''} onChange={e => setGeneral(g => ({ ...g, instructorBio: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-gray-800">Options</h3>
                {[
                  { key: 'hasCertificate', label: 'Certificat inclus', desc: 'L\'apprenant reçoit un certificat à la fin' },
                  { key: 'comingSoon', label: 'Bientôt disponible', desc: 'Affiche un badge "Prochainement"' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <button onClick={() => setGeneral(g => ({ ...g, [key]: !(g as any)[key] }))}>
                      {(general as any)[key]
                        ? <ToggleRight className="h-8 w-8 text-primary" />
                        : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Chapitres */}
          {tab === 'chapitres' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Organisez votre formation en chapitres. Les leçons seront assignées à chaque chapitre.</p>
                <Button onClick={addChapter} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                  <Plus className="h-4 w-4" />Ajouter
                </Button>
              </div>
              {chapters.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-2xl">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold">Aucun chapitre</p>
                  <p className="text-sm mt-1">Cliquez sur "Ajouter" pour créer votre premier chapitre</p>
                </div>
              ) : chapters.map((ch, idx) => (
                <div key={ch.id} className="bg-white border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                    <Input className="rounded-xl flex-1 font-bold" placeholder="Titre du chapitre" value={ch.title} onChange={e => updateChapter(ch.id, 'title', e.target.value)} />
                    <div className="flex gap-1">
                      <button onClick={() => moveChapter(ch.id, 'up')} disabled={idx === 0} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => moveChapter(ch.id, 'down')} disabled={idx === chapters.length - 1} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeChapter(ch.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Textarea className="rounded-xl resize-none" rows={2} placeholder="Description du chapitre (optionnel)"
                    value={ch.description || ''} onChange={e => updateChapter(ch.id, 'description', e.target.value)} />
                  <p className="text-xs text-gray-400">
                    {modules.filter(m => m.chapterId === ch.id).length} leçon{modules.filter(m => m.chapterId === ch.id).length !== 1 ? 's' : ''} dans ce chapitre
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Leçons */}
          {tab === 'lecons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Ajoutez les leçons vidéo de votre formation.</p>
                <Button onClick={addModule} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                  <Plus className="h-4 w-4" />Ajouter une leçon
                </Button>
              </div>
              {modules.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-2xl">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold">Aucune leçon</p>
                  <p className="text-sm mt-1">Ajoutez des leçons vidéo à votre formation</p>
                </div>
              ) : modules.map((mod, idx) => {
                const chapter = chapters.find(c => c.id === mod.chapterId);
                return (
                  <div key={mod.id} className="bg-white border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                      <Input className="rounded-xl flex-1 font-semibold" placeholder="Titre de la leçon" value={mod.title} onChange={e => updateModule(mod.id, 'title', e.target.value)} />
                      <div className="flex gap-1">
                        <button onClick={() => moveModule(mod.id, 'up')} disabled={idx === 0} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                        <button onClick={() => moveModule(mod.id, 'down')} disabled={idx === modules.length - 1} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                        <button onClick={() => removeModule(mod.id)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs">URL Vidéo</Label>
                        <div className="relative">
                          <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input className="rounded-xl pl-8 text-sm" placeholder="https://…" value={mod.videoUrl} onChange={e => updateModule(mod.id, 'videoUrl', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Durée</Label>
                        <Input className="rounded-xl text-sm" placeholder="Ex: 12:30" value={mod.duration} onChange={e => updateModule(mod.id, 'duration', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Chapitre</Label>
                        <Select value={mod.chapterId || ''} onValueChange={v => updateModule(mod.id, 'chapterId', v)}>
                          <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="— aucun chapitre —" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— aucun chapitre —</SelectItem>
                            {chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.title || `Chapitre ${c.order}`}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">PDF annexe (URL)</Label>
                        <Input className="rounded-xl text-sm" placeholder="https://…" value={mod.pdfUrl || ''} onChange={e => updateModule(mod.id, 'pdfUrl', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea className="rounded-xl resize-none text-sm" rows={1} value={mod.description || ''} onChange={e => updateModule(mod.id, 'description', e.target.value)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tab: Ressources */}
          {tab === 'ressources' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">PDFs, liens utiles, fichiers téléchargeables à partager avec les apprenants.</p>
                <Button onClick={addResource} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                  <Plus className="h-4 w-4" />Ajouter
                </Button>
              </div>
              {resources.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-2xl">
                  <LinkIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold">Aucune ressource</p>
                  <p className="text-sm mt-1">Ajoutez des PDF, liens ou fichiers complémentaires</p>
                </div>
              ) : resources.map(res => (
                <div key={res.id} className="bg-white border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input className="rounded-xl text-sm" placeholder="Ex: Guide PDF" value={res.name} onChange={e => updateResource(res.id, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input className="rounded-xl text-sm" placeholder="https://…" value={res.url} onChange={e => updateResource(res.id, 'url', e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={res.type} onValueChange={v => updateResource(res.id, 'type', v)}>
                        <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Lien</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="file">Fichier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button onClick={() => removeResource(res.id)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-400 border">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Demandes clients ────────────────────────────────────────────────
function RequestsSection() {
  const { notifications, loading, reload } = useAdminNotifications();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AdminNotif | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'done'>('pending');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const clientRequests = notifications.filter(n => ['client_deposit', 'client_withdrawal', 'card_order'].includes(n.type));
  const filtered = clientRequests.filter(n => {
    const processed = n.read || n.status === 'approved' || n.status === 'rejected';
    if (filterType === 'pending') return !processed;
    if (filterType === 'done') return processed;
    return true;
  });
  const pendingCount = clientRequests.filter(n => !n.read && n.status !== 'approved' && n.status !== 'rejected').length;

  async function approveDeposit(n: AdminNotif) {
    if (!n.transactionId) return;
    setActionLoading(n.id);
    try {
      const res = await fetch(`/api/admin/client-deposit/${n.transactionId}/approve`, { method: 'POST', headers: { 'x-admin-secret': ADMIN_SECRET } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH', headers: { 'x-admin-secret': ADMIN_SECRET } });
      reload();
    } catch (e: any) { alert(e.message || 'Erreur'); } finally { setActionLoading(null); }
  }
  async function approveWithdrawal(n: AdminNotif) {
    if (!n.transactionId) return;
    setActionLoading(n.id);
    try {
      const res = await fetch(`/api/admin/client-withdrawal/${n.transactionId}/approve`, { method: 'POST', headers: { 'x-admin-secret': ADMIN_SECRET } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH', headers: { 'x-admin-secret': ADMIN_SECRET } });
      reload();
    } catch (e: any) { alert(e.message || 'Erreur'); } finally { setActionLoading(null); }
  }
  async function rejectRequest(n: AdminNotif) {
    if (!n.transactionId) return;
    setActionLoading(n.id);
    try {
      const endpoint = n.type === 'client_deposit'
        ? `/api/admin/client-deposit/${n.transactionId}/reject`
        : `/api/admin/client-withdrawal/${n.transactionId}/reject`;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET }, body: JSON.stringify({ reason: rejectReason }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH', headers: { 'x-admin-secret': ADMIN_SECRET } });
      setRejectDialogOpen(false); setRejectReason(''); setSelectedNotif(null); reload();
    } catch (e: any) { alert(e.message || 'Erreur'); } finally { setActionLoading(null); }
  }
  async function markDone(n: AdminNotif) {
    setActionLoading(n.id);
    try {
      await fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH', headers: { 'x-admin-secret': ADMIN_SECRET } });
      reload();
    } catch {} finally { setActionLoading(null); }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'client_deposit':    return { label: 'Dépôt',    color: 'bg-blue-100 text-blue-700',    icon: <ArrowDownToLine className="h-3 w-3" /> };
      case 'client_withdrawal': return { label: 'Retrait',  color: 'bg-purple-100 text-purple-700', icon: <ArrowUpFromLine className="h-3 w-3" /> };
      case 'card_order':        return { label: 'Commande', color: 'bg-amber-100 text-amber-700',   icon: <ShoppingBag className="h-3 w-3" /> };
      default:                  return { label: type,       color: 'bg-gray-100 text-gray-700',     icon: <Bell className="h-3 w-3" /> };
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['pending', 'all', 'done'] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterType === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'pending' ? `En attente${pendingCount > 0 ? ` (${pendingCount})` : ''}` : f === 'all' ? 'Tout voir' : 'Traités'}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{filterType === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const badge = getTypeBadge(n.type);
            const processed = n.read || n.status === 'approved' || n.status === 'rejected';
            const isLoading = actionLoading === n.id;
            return (
              <div key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${processed ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${badge.color}`}>{badge.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>{badge.icon}{badge.label}</span>
                      {processed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700"><CheckCircle2 className="h-2.5 w-2.5" />Traité</span>}
                    </div>
                    <p className="font-bold text-gray-900 mt-1.5 text-sm">{n.clientName || 'Client anonyme'}{n.clientWalletId && <span className="text-gray-400 font-normal ml-1">· #{n.clientWalletId}</span>}</p>
                    {(n.type === 'client_deposit' || n.type === 'client_withdrawal') && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        {(n.amount || 0) > 0 && <span className="font-bold text-gray-900 text-sm">${(n.amount || 0).toFixed(2)} USD{n.htgAmount && <span className="text-gray-400 font-normal"> ≈ {Math.round(n.htgAmount).toLocaleString()} HTG</span>}</span>}
                        {n.method && <span>Méthode: <strong>{n.method}</strong></span>}
                        {n.accountNumber && <span>Compte: <strong className="font-mono">{n.accountNumber}</strong></span>}
                        {n.accountName && <span>Titulaire: <strong>{n.accountName}</strong></span>}
                      </div>
                    )}
                    {n.type === 'card_order' && (n.title || n.message) && (
                      <div className="mt-1 text-xs text-gray-600">
                        {n.title && <p className="font-semibold text-gray-800">{n.title}</p>}
                        {n.message && <p>{n.message}</p>}
                      </div>
                    )}
                    {n.proofImageUrl && (n.type === 'client_deposit' || n.type === 'client_withdrawal') && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Preuve de paiement</p>
                        <button
                          onClick={() => setLightboxUrl(n.proofImageUrl!)}
                          className="relative group rounded-xl overflow-hidden border border-gray-200 hover:border-primary/40 transition-colors block"
                          style={{ width: 120, height: 80 }}
                        >
                          <img
                            src={n.proofImageUrl}
                            alt="Preuve de paiement"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/50 px-2 py-0.5 rounded-full">Voir</span>
                          </div>
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
                {!processed && (
                  <div className="mt-3 flex gap-2 pt-3 border-t border-gray-50">
                    {n.type === 'client_deposit' && (<>
                      <Button size="sm" className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-1.5 h-9" onClick={() => approveDeposit(n)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-1.5 h-9"
                        onClick={() => { setSelectedNotif(n); setRejectReason(''); setRejectDialogOpen(true); }} disabled={isLoading}>
                        <X className="h-3.5 w-3.5" />Rejeter
                      </Button>
                    </>)}
                    {n.type === 'client_withdrawal' && (<>
                      <Button size="sm" className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-1.5 h-9" onClick={() => approveWithdrawal(n)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-1.5 h-9"
                        onClick={() => { setSelectedNotif(n); setRejectReason(''); setRejectDialogOpen(true); }} disabled={isLoading}>
                        <X className="h-3.5 w-3.5" />Rejeter
                      </Button>
                    </>)}
                    {n.type === 'card_order' && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-9" onClick={() => markDone(n)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}Marquer traité
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>{selectedNotif?.type === 'client_deposit' ? 'Dépôt' : 'Retrait'} de <strong>{selectedNotif?.clientName}</strong>{selectedNotif?.amount ? ` — $${selectedNotif.amount.toFixed(2)} USD` : ''}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Raison du rejet (optionnel)</Label>
            <Textarea className="rounded-xl resize-none" rows={3} placeholder="Ex: Preuve invalide…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => selectedNotif && rejectRequest(selectedNotif)} disabled={actionLoading === selectedNotif?.id}>
              {actionLoading === selectedNotif?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox preuve de paiement ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white font-bold text-sm flex items-center gap-1.5 transition-colors"
            >
              <X className="h-4 w-4" /> Fermer
            </button>
            <img
              src={lightboxUrl}
              alt="Preuve de paiement"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-white/60 hover:text-white text-xs font-semibold transition-colors"
              onClick={e => e.stopPropagation()}
            >
              Ouvrir en plein écran →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parcel Card ──────────────────────────────────────────────────────────────
function ParcelCard({ parcel, onEdit, onDelete, onStatusChange, quickSaving }: {
  parcel: Parcel;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: ParcelStatus) => void;
  quickSaving: boolean;
}) {
  const sc = STATUS_CONFIG[parcel.status] || STATUS_CONFIG['En route'];
  return (
    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
      {/* Image */}
      <div className={`h-36 overflow-hidden shrink-0 relative ${parcel.image ? 'bg-gray-100' : 'bg-gradient-to-br from-primary/10 to-primary/5'}`}>
        {parcel.image ? (
          <img src={parcel.image} alt={parcel.trackingNumber} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-14 w-14 text-primary/20" />
          </div>
        )}
        {/* Quick status */}
        <div className="absolute top-2 left-2">
          <Select value={parcel.status} onValueChange={v => onStatusChange(v as ParcelStatus)} disabled={quickSaving}>
            <SelectTrigger className={`h-7 w-auto text-[11px] rounded-full border-0 shadow-sm font-bold px-2 ${sc.color} [&>svg]:h-3 [&>svg]:w-3 [&>svg]:ml-0.5`}>
              <div className="flex items-center gap-1">
                {quickSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : sc.icon}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_CONFIG) as ParcelStatus[]).map(k => (
                <SelectItem key={k} value={k} className="text-xs">{STATUS_CONFIG[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Payment badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${parcel.paymentStatus === 'Payé' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border'}`}>
            {parcel.paymentStatus}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <p className="font-mono font-bold text-gray-900 text-sm tracking-wide">{parcel.trackingNumber}</p>
          {parcel.clientName && <p className="text-xs text-gray-500 mt-0.5">Client: <strong className="text-gray-700">{parcel.clientName}</strong></p>}
          {parcel.recipientName && <p className="text-xs text-gray-500">Destinataire: <strong className="text-gray-700">{parcel.recipientName}</strong></p>}
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
          {parcel.currentLocation && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{parcel.currentLocation}</span>
          )}
          {parcel.weight && (
            <span className="flex items-center gap-1"><Weight className="h-3 w-3 text-gray-400" />{parcel.weight}</span>
          )}
          {parcel.estimatedArrival && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-gray-400" />{parcel.estimatedArrival}</span>
          )}
        </div>

        {(parcel.origin || parcel.destination) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {parcel.origin && <span className="bg-gray-50 border rounded-lg px-2 py-0.5">{parcel.origin}</span>}
            {parcel.origin && parcel.destination && <span className="text-gray-300">→</span>}
            {parcel.destination && <span className="bg-gray-50 border rounded-lg px-2 py-0.5">{parcel.destination}</span>}
          </div>
        )}

        {parcel.notes && (
          <p className="text-xs text-gray-400 italic line-clamp-2 flex items-start gap-1">
            <FileText className="h-3 w-3 shrink-0 mt-0.5" />{parcel.notes}
          </p>
        )}

        {parcel.priceToPay && (
          <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Tag className="h-3 w-3" />Prix: {parcel.priceToPay}
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-50">
          <Button variant="outline" size="sm" className="flex-1 rounded-xl h-8 text-xs" onClick={onEdit}>
            <Edit2 className="h-3 w-3 mr-1" />Modifier
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Colis ───────────────────────────────────────────────────────────
function ParcelsSection() {
  const { parcels, loading } = useParcels();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [parcelToDelete, setParcelToDelete] = useState<Parcel | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const emptyForm: Partial<Parcel> = {
    trackingNumber: '', clientName: '', recipientName: '', image: '',
    status: 'En route', currentLocation: '', origin: '', destination: '',
    estimatedArrival: '', paymentStatus: 'Non payé', priceToPay: '',
    weight: '', notes: '',
  };
  const [form, setForm] = useState<Partial<Parcel>>(emptyForm);

  const filtered = parcels.filter(p =>
    p.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.currentLocation?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.recipientName?.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditingParcel(null); setForm(emptyForm); setError(''); setDialogOpen(true); }
  function openEdit(p: Parcel) { setEditingParcel(p); setForm({ ...p }); setError(''); setDialogOpen(true); }

  async function handleSave() {
    if (!form.trackingNumber?.trim()) { setError('Le numéro de suivi est requis.'); return; }
    if (!form.currentLocation?.trim()) { setError('La localisation est requise.'); return; }
    setSaving(true); setError('');
    try { await saveParcel(form, editingParcel?.id); setDialogOpen(false); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleQuickStatus(parcel: Parcel, newStatus: ParcelStatus) {
    setQuickSaving(parcel.id || null);
    try { await saveParcel({ ...parcel, status: newStatus }, parcel.id); }
    catch {} finally { setQuickSaving(null); }
  }

  async function handleDelete() {
    if (!parcelToDelete?.id) return;
    setDeleting(true);
    try { await deleteParcel(parcelToDelete.id); setDeleteDialogOpen(false); setParcelToDelete(null); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9 rounded-xl border-gray-200" placeholder="Numéro, client, destinataire…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Nouveau colis
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{search ? 'Aucun résultat' : 'Aucun colis enregistré'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(parcel => (
            <ParcelCard key={parcel.id} parcel={parcel}
              quickSaving={quickSaving === parcel.id}
              onEdit={() => openEdit(parcel)}
              onDelete={() => { setParcelToDelete(parcel); setDeleteDialogOpen(true); }}
              onStatusChange={s => handleQuickStatus(parcel, s)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingParcel ? 'Modifier le colis' : 'Nouveau colis'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identifiants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>N° de suivi *</Label>
                  <Input className="rounded-xl font-mono" placeholder="Ex: NP2024001" value={form.trackingNumber || ''} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={form.status || 'En route'} onValueChange={v => setForm(f => ({ ...f, status: v as ParcelStatus }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as ParcelStatus[]).map(k => <SelectItem key={k} value={k}>{STATUS_CONFIG[k].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personnes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Client (expéditeur)</Label>
                  <Input className="rounded-xl" placeholder="Ex: Jean Dupont" value={form.clientName || ''} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Destinataire</Label>
                  <Input className="rounded-xl" placeholder="Ex: Marie Martin" value={form.recipientName || ''} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Localisation & Transport</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Localisation actuelle *</Label>
                  <Input className="rounded-xl" placeholder="Ex: Miami, FL" value={form.currentLocation || ''} onChange={e => setForm(f => ({ ...f, currentLocation: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Arrivée prévue</Label>
                  <Input className="rounded-xl" placeholder="Ex: 15/12/2024" value={form.estimatedArrival || ''} onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Origine</Label>
                  <Input className="rounded-xl" placeholder="Ex: New York, USA" value={form.origin || ''} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Input className="rounded-xl" placeholder="Ex: Port-au-Prince, HT" value={form.destination || ''} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colis & Paiement</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Poids</Label>
                  <Input className="rounded-xl" placeholder="Ex: 2.5 kg" value={form.weight || ''} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix à payer</Label>
                  <Input className="rounded-xl" placeholder="Ex: 2 500 HTG" value={form.priceToPay || ''} onChange={e => setForm(f => ({ ...f, priceToPay: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Statut paiement</Label>
                  <Select value={form.paymentStatus || 'Non payé'} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v as PaymentStatus }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non payé">Non payé</SelectItem>
                      <SelectItem value="Payé">Payé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Image du colis (URL)</Label>
                <Input className="rounded-xl" placeholder="https://…" value={form.image || ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes / Description</Label>
                <Textarea className="rounded-xl resize-none" rows={2} placeholder="Contenu, instructions spéciales…" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingParcel ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le colis</DialogTitle>
            <DialogDescription>Le colis <strong>{parcelToDelete?.trackingNumber}</strong> sera définitivement supprimé.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Formations ──────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<FormationLevel, { label: string; color: string }> = {
  debutant:      { label: 'Débutant',      color: 'bg-green-100 text-green-700' },
  intermediaire: { label: 'Intermédiaire', color: 'bg-blue-100 text-blue-700' },
  avance:        { label: 'Avancé',        color: 'bg-purple-100 text-purple-700' },
};

function FormationsSection() {
  const { formations, loading, refresh } = useAdminFormations();
  const [search, setSearch] = useState('');
  const [editorFormation, setEditorFormation] = useState<Partial<Formation> | null | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formationToDelete, setFormationToDelete] = useState<Formation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = formations.filter(f =>
    f.title?.toLowerCase().includes(search.toLowerCase()) ||
    f.shortDescription?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!formationToDelete?.id) return;
    setDeleting(true);
    try { await deleteAdminFormation(formationToDelete.id); setDeleteDialogOpen(false); setFormationToDelete(null); refresh(); }
    catch {} finally { setDeleting(false); }
  }

  // Show full-page editor
  if (editorFormation !== undefined) {
    return (
      <FormationEditor
        formation={editorFormation}
        onClose={() => setEditorFormation(undefined)}
        onSaved={() => { refresh(); setEditorFormation(undefined); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9 rounded-xl border-gray-200" placeholder="Rechercher une formation…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setEditorFormation(null)} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Nouvelle formation
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{search ? 'Aucun résultat' : 'Aucune formation'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(f => {
            const lc = LEVEL_CONFIG[f.level] || LEVEL_CONFIG.debutant;
            const discount = f.originalPrice && f.originalPrice > f.price ? Math.round((1 - f.price / f.originalPrice) * 100) : 0;
            return (
              <div key={f.id} className="bg-white rounded-2xl border hover:shadow-md transition-shadow overflow-hidden group">
                {f.coverImage && (
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    <img src={f.coverImage} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lc.color}`}>{lc.label}</span>
                    {!f.published && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">Brouillon</span>}
                    {discount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-600">-{discount}%</span>}
                    {f.comingSoon && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-600">Prochainement</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 truncate text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.shortDescription}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-sm">${f.price}</span>
                      {f.originalPrice && f.originalPrice > f.price && <span className="text-xs text-gray-400 line-through">${f.originalPrice}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{f.rating}</span>
                      <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{f.studentsCount}</span>
                      <span className="flex items-center gap-0.5"><BookOpen className="h-3 w-3" />{(f.modules || []).length} leçons</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-8" onClick={() => setEditorFormation(f)}>
                      <Edit2 className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                      onClick={() => { setFormationToDelete(f); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la formation</DialogTitle>
            <DialogDescription>La formation <strong>{formationToDelete?.title}</strong> sera définitivement supprimée.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Cartes (Card Topups) ────────────────────────────────────────────
function CardsSection() {
  const { cards, loading } = useCardTopups();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardTopup | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CardTopup | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const emptyForm: Partial<CardTopup> = { name: '', image: '', description: '', price: '', stock: undefined, whatsappMessage: '' };
  const [form, setForm] = useState<Partial<CardTopup>>(emptyForm);
  const [createFields, setCreateFields] = useState<RechargeField[]>([]);
  const [showCreateFieldEditor, setShowCreateFieldEditor] = useState(false);

  const filtered = cards.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditingCard(null); setForm(emptyForm); setCreateFields([]); setShowCreateFieldEditor(false); setError(''); setDialogOpen(true); }
  function openEdit(c: CardTopup) { setEditingCard(c); setForm({ ...c }); const cf = (c as any).createFields || []; setCreateFields(cf); setShowCreateFieldEditor(cf.length > 0); setError(''); setDialogOpen(true); }
  function addCreateField() { setCreateFields(f => [...f, { id: uid(), label: '', placeholder: '', required: false }]); }
  function removeCreateField(id: string) { setCreateFields(f => f.filter(x => x.id !== id)); }
  function updateCreateField(id: string, key: keyof RechargeField, value: any) { setCreateFields(f => f.map(x => x.id === id ? { ...x, [key]: value } : x)); }

  async function handleSave() {
    if (!form.name?.trim()) { setError('Le nom est requis.'); return; }
    if (!form.price?.trim()) { setError('Le prix est requis.'); return; }
    setSaving(true); setError('');
    try { await saveCardTopup({ ...form, createFields } as any, editingCard?.id); setDialogOpen(false); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!cardToDelete?.id) return;
    setDeleting(true);
    try { await deleteCardTopup(cardToDelete.id); setDeleteDialogOpen(false); setCardToDelete(null); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9 rounded-xl border-gray-200" placeholder="Rechercher une carte…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Nouvelle carte
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{search ? 'Aucun résultat' : 'Aucune carte enregistrée'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(card => (
            <div key={card.id} className="bg-white rounded-2xl border hover:shadow-md transition-shadow overflow-hidden group">
              {card.image && (
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img src={card.image} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{card.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.description}</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{card.price}</span>
                </div>
                {card.stock !== undefined && (
                  <p className="text-xs text-gray-400 mt-1.5">Stock : {card.stock}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-8" onClick={() => openEdit(card)}>
                    <Edit2 className="h-3 w-3 mr-1" />Modifier
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                    onClick={() => { setCardToDelete(card); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCard ? 'Modifier la carte' : 'Nouvelle carte'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input className="rounded-xl" placeholder="Ex: Visa Prépayée $25" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix *</Label>
                <Input className="rounded-xl" placeholder="Ex: 2 500 HTG" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input className="rounded-xl" type="number" placeholder="Illimité" value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value ? parseInt(e.target.value) : undefined }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image (URL)</Label>
              <Input className="rounded-xl" placeholder="https://…" value={form.image || ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea className="rounded-xl resize-none" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message WhatsApp</Label>
              <Textarea className="rounded-xl resize-none" rows={2} value={form.whatsappMessage || ''} onChange={e => setForm(f => ({ ...f, whatsappMessage: e.target.value }))} />
            </div>

            {/* ── Champs du formulaire de commande ── */}
            <div className="border rounded-xl overflow-hidden">
              <button type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
                onClick={() => setShowCreateFieldEditor(v => !v)}>
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-indigo-500" />
                  Formulaire de commande
                  {createFields.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">{createFields.length} champ{createFields.length > 1 ? 's' : ''}</span>}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showCreateFieldEditor ? 'rotate-180' : ''}`} />
              </button>
              {showCreateFieldEditor && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-400">Ces champs seront demandés au client lors d'une commande "Créer".</p>
                  {createFields.map((field, i) => (
                    <div key={field.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Champ {i + 1}</span>
                        <button type="button" onClick={() => removeCreateField(field.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Libellé *</Label>
                          <Input className="rounded-lg h-8 text-sm" placeholder="Ex: Numéro de compte" value={field.label} onChange={e => updateCreateField(field.id, 'label', e.target.value)} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input className="rounded-lg h-8 text-sm" placeholder="Ex: Entrez votre numéro…" value={field.placeholder} onChange={e => updateCreateField(field.id, 'placeholder', e.target.value)} />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={field.required || false} onChange={e => updateCreateField(field.id, 'required', e.target.checked)} />
                            Obligatoire
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full rounded-xl border-dashed gap-2" onClick={addCreateField}>
                    <Plus className="h-3.5 w-3.5" />Ajouter un champ
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingCard ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la carte</DialogTitle>
            <DialogDescription>La carte <strong>{cardToDelete?.name}</strong> sera définitivement supprimée.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Produits ────────────────────────────────────────────────────────
function ProductsSection() {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  type FormType = Partial<Product> & { customFields?: CustomField[]; whatsappMessage?: string };
  const emptyForm: FormType = { name: '', image: '', description: '', price: '', stock: undefined, whatsappMessage: '' };
  const [form, setForm] = useState<FormType>(emptyForm);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditingProduct(null); setForm(emptyForm); setCustomFields([]); setError(''); setShowFieldEditor(false); setDialogOpen(true); }
  function openEdit(p: Product) {
    setEditingProduct(p);
    const fields: CustomField[] = (p as any).customFields || [];
    setCustomFields(fields); setForm({ ...p }); setError(''); setShowFieldEditor(fields.length > 0); setDialogOpen(true);
  }
  function addField() { setCustomFields(f => [...f, { id: uid(), label: '', type: 'text', options: '', required: false }]); }
  function removeField(id: string) { setCustomFields(f => f.filter(x => x.id !== id)); }
  function updateField(id: string, key: keyof CustomField, value: any) { setCustomFields(f => f.map(x => x.id === id ? { ...x, [key]: value } : x)); }

  async function handleSave() {
    if (!form.name?.trim()) { setError('Le nom est requis.'); return; }
    if (!form.price?.trim()) { setError('Le prix est requis.'); return; }
    setSaving(true); setError('');
    try { await saveProduct({ ...form, customFields } as any, editingProduct?.id); setDialogOpen(false); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!productToDelete?.id) return;
    setDeleting(true);
    try { await deleteProduct(productToDelete.id); setDeleteDialogOpen(false); setProductToDelete(null); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9 rounded-xl border-gray-200" placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Nouveau produit
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{search ? 'Aucun résultat' : 'Aucun produit'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const fields: CustomField[] = (product as any).customFields || [];
            return (
              <div key={product.id} className="bg-white rounded-2xl border hover:shadow-md transition-shadow overflow-hidden group">
                {product.image && (
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">{product.price}</span>
                  </div>
                  {fields.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fields.map(f => (
                        <span key={f.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">{f.label}{f.required ? ' *' : ''}</span>
                      ))}
                    </div>
                  )}
                  {product.stock !== undefined && <p className="text-xs text-gray-400 mt-1">Stock : {product.stock}</p>}
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-8" onClick={() => openEdit(product)}>
                      <Edit2 className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                      onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Nom *</Label><Input className="rounded-xl" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Prix *</Label><Input className="rounded-xl" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Stock</Label><Input className="rounded-xl" type="number" value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value ? parseInt(e.target.value) : undefined }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Image (URL)</Label><Input className="rounded-xl" placeholder="https://…" value={form.image || ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea className="rounded-xl resize-none" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Message WhatsApp</Label><Textarea className="rounded-xl resize-none" rows={2} value={form.whatsappMessage || ''} onChange={e => setForm(f => ({ ...f, whatsappMessage: e.target.value }))} /></div>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
                onClick={() => setShowFieldEditor(v => !v)}>
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />Champs personnalisés
                  {customFields.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{customFields.length}</span>}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFieldEditor ? 'rotate-180' : ''}`} />
              </button>
              {showFieldEditor && (
                <div className="p-4 space-y-3 bg-white">
                  {customFields.map((field, i) => (
                    <div key={field.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Champ {i + 1}</span>
                        <button type="button" onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Libellé *</Label><Input className="rounded-lg h-8 text-sm" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={field.type} onValueChange={v => updateField(field.id, 'type', v)}>
                            <SelectTrigger className="rounded-lg h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texte</SelectItem>
                              <SelectItem value="number">Nombre</SelectItem>
                              <SelectItem value="select">Liste</SelectItem>
                              <SelectItem value="textarea">Zone texte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} />Obligatoire
                          </label>
                        </div>
                        {field.type === 'select' && (
                          <div className="col-span-2 space-y-1"><Label className="text-xs">Options (virgules)</Label><Input className="rounded-lg h-8 text-sm" value={field.options || ''} onChange={e => updateField(field.id, 'options', e.target.value)} /></div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full rounded-xl border-dashed gap-2" onClick={addField}><Plus className="h-3.5 w-3.5" />Ajouter un champ</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingProduct ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le produit</DialogTitle><DialogDescription>Le produit <strong>{productToDelete?.name}</strong> sera supprimé.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Méthodes de paiement ───────────────────────────────────────────
function MethodCard({ method, onEdit, onToggleEnabled, onToggleDeposit, onToggleWithdrawal }: {
  method: PaymentMethod; onEdit: () => void; onToggleEnabled: () => void; onToggleDeposit: () => void; onToggleWithdrawal: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4 flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-50 border flex items-center justify-center overflow-hidden">
        {method.logoUrl ? <img src={method.logoUrl} alt={method.name} className="h-9 w-9 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          : <span className="text-xl">{method.icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-gray-900 text-sm">{method.name}</p>
          <span className="text-gray-400">{getMethodTypeIcon(method.type)}</span>
        </div>
        {(method.number || method.address) ? <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">{method.number || method.address}</p>
          : <p className="text-xs text-amber-600 mt-0.5">⚠ Contact non configuré</p>}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          <button onClick={onToggleDeposit} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${method.forDeposit ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>Dépôt</button>
          <button onClick={onToggleWithdrawal} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${method.forWithdrawal ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>Retrait</button>
          {method.qrUrl && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><QrCode className="h-2.5 w-2.5" />QR</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="h-9 w-9 flex items-center justify-center rounded-xl text-blue-500 hover:bg-blue-50 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
        <button onClick={onToggleEnabled}>{method.enabled ? <ToggleRight className="h-7 w-7 text-primary" /> : <ToggleLeft className="h-7 w-7 text-gray-300" />}</button>
      </div>
    </div>
  );
}

function PaymentMethodsSection() {
  const { settings, loading: settingsLoading } = useSettings();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSuccess, setGlobalSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settingsLoading) return;
    const saved: PaymentMethod[] = settings?.paymentMethods || [];
    const merged = DEFAULT_PAYMENT_METHODS.map(def => { const s = saved.find(x => x.id === def.id); return s ? { ...def, ...s } : def; });
    const customs = saved.filter(s => !DEFAULT_PAYMENT_METHODS.find(d => d.id === s.id));
    setMethods([...merged, ...customs]);
  }, [settings, settingsLoading]);

  function openEdit(m: PaymentMethod) { setEditingMethod({ ...m }); setDialogOpen(true); }
  function toggleEnabled(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)); }
  function toggleForDeposit(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, forDeposit: !m.forDeposit } : m)); }
  function toggleForWithdrawal(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, forWithdrawal: !m.forWithdrawal } : m)); }
  function applyEdit() { if (!editingMethod) return; setMethods(ms => ms.map(m => m.id === editingMethod.id ? { ...editingMethod } : m)); setDialogOpen(false); }

  async function handleSaveAll() {
    setGlobalSaving(true); setGlobalSuccess(false); setError('');
    try { await updateSettings({ paymentMethods: methods }); setGlobalSuccess(true); setTimeout(() => setGlobalSuccess(false), 3000); }
    catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setGlobalSaving(false); }
  }

  if (settingsLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const enabledMethods = methods.filter(m => m.enabled);
  const disabledMethods = methods.filter(m => !m.enabled);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{enabledMethods.length} méthode{enabledMethods.length !== 1 ? 's' : ''} active{enabledMethods.length !== 1 ? 's' : ''}</p>
        <Button onClick={handleSaveAll} disabled={globalSaving} className={`rounded-xl gap-2 shadow-sm text-white ${globalSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:bg-primary/90'}`}>
          {globalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : globalSuccess ? <CheckCircle2 className="h-4 w-4" /> : null}
          {globalSuccess ? 'Sauvegardé !' : 'Enregistrer'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      {enabledMethods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Actives</h3>
          {enabledMethods.map(m => <MethodCard key={m.id} method={m} onEdit={() => openEdit(m)} onToggleEnabled={() => toggleEnabled(m.id)} onToggleDeposit={() => toggleForDeposit(m.id)} onToggleWithdrawal={() => toggleForWithdrawal(m.id)} />)}
        </div>
      )}
      {disabledMethods.length > 0 && (
        <div className="space-y-2 opacity-60">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Désactivées</h3>
          {disabledMethods.map(m => <div key={m.id} className="mb-2"><MethodCard method={m} onEdit={() => openEdit(m)} onToggleEnabled={() => toggleEnabled(m.id)} onToggleDeposit={() => toggleForDeposit(m.id)} onToggleWithdrawal={() => toggleForWithdrawal(m.id)} /></div>)}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          {editingMethod && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="text-xl">{editingMethod.icon}</span>Configurer {editingMethod.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div><p className="text-sm font-bold text-gray-800">Activée</p><p className="text-xs text-gray-500">Visible par les clients</p></div>
                  <button onClick={() => setEditingMethod(m => m ? { ...m, enabled: !m.enabled } : m)}>{editingMethod.enabled ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-gray-300" />}</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditingMethod(m => m ? { ...m, forDeposit: !m.forDeposit } : m)} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${editingMethod.forDeposit ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}>
                    {editingMethod.forDeposit ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}Dépôt
                  </button>
                  <button onClick={() => setEditingMethod(m => m ? { ...m, forWithdrawal: !m.forWithdrawal } : m)} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${editingMethod.forWithdrawal ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
                    {editingMethod.forWithdrawal ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}Retrait
                  </button>
                </div>
                <div className="space-y-1.5"><Label>Numéro / Contact</Label><Input className="rounded-xl font-mono" value={editingMethod.number || editingMethod.address || ''} onChange={e => { const val = e.target.value; setEditingMethod(m => m ? (m.type === 'crypto' ? { ...m, address: val, number: undefined } : { ...m, number: val, address: undefined }) : m); }} /></div>
                <div className="space-y-1.5"><Label>Nom du titulaire</Label><Input className="rounded-xl" value={editingMethod.accountName || ''} onChange={e => setEditingMethod(m => m ? { ...m, accountName: e.target.value } : m)} /></div>
                <div className="space-y-1.5"><Label className="flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />QR Code (URL)</Label><Input className="rounded-xl" placeholder="https://…" value={editingMethod.qrUrl || ''} onChange={e => setEditingMethod(m => m ? { ...m, qrUrl: e.target.value } : m)} /></div>
                <div className="space-y-1.5"><Label>URL du logo</Label><Input className="rounded-xl" placeholder="https://…" value={editingMethod.logoUrl || ''} onChange={e => setEditingMethod(m => m ? { ...m, logoUrl: e.target.value } : m)} /></div>
                <div className="space-y-1.5"><Label>Instructions</Label><Textarea className="rounded-xl resize-none" rows={2} value={editingMethod.instructions || ''} onChange={e => setEditingMethod(m => m ? { ...m, instructions: e.target.value } : m)} /></div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={applyEdit}>Appliquer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Annonces / Notifications système ────────────────────────────────
function NotificationsSection({ admin }: { admin: AdminAccount }) {
  const { notifications, loading, reload } = useSystemNotifications();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<SystemNotif | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', message: '', type: 'info' as SystemNotif['type'] });

  async function handleSend() {
    if (!form.message.trim()) { setError('Le message est requis.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/system-notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET }, body: JSON.stringify({ ...form, adminName: admin.fullName }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ title: '', message: '', type: 'info' }); setDialogOpen(false); reload();
    } catch (e: any) { setError(e.message || 'Erreur.'); }
    finally { setSaving(false); }
  }

  async function handleDeleteOne() {
    if (!notifToDelete?.id) return;
    setDeleting(true);
    try { await fetch(`/api/admin/system-notifications/${notifToDelete.id}`, { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } }); setDeleteDialogOpen(false); setNotifToDelete(null); reload(); }
    catch {} finally { setDeleting(false); }
  }

  async function handleClearAll() {
    setDeleting(true);
    try { await fetch('/api/admin/system-notifications/clear-all', { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } }); setClearDialogOpen(false); reload(); }
    catch {} finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {notifications.length > 0 && <Button variant="outline" size="sm" className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 gap-1" onClick={() => setClearDialogOpen(true)}><Trash2 className="h-3.5 w-3.5" />Tout effacer</Button>}
          <Button onClick={() => { setError(''); setDialogOpen(true); }} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"><Plus className="h-4 w-4" />Nouvelle</Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Bell className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-semibold">Aucune annonce</p></div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.info;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.color}`}>
                  <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    {n.title && <p className="font-bold text-sm">{n.title}</p>}
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs opacity-60 mt-1">{n.adminName} · {formatDate(n.createdAt)}</p>
                  </div>
                  <button className="shrink-0 opacity-40 hover:opacity-100 transition-opacity" onClick={() => { setNotifToDelete(n); setDeleteDialogOpen(true); }}><X className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Nouvelle annonce</DialogTitle><DialogDescription>Visible par tous les utilisateurs.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(NOTIF_CONFIG) as Array<keyof typeof NOTIF_CONFIG>).map(k => <SelectItem key={k} value={k}>{NOTIF_CONFIG[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Titre (optionnel)</Label><Input className="rounded-xl" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Message *</Label><Textarea className="rounded-xl resize-none" rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleSend} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Supprimer l'annonce</DialogTitle><DialogDescription>Cette annonce sera définitivement supprimée.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteOne} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Effacer tout</DialogTitle><DialogDescription>Toutes les annonces seront supprimées.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setClearDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleClearAll} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Tout effacer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section labels for header ────────────────────────────────────────────────
const SECTION_LABELS: Record<Section, string> = {
  requests: 'Demandes clients',
  parcels: 'Gestion des colis',
  products: 'Produits & Services',
  cards: 'Cartes & Recharges',
  formations: 'Formations',
  promotion: 'Gestion Promotion',
  'payment-methods': 'Méthodes de paiement',
  notifications: 'Annonces système',
  wallet: 'Paramètres',
};

// ─── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [section, setSection] = useState<Section>('requests');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { notifications: adminNotifs } = useAdminNotifications();

  const pendingCount = adminNotifs.filter(n =>
    ['client_deposit', 'client_withdrawal', 'card_order'].includes(n.type) &&
    !n.read && n.status !== 'approved' && n.status !== 'rejected'
  ).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar
          section={section}
          setSection={s => { setSection(s); setSidebarOpen(false); }}
          admin={admin}
          onLogout={onLogout}
          pendingCount={pendingCount}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile header) */}
        <header className="shrink-0 bg-white border-b border-gray-100 shadow-sm lg:shadow-none">
          <div className="px-4 h-14 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 truncate">{SECTION_LABELS[section]}</h1>
            </div>
            {pendingCount > 0 && section !== 'requests' && (
              <button onClick={() => setSection('requests')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors">
                <Bell className="h-3.5 w-3.5" />{pendingCount} demande{pendingCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {section === 'requests'        && <RequestsSection />}
          {section === 'parcels'         && <ParcelsSection />}
          {section === 'products'        && <ProductsSection />}
          {section === 'cards'           && <CardsSection />}
          {section === 'formations'      && <FormationsSection />}
          {section === 'payment-methods' && <PaymentMethodsSection />}
          {section === 'notifications'   && <NotificationsSection admin={admin} />}
          {section === 'wallet'          && <AdminWalletManager />}
          {section === 'promotion'       && <AdminPromotionSection />}
        </main>
      </div>

      {/* Agent Phénix IA flottant */}
      <PhenixAgent />
    </div>
  );
}
