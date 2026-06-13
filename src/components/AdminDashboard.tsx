import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Trash2, Search, Bell, Edit2,
  Loader2, CheckCircle2, Truck, Clock, AlertCircle,
  LogOut, X, LayoutGrid, ChevronDown, Info,
  AlertTriangle, Zap, Wallet, QrCode,
  ToggleLeft, ToggleRight, CreditCard, Smartphone,
  Building2, Globe, Bitcoin,
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
} from '../services/parcelService';
import {
  AdminAccount, Parcel, ParcelStatus, PaymentStatus, Product,
  PaymentMethod, DEFAULT_PAYMENT_METHODS,
} from '../types';

const ADMIN_SECRET = 'rena-admin-2024';

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
}

type Section = 'parcels' | 'products' | 'payment-methods' | 'notifications';

interface SystemNotif {
  id: string;
  title?: string | null;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  adminName: string;
  read: boolean;
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
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { notifications, loading, reload: load };
}

// ─── Section: Colis & Tracking ───────────────────────────────────────────────
function ParcelsSection({ admin }: { admin: AdminAccount }) {
  const { parcels, loading } = useParcels();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [parcelToDelete, setParcelToDelete] = useState<Parcel | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const emptyForm: Partial<Parcel> = {
    trackingNumber: '', status: 'En route', currentLocation: '',
    estimatedArrival: '', paymentStatus: 'Non payé',
  };
  const [form, setForm] = useState<Partial<Parcel>>(emptyForm);

  const filtered = parcels.filter(p =>
    p.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.currentLocation?.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditingParcel(null); setForm(emptyForm); setError(''); setDialogOpen(true); }
  function openEdit(p: Parcel) { setEditingParcel(p); setForm({ ...p }); setError(''); setDialogOpen(true); }

  async function handleSave() {
    if (!form.trackingNumber?.trim()) { setError('Le numéro de suivi est requis.'); return; }
    if (!form.currentLocation?.trim()) { setError('La localisation est requise.'); return; }
    setSaving(true); setError('');
    try { await saveParcel(form, editingParcel?.id); setDialogOpen(false); }
    catch (e: any) { setError(e.message || 'Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!parcelToDelete?.id) return;
    setDeleting(true);
    try { await deleteParcel(parcelToDelete.id); setDeleteDialogOpen(false); setParcelToDelete(null); }
    catch (e: any) { setError(e.message || 'Erreur suppression.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9 rounded-xl border-gray-200" placeholder="Rechercher par numéro ou lieu…" value={search} onChange={e => setSearch(e.target.value)} />
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
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">N° Suivi</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Localisation</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Arrivée</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Paiement</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(parcel => {
                  const sc = STATUS_CONFIG[parcel.status] || STATUS_CONFIG['En route'];
                  return (
                    <tr key={parcel.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">{parcel.trackingNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell max-w-[160px] truncate">{parcel.currentLocation}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{parcel.estimatedArrival || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${parcel.paymentStatus === 'Payé' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {parcel.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-blue-500 hover:bg-blue-50" onClick={() => openEdit(parcel)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                            onClick={() => { setParcelToDelete(parcel); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>{editingParcel ? 'Modifier le colis' : 'Nouveau colis'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <Label>Numéro de suivi *</Label>
              <Input className="rounded-xl" placeholder="Ex: NP2024001" value={form.trackingNumber || ''} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status || 'En route'} onValueChange={v => setForm(f => ({ ...f, status: v as ParcelStatus }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CONFIG) as ParcelStatus[]).map(k => (
                    <SelectItem key={k} value={k}>{STATUS_CONFIG[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Localisation actuelle *</Label>
              <Input className="rounded-xl" placeholder="Ex: Miami, FL" value={form.currentLocation || ''} onChange={e => setForm(f => ({ ...f, currentLocation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Arrivée prévue</Label>
              <Input className="rounded-xl" placeholder="Ex: 15/12/2024" value={form.estimatedArrival || ''} onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))} />
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

// ─── Section: Produits ────────────────────────────────────────────────────────
function ProductsSection({ admin }: { admin: AdminAccount }) {
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

  function openAdd() {
    setEditingProduct(null); setForm(emptyForm); setCustomFields([]);
    setError(''); setShowFieldEditor(false); setDialogOpen(true);
  }
  function openEdit(p: Product) {
    setEditingProduct(p);
    const fields: CustomField[] = (p as any).customFields || [];
    setCustomFields(fields);
    setForm({ ...p });
    setError(''); setShowFieldEditor(fields.length > 0); setDialogOpen(true);
  }
  function addField() { setCustomFields(f => [...f, { id: uid(), label: '', type: 'text', options: '', required: false }]); }
  function removeField(id: string) { setCustomFields(f => f.filter(x => x.id !== id)); }
  function updateField(id: string, key: keyof CustomField, value: any) {
    setCustomFields(f => f.map(x => x.id === id ? { ...x, [key]: value } : x));
  }

  async function handleSave() {
    if (!form.name?.trim()) { setError('Le nom du produit est requis.'); return; }
    if (!form.price?.trim()) { setError('Le prix est requis.'); return; }
    setSaving(true); setError('');
    try { await saveProduct({ ...form, customFields } as any, editingProduct?.id); setDialogOpen(false); }
    catch (e: any) { setError(e.message || 'Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!productToDelete?.id) return;
    setDeleting(true);
    try { await deleteProduct(productToDelete.id); setDeleteDialogOpen(false); setProductToDelete(null); }
    catch (e: any) { setError(e.message || 'Erreur suppression.'); }
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
          <p className="font-semibold">{search ? 'Aucun résultat' : 'Aucun produit enregistré'}</p>
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
                        <span key={f.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                          {f.label}{f.required ? ' *' : ''}
                        </span>
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
              <div className="col-span-2 space-y-1.5">
                <Label>Nom du produit *</Label>
                <Input className="rounded-xl" placeholder="Ex: Visa Prépayée" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prix *</Label>
                <Input className="rounded-xl" placeholder="Ex: 2 500 HTG" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input className="rounded-xl" type="number" placeholder="Optionnel" value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value ? parseInt(e.target.value) : undefined }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Image (URL)</Label>
                <Input className="rounded-xl" placeholder="https://…" value={form.image || ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea className="rounded-xl resize-none" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Message WhatsApp (pré-rempli)</Label>
                <Textarea className="rounded-xl resize-none" rows={2} value={form.whatsappMessage || ''} onChange={e => setForm(f => ({ ...f, whatsappMessage: e.target.value }))} />
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <button type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
                onClick={() => setShowFieldEditor(v => !v)}>
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  Champs personnalisés (infos client)
                  {customFields.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{customFields.length}</span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFieldEditor ? 'rotate-180' : ''}`} />
              </button>
              {showFieldEditor && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-500">Ces champs seront affichés au client lors de la commande (numéro de compte, montant, etc.).</p>
                  {customFields.map((field, i) => (
                    <div key={field.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Champ {i + 1}</span>
                        <button type="button" onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Libellé *</Label>
                          <Input className="rounded-lg h-8 text-sm" placeholder="Ex: Numéro de compte" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={field.type} onValueChange={v => updateField(field.id, 'type', v)}>
                            <SelectTrigger className="rounded-lg h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texte</SelectItem>
                              <SelectItem value="number">Nombre</SelectItem>
                              <SelectItem value="select">Liste déroulante</SelectItem>
                              <SelectItem value="textarea">Zone de texte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} />
                            Obligatoire
                          </label>
                        </div>
                        {field.type === 'select' && (
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Options (séparées par des virgules)</Label>
                            <Input className="rounded-lg h-8 text-sm" placeholder="Option A, Option B" value={field.options || ''} onChange={e => updateField(field.id, 'options', e.target.value)} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full rounded-xl border-dashed gap-2" onClick={addField}>
                    <Plus className="h-3.5 w-3.5" />Ajouter un champ
                  </Button>
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
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>Le produit <strong>{productToDelete?.name}</strong> sera définitivement supprimé.</DialogDescription>
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

// ─── Carte d'une méthode de paiement ─────────────────────────────────────────
function MethodCard({
  method, onEdit, onToggleEnabled, onToggleDeposit, onToggleWithdrawal,
}: {
  method: PaymentMethod;
  onEdit: () => void;
  onToggleEnabled: () => void;
  onToggleDeposit: () => void;
  onToggleWithdrawal: () => void;
}) {
  const contactVal = method.number || method.address || null;

  return (
    <div className="bg-white rounded-2xl border p-4 flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-50 border flex items-center justify-center overflow-hidden">
        {method.logoUrl ? (
          <img src={method.logoUrl} alt={method.name} className="h-9 w-9 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-xl">{method.icon}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-gray-900 text-sm">{method.name}</p>
          <span className="text-gray-400">{getMethodTypeIcon(method.type)}</span>
        </div>
        {contactVal ? (
          <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">{contactVal}</p>
        ) : (
          <p className="text-xs text-amber-600 mt-0.5">⚠ Numéro/contact non configuré</p>
        )}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          <button onClick={onToggleDeposit}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${method.forDeposit ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
            Dépôt
          </button>
          <button onClick={onToggleWithdrawal}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${method.forWithdrawal ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
            Retrait
          </button>
          {method.qrUrl && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <QrCode className="h-2.5 w-2.5" />QR
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="h-9 w-9 flex items-center justify-center rounded-xl text-blue-500 hover:bg-blue-50 transition-colors">
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onToggleEnabled}>
          {method.enabled
            ? <ToggleRight className="h-7 w-7 text-primary" />
            : <ToggleLeft className="h-7 w-7 text-gray-300" />}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Méthodes de paiement ───────────────────────────────────────────
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
    const merged = DEFAULT_PAYMENT_METHODS.map(def => {
      const s = saved.find(x => x.id === def.id);
      return s ? { ...def, ...s } : def;
    });
    const customs = saved.filter(s => !DEFAULT_PAYMENT_METHODS.find(d => d.id === s.id));
    setMethods([...merged, ...customs]);
  }, [settings, settingsLoading]);

  function openEdit(m: PaymentMethod) { setEditingMethod({ ...m }); setDialogOpen(true); }
  function toggleEnabled(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)); }
  function toggleForDeposit(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, forDeposit: !m.forDeposit } : m)); }
  function toggleForWithdrawal(id: string) { setMethods(ms => ms.map(m => m.id === id ? { ...m, forWithdrawal: !m.forWithdrawal } : m)); }

  function applyEdit() {
    if (!editingMethod) return;
    setMethods(ms => ms.map(m => m.id === editingMethod.id ? { ...editingMethod } : m));
    setDialogOpen(false);
  }

  async function handleSaveAll() {
    setGlobalSaving(true); setGlobalSuccess(false); setError('');
    try {
      await updateSettings({ paymentMethods: methods });
      setGlobalSuccess(true);
      setTimeout(() => setGlobalSuccess(false), 3000);
    } catch (e: any) { setError(e.message || 'Erreur lors de la sauvegarde.'); }
    finally { setGlobalSaving(false); }
  }

  function getContactLabel(m: PaymentMethod): string {
    if (m.type === 'crypto') return 'Adresse de portefeuille';
    if (m.type === 'payment_app') return 'Email / identifiant du compte';
    if (m.type === 'bank_transfer') return 'IBAN / numéro de compte';
    return 'Numéro de téléphone';
  }

  if (settingsLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const enabledMethods = methods.filter(m => m.enabled);
  const disabledMethods = methods.filter(m => !m.enabled);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{enabledMethods.length} méthode{enabledMethods.length !== 1 ? 's' : ''} active{enabledMethods.length !== 1 ? 's' : ''} · Cliquez sur les tags Dépôt/Retrait pour les basculer</p>
        <Button onClick={handleSaveAll} disabled={globalSaving}
          className={`rounded-xl gap-2 shadow-sm text-white ${globalSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:bg-primary/90'}`}>
          {globalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : globalSuccess ? <CheckCircle2 className="h-4 w-4" /> : null}
          {globalSuccess ? 'Sauvegardé !' : 'Enregistrer les modifications'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {enabledMethods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Méthodes actives</h3>
          {enabledMethods.map(m => (
            <MethodCard key={m.id} method={m}
              onEdit={() => openEdit(m)}
              onToggleEnabled={() => toggleEnabled(m.id)}
              onToggleDeposit={() => toggleForDeposit(m.id)}
              onToggleWithdrawal={() => toggleForWithdrawal(m.id)}
            />
          ))}
        </div>
      )}

      {disabledMethods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Méthodes désactivées</h3>
          <div className="opacity-60">
            {disabledMethods.map(m => (
              <div key={m.id} className="mb-2">
                <MethodCard method={m}
                  onEdit={() => openEdit(m)}
                  onToggleEnabled={() => toggleEnabled(m.id)}
                  onToggleDeposit={() => toggleForDeposit(m.id)}
                  onToggleWithdrawal={() => toggleForWithdrawal(m.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog édition méthode */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          {editingMethod && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{editingMethod.icon}</span>
                  Configurer {editingMethod.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Toggle actif */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Méthode activée</p>
                    <p className="text-xs text-gray-500">Visible par les clients dans le wallet</p>
                  </div>
                  <button onClick={() => setEditingMethod(m => m ? { ...m, enabled: !m.enabled } : m)}>
                    {editingMethod.enabled
                      ? <ToggleRight className="h-8 w-8 text-primary" />
                      : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                  </button>
                </div>

                {/* Pour dépôt / retrait */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditingMethod(m => m ? { ...m, forDeposit: !m.forDeposit } : m)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${editingMethod.forDeposit ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}>
                    {editingMethod.forDeposit ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                    Dépôt
                  </button>
                  <button onClick={() => setEditingMethod(m => m ? { ...m, forWithdrawal: !m.forWithdrawal } : m)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${editingMethod.forWithdrawal ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
                    {editingMethod.forWithdrawal ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                    Retrait
                  </button>
                </div>

                {/* Numéro / email / adresse — libellé adapté au type */}
                <div className="space-y-1.5">
                  <Label>{getContactLabel(editingMethod)}</Label>
                  <Input className="rounded-xl font-mono"
                    placeholder={
                      editingMethod.type === 'payment_app' ? 'ex: nom@email.com'
                      : editingMethod.type === 'crypto' ? 'ex: TXyz1234…'
                      : 'ex: +509 XXXX XXXX'
                    }
                    value={editingMethod.number || editingMethod.address || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingMethod(m => m
                        ? (m.type === 'crypto'
                          ? { ...m, address: val, number: undefined }
                          : { ...m, number: val, address: undefined })
                        : m);
                    }}
                  />
                </div>

                {/* Nom du titulaire */}
                <div className="space-y-1.5">
                  <Label>Nom du titulaire (affiché au client)</Label>
                  <Input className="rounded-xl" placeholder="Ex: Jean Dupont"
                    value={editingMethod.accountName || ''}
                    onChange={e => setEditingMethod(m => m ? { ...m, accountName: e.target.value } : m)} />
                </div>

                {/* QR Code */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />QR Code — URL de l'image (optionnel)
                  </Label>
                  <Input className="rounded-xl" placeholder="https://… (image .png ou .jpg)"
                    value={editingMethod.qrUrl || ''}
                    onChange={e => setEditingMethod(m => m ? { ...m, qrUrl: e.target.value } : m)} />
                  {editingMethod.qrUrl && (
                    <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                      <img src={editingMethod.qrUrl} alt="QR preview" className="h-16 w-16 object-contain rounded-lg border bg-white"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <p className="text-xs text-gray-500">Aperçu du QR code. Le client pourra le scanner pour envoyer le paiement.</p>
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-1.5">
                  <Label>URL du logo (optionnel)</Label>
                  <Input className="rounded-xl" placeholder="https://… (logo de la méthode)"
                    value={editingMethod.logoUrl || ''}
                    onChange={e => setEditingMethod(m => m ? { ...m, logoUrl: e.target.value } : m)} />
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <Label>Instructions pour le client</Label>
                  <Textarea className="rounded-xl resize-none" rows={2}
                    placeholder="Ex: Envoyez le montant au numéro ci-dessus, puis soumettez votre dépôt."
                    value={editingMethod.instructions || ''}
                    onChange={e => setEditingMethod(m => m ? { ...m, instructions: e.target.value } : m)} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={applyEdit}>
                  Appliquer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section: Notifications système ──────────────────────────────────────────
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
      const res = await fetch('/api/admin/system-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ ...form, adminName: admin.fullName }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ title: '', message: '', type: 'info' }); setDialogOpen(false); reload();
    } catch (e: any) { setError(e.message || 'Erreur envoi.'); }
    finally { setSaving(false); }
  }

  async function handleDeleteOne() {
    if (!notifToDelete?.id) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/system-notifications/${notifToDelete.id}`, { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } });
      setDeleteDialogOpen(false); setNotifToDelete(null); reload();
    } catch { } finally { setDeleting(false); }
  }

  async function handleClearAll() {
    setDeleting(true);
    try {
      await fetch('/api/admin/system-notifications/clear-all', { method: 'DELETE', headers: { 'x-admin-secret': ADMIN_SECRET } });
      setClearDialogOpen(false); reload();
    } catch { } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 gap-1" onClick={() => setClearDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />Tout effacer
            </Button>
          )}
          <Button onClick={() => { setError(''); setDialogOpen(true); }} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm">
            <Plus className="h-4 w-4" />Nouvelle notification
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Aucune notification système</p>
          <p className="text-sm mt-1">Créez des alertes visibles par tous les utilisateurs</p>
        </div>
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
                <button className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                  onClick={() => { setNotifToDelete(n); setDeleteDialogOpen(true); }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle notification système</DialogTitle>
            <DialogDescription>Sera visible par tous les utilisateurs de l'application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(NOTIF_CONFIG) as Array<keyof typeof NOTIF_CONFIG>).map(k => (
                    <SelectItem key={k} value={k}>{NOTIF_CONFIG[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre (optionnel)</Label>
              <Input className="rounded-xl" placeholder="Ex: Maintenance programmée" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea className="rounded-xl resize-none" rows={3} placeholder="Contenu de la notification…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white" onClick={handleSend} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la notification</DialogTitle>
            <DialogDescription>Cette notification sera supprimée définitivement.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDeleteOne} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Effacer toutes les notifications</DialogTitle>
            <DialogDescription>Toutes les notifications système seront supprimées définitivement.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setClearDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleClearAll} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Tout effacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [section, setSection] = useState<Section>('parcels');

  const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'parcels',         label: 'Colis & Tracking', icon: <Package className="h-4 w-4" /> },
    { id: 'products',        label: 'Produits',          icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'payment-methods', label: 'Paiements',         icon: <Wallet className="h-4 w-4" /> },
    { id: 'notifications',   label: 'Notifications',     icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">Administration</span>
              <span className="text-gray-400 text-xs ml-2 hidden sm:inline">— {admin.fullName}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl text-gray-500 gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  section === s.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {s.icon}{s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {section === 'parcels'         && <ParcelsSection admin={admin} />}
        {section === 'products'        && <ProductsSection admin={admin} />}
        {section === 'payment-methods' && <PaymentMethodsSection />}
        {section === 'notifications'   && <NotificationsSection admin={admin} />}
      </main>
    </div>
  );
}
