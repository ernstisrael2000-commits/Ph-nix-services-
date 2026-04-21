import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  MoreVertical, 
  CheckCircle2, 
  Truck, 
  Clock, 
  AlertCircle,
  Loader2,
  Upload,
  Trash,
  Settings as SettingsIcon,
  LayoutGrid,
  Image as ImageIcon,
  Edit,
  PlusCircle,
  Wallet,
  Users,
  Trophy,
  Gamepad2,
  Bell,
  Filter,
  ArrowUpDown,
  DollarSign,
  ArrowUp,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { useParcels, saveParcel, uploadProof, deleteParcel, useProducts, saveProduct, deleteProduct, useSettings, updateSettings, uploadLogo, useGames, saveGame, deleteGame, useCardTopups, saveCardTopup, deleteCardTopup, useSliderImages, saveSliderImage, deleteSliderImage, updateSliderImage, useNavButtons, saveNavButton, deleteNavButton } from '../services/parcelService';
import { useAllAffiliates, useAllWithdrawals, saveAffiliate, updateWithdrawalStatus, deleteAffiliate, useAllAffiliateRequests, updateAffiliateRequestStatus, resetMonthlyStats, awardMonthlyPrizes, clearMonthlyWinners, useMonthlyRankings, recordPurchase } from '../services/affiliateService';
import { useAdminAccounts, useAdminLogs, saveAdminAccount, deleteAdminAccount } from '../services/adminService';
import { Parcel, ParcelStatus, PaymentStatus, Product, AppSettings, Affiliate, WithdrawalRequest, AffiliateRequest, Game, CardTopup, NavButton, AdminAccount } from '../types';
import AdminShippingManager from './AdminShippingManager';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { LogOut, Shield, ShieldAlert as ShieldAlertIcon, History } from 'lucide-react';

// Helper for image compression
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/jpeg',
          0.7 // quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const LucideIcon = ({ name, className, color }: { name: string, className?: string, color?: string }) => {
  const Icon = (LucideIcons as any)[name] || HelpCircle;
  return <Icon className={className} style={{ color }} />;
};

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const { parcels, loading: parcelsLoading } = useParcels();
  const { products, loading: productsLoading } = useProducts();
  const { games, loading: gamesLoading } = useGames();
  const { cards, loading: cardsLoading } = useCardTopups();
  const { sliderImages, loading: sliderLoading } = useSliderImages();
  const { buttons, loading: buttonsLoading } = useNavButtons();
  const { settings, loading: settingsLoading } = useSettings();
  const { affiliates, loading: affiliatesLoading } = useAllAffiliates();
  const { withdrawals: allWithdrawals, loading: allWithdrawalsLoading } = useAllWithdrawals();
  const { requests: affiliateRequests, loading: affiliateRequestsLoading } = useAllAffiliateRequests();
  const { admins, loading: adminsLoading } = useAdminAccounts();
  const { logs, loading: logsLoading } = useAdminLogs(100);
  
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isAffiliateDialogOpen, setIsAffiliateDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [isAdminDeleteDialogOpen, setIsAdminDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);
  const [adminFormData, setAdminFormData] = useState<Partial<AdminAccount>>({
    fullName: '',
    password: '',
    photoUrl: '',
    loginCode: '',
    isSuperAdmin: false,
    permissions: []
  });

  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [parcelToDelete, setParcelToDelete] = useState<Parcel | null>(null);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);

  const [isNavButtonDialogOpen, setIsNavButtonDialogOpen] = useState(false);
  const [editingNavButton, setEditingNavButton] = useState<NavButton | null>(null);
  const [isNavButtonDeleteDialogOpen, setIsNavButtonDeleteDialogOpen] = useState(false);
  const [navButtonToDelete, setNavButtonToDelete] = useState<NavButton | null>(null);
  const [navButtonFormData, setNavButtonFormData] = useState<Partial<NavButton>>({
    label: '',
    iconName: 'Package',
    targetUrl: '',
    redirectionInstruction: '',
    color: '#F5A623',
    order: 0
  });
  
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductDeleteDialogOpen, setIsProductDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isGameDeleteDialogOpen, setIsGameDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [gameFormData, setGameFormData] = useState<Partial<Game>>({
    name: '',
    image: '',
    description: '',
    priceRange: '',
    whatsappMessage: '',
    catalog: []
  });

  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardTopup | null>(null);
  const [isCardDeleteDialogOpen, setIsCardDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CardTopup | null>(null);
  const [cardFormData, setCardFormData] = useState<Partial<CardTopup>>({
    name: '',
    image: '',
    description: '',
    price: '',
    whatsappMessage: ''
  });
  const [tempCardImageUrl, setTempCardImageUrl] = useState('');

  const [isAwarding, setIsAwarding] = useState(false);
  const [isClearingWinners, setIsClearingWinners] = useState(false);

  // Helper to ensure the admin creation dialog is always usable
  const handleOpenAdminDialog = (adminAccount?: AdminAccount) => {
    if (adminAccount) {
      setEditingAdmin(adminAccount);
      setAdminFormData({ ...adminAccount });
    } else {
      setEditingAdmin(null);
      setAdminFormData({
        fullName: '',
        password: '',
        photoUrl: '',
        loginCode: '',
        isSuperAdmin: false,
        permissions: []
      });
    }
    setIsAdminDialogOpen(true);
  };

  const handleSaveAdminAccount = async () => {
    if (!adminFormData.fullName || !adminFormData.password) {
      toast.error("Le nom et le mot de passe sont requis.");
      return;
    }
    setIsSaving(true);
    try {
      await saveAdminAccount(adminFormData, editingAdmin?.id);
      toast.success(editingAdmin ? "Compte administrateur mis à jour !" : "Compte administrateur créé !");
      setIsAdminDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete?.id) return;
    if (adminToDelete.isSuperAdmin) {
      toast.error("Impossible de supprimer le super administrateur.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAdminAccount(adminToDelete.id);
      toast.success("Compte administrateur supprimé.");
      setIsAdminDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setAdminToDelete(null);
    }
  };

  const hasPermission = (permission: string) => {
    if (admin.isSuperAdmin || admin.permissions.includes('all')) return true;
    return admin.permissions.includes(permission);
  };

  const menuItems = [
    { value: 'parcels', label: 'Colis', icon: Package, permission: 'parcels' },
    { value: 'products', label: 'Produits / Services', icon: LayoutGrid, permission: 'products' },
    { value: 'games', label: 'Top-up Jeux', icon: Gamepad2, permission: 'games' },
    { value: 'cards', label: 'Recharge Cartes', icon: CreditCard, permission: 'cards' },
    { value: 'slider', label: 'Slider', icon: ImageIcon, permission: 'slider' },
    { value: 'affiliates', label: 'Affiliés', icon: Users, permission: 'affiliates' },
    { value: 'notifications', label: 'Notifications', icon: Bell, permission: 'notifications' },
    { value: 'shipping', label: 'Shipping', icon: Truck, permission: 'shipping' },
    { value: 'nav-buttons', label: 'Boutons Nav', icon: LayoutGrid, permission: 'nav-buttons' },
    { value: 'settings', label: 'Paramètres', icon: SettingsIcon, permission: 'settings' },
    { value: 'admins', label: 'Gérer Admins', icon: Shield, permission: 'super_admin_only' },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.permission === 'super_admin_only') return admin.isSuperAdmin;
    return hasPermission(item.permission);
  });

  const [activeTab, setActiveTab] = useState(visibleMenuItems[0]?.value || 'parcels');
  const [isAffiliateDeleteConfirmOpen, setIsAffiliateDeleteConfirmOpen] = useState(false);
  const [affiliateToDelete, setAffiliateToDelete] = useState<Affiliate | null>(null);

  const [isRecordSaleDialogOpen, setIsRecordSaleDialogOpen] = useState(false);
  const [selectedAffiliateForSale, setSelectedAffiliateForSale] = useState<Affiliate | null>(null);
  const [saleType, setSaleType] = useState<'purchase' | 'subscription' | 'virtual_card'>('purchase');
  const [isRecordingSale, setIsRecordingSale] = useState(false);

  const handleRecordSale = async () => {
    if (!selectedAffiliateForSale?.id) return;
    setIsRecordingSale(true);
    try {
      await recordPurchase(selectedAffiliateForSale.id, saleType);
      toast.success("Vente enregistrée avec succès !");
      setIsRecordSaleDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la vente.");
    } finally {
      setIsRecordingSale(false);
    }
  };
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [affiliateFormData, setAffiliateFormData] = useState<Partial<Affiliate>>({
    name: '',
    username: '',
    password: '',
    code: '',
    balance: 0,
    referredClients: 0,
    points: 0,
    level: 'Bronze',
    directRevenue: 0,
    indirectRevenue: 0,
    totalEarnings: 0,
    parentAffiliateId: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const [tempProductImageUrl, setTempProductImageUrl] = useState('');
  const [tempProofUrl, setTempProofUrl] = useState('');

  // Form States
  const [formData, setFormData] = useState<Partial<Parcel>>({
    trackingNumber: '',
    status: 'En route',
    currentLocation: '',
    estimatedArrival: '',
    paymentStatus: 'Non payé',
    proofOfDelivery: ''
  });

  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '',
    image: '',
    description: '',
    price: '',
    whatsappMessage: ''
  });

  const [tempGameImageUrl, setTempGameImageUrl] = useState('');

  const [notifFilter, setNotifFilter] = useState<'all' | 'registration' | 'withdrawal'>('all');
  const [notifSearch, setNotifSearch] = useState('');
  const [affiliateSearch, setAffiliateSearch] = useState('');

  const [isSliderImageDeleteDialogOpen, setIsSliderImageDeleteDialogOpen] = useState(false);
  const [sliderImageToDelete, setSliderImageToDelete] = useState<{id: string, url: string} | null>(null);
  const [isSliderImageEditDialogOpen, setIsSliderImageEditDialogOpen] = useState(false);
  const [editingSliderImage, setEditingSliderImage] = useState<{ id: string, url: string, title?: string, description?: string } | null>(null);
  const [isSliderUploading, setIsSliderUploading] = useState(false);
  const [tempSliderImageUrl, setTempSliderImageUrl] = useState('');
  const [sliderTitle, setSliderTitle] = useState('');
  const [sliderDescription, setSliderDescription] = useState('');

  const { rankings: officialRankings, loading: officialRankingsLoading } = useMonthlyRankings();

  const pendingRegistrations = React.useMemo(() => 
    affiliateRequests.filter(r => r.status === 'pending'), 
    [affiliateRequests]
  );
  
  const pendingWithdrawals = React.useMemo(() => 
    allWithdrawals.filter(w => w.status === 'pending'), 
    [allWithdrawals]
  );
  
  const totalPending = pendingRegistrations.length + pendingWithdrawals.length;

  const totalAffiliateBalance = React.useMemo(() => {
    return affiliates.reduce((sum, affiliate) => sum + (affiliate.balance || 0), 0);
  }, [affiliates]);

  const allPendingRequests = React.useMemo(() => {
    const registrations = pendingRegistrations.map(r => ({ ...r, type: 'registration' as const }));
    const withdrawals = pendingWithdrawals.map(w => ({ ...w, type: 'withdrawal' as const, name: w.affiliateName }));

    let combined = [...registrations, ...withdrawals];

    if (notifFilter === 'registration') {
      combined = combined.filter(r => r.type === 'registration');
    } else if (notifFilter === 'withdrawal') {
      combined = combined.filter(r => r.type === 'withdrawal');
    }

    if (notifSearch) {
      combined = combined.filter(r => 
        r.name.toLowerCase().includes(notifSearch.toLowerCase()) ||
        (r.type === 'withdrawal' && (r as any).affiliateCode?.toLowerCase().includes(notifSearch.toLowerCase()))
      );
    }

    return combined.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [pendingRegistrations, pendingWithdrawals, notifFilter, notifSearch]);

  // Memoize filtered and sorted lists for performance
  const winnersQueue = React.useMemo(() => {
    return [...affiliates]
      .filter(a => (a.points || 0) > 0)
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);
  }, [affiliates]);

  const filteredParcels = React.useMemo(() => {
    return parcels.filter(p => 
      p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.currentLocation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parcels, searchTerm]);

  const filteredAffiliates = React.useMemo(() => {
    if (!affiliateSearch.trim()) return affiliates;
    const searchTerms = affiliateSearch.toLowerCase().trim().split(/\s+/);
    return affiliates.filter(a => {
      const fullName = (a.name || '').toLowerCase();
      const code = (a.code || '').toLowerCase();
      const username = (a.username || '').toLowerCase();
      const combined = `${fullName} ${code} ${username}`;
      return searchTerms.every(term => combined.includes(term));
    });
  }, [affiliates, affiliateSearch]);

  const handleOpenDialog = (parcel?: Parcel) => {
    if (parcel) {
      setEditingParcel(parcel);
      setFormData(parcel);
    } else {
      setEditingParcel(null);
      setFormData({
        trackingNumber: `NP${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'En route',
        currentLocation: '',
        estimatedArrival: '',
        paymentStatus: 'Non payé',
        proofOfDelivery: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData(product);
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: '',
        image: '',
        description: '',
        price: '',
        whatsappMessage: ''
      });
    }
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      await saveProduct(productFormData, editingProduct?.id);
      toast.success(editingProduct ? "Produit mis à jour !" : "Produit ajouté !");
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCardDialog = (card?: CardTopup) => {
    if (card) {
      setEditingCard(card);
      setCardFormData({ ...card });
    } else {
      setEditingCard(null);
      setCardFormData({
        name: '',
        image: '',
        description: '',
        price: '',
        whatsappMessage: ''
      });
    }
    setTempCardImageUrl('');
    setIsCardDialogOpen(true);
  };

  const handleSaveCard = async () => {
    if (!cardFormData.name || !cardFormData.price) {
      toast.error("Le nom et le prix sont requis.");
      return;
    }
    setIsSaving(true);
    try {
      await saveCardTopup(cardFormData, editingCard?.id);
      toast.success(editingCard ? "Carte mise à jour." : "Carte ajoutée.");
      setIsCardDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteCard = async () => {
    if (!cardToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteCardTopup(cardToDelete.id);
      toast.success("Carte supprimée.");
      setIsCardDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setCardToDelete(null);
    }
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const url = await uploadLogo(compressedFile, (p) => setUploadProgress(p));
      setCardFormData(prev => ({ ...prev, image: url }));
      toast.success("Image carte téléchargée !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement de l'image.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleOpenGameDialog = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setGameFormData({
        name: game.name || '',
        image: game.image || '',
        description: game.description || '',
        priceRange: game.priceRange || '',
        whatsappMessage: game.whatsappMessage || '',
        catalog: (game.catalog || []).map(item => ({
          ...item,
          id: item.id || generateId()
        }))
      });
    } else {
      setEditingGame(null);
      setGameFormData({
        name: '',
        image: '',
        description: '',
        priceRange: '',
        whatsappMessage: '',
        catalog: []
      });
    }
    setIsGameDialogOpen(true);
  };

  const handleSaveGame = async () => {
    if (!gameFormData.name || !gameFormData.image || !gameFormData.priceRange) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }
    setIsSaving(true);
    try {
      await saveGame(gameFormData, editingGame?.id);
      toast.success(editingGame ? "Jeu mis à jour !" : "Jeu ajouté !");
      setIsGameDialogOpen(false);
    } catch (error: any) {
      console.error('Save game error:', error);
      const isPermission = error.message?.includes('permissions');
      toast.error(isPermission ? "Erreur de permissions (Droits admin requis)" : `Erreur lors de l'enregistrement: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCatalogItem = (id: string, updates: any) => {
    setGameFormData({
      ...gameFormData,
      catalog: (gameFormData.catalog || []).map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const addCatalogItem = () => {
    setGameFormData({
      ...gameFormData,
      catalog: [...(gameFormData.catalog || []), { id: generateId(), name: '', price: '', whatsappMessage: '' }]
    });
  };

  const removeCatalogItem = (id: string) => {
    if (!id) return;
    setGameFormData(prev => ({
      ...prev,
      catalog: (prev.catalog || []).filter(item => item.id !== id)
    }));
    toast.info("Pack retiré. N'oubliez pas d'enregistrer.");
  };

  const handleConfirmDeleteGame = async () => {
    if (!gameToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteGame(gameToDelete.id);
      toast.success("Jeu supprimé.");
      setIsGameDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setGameToDelete(null);
    }
  };

  const handleGameImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const compressed = await compressImage(file);
      const url = await uploadProof(compressed, `game_${Date.now()}`, (p) => setUploadProgress(p));
      setGameFormData({ ...gameFormData, image: url });
      toast.success("Image du jeu téléchargée !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAwardPrizes = async () => {
    setIsAwarding(true);
    try {
      const winners = await awardMonthlyPrizes();
      if (winners.length > 0) {
        let message = "Prix décernés avec succès ! ";
        winners.forEach((w, i) => {
          const prize = i === 0 ? 500 : i === 1 ? 250 : 150;
          message += `${i+1}er: ${w.name} (+${prize} G) | `;
        });
        toast.success(message, { duration: 6000 });
      } else {
        toast.info("Aucun affilié éligible pour les prix ce mois-ci.");
      }
    } catch (error) {
      toast.error("Erreur lors de la distribution des prix.");
    } finally {
      setIsAwarding(false);
    }
  };

  const handleClearWinners = async () => {
    setIsClearingWinners(true);
    try {
      await clearMonthlyWinners();
      toast.success("Classement vidé !");
    } catch (error) {
      toast.error("Erreur lors de la réinitialisation.");
    } finally {
      setIsClearingWinners(false);
    }
  };

  const handleToggleWinnerStatus = async (affiliate: Affiliate) => {
    try {
      await saveAffiliate({ isMonthlyWinner: !affiliate.isMonthlyWinner }, affiliate.id);
      toast.success(affiliate.isMonthlyWinner ? "Retiré du classement" : "Ajouté au classement");
    } catch (error) {
      toast.error("Erreur lors de la modification.");
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success("Produit supprimé.");
      setIsProductDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadLogo(file, (p) => setUploadProgress(p));
      await updateSettings({ logoUrl: url });
      toast.success("Logo mis à jour !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement du logo.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSliderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSliderUploading(true);
    setUploadProgress(0);
    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const url = await uploadLogo(compressedFile, (p) => setUploadProgress(p));
      await saveSliderImage(url, sliderTitle, sliderDescription);
      setSliderTitle('');
      setSliderDescription('');
      toast.success("Image slider ajoutée !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement de l'image.");
    } finally {
      setIsSliderUploading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirmDeleteSliderImage = async () => {
    if (!sliderImageToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteSliderImage(sliderImageToDelete.id);
      toast.success("Image supprimée.");
      setIsSliderImageDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setSliderImageToDelete(null);
    }
  };

  const handleSaveSliderUrl = async () => {
    if (!tempSliderImageUrl.trim()) {
      toast.error("Veuillez entrer une URL valide.");
      return;
    }
    setIsSaving(true);
    try {
      await saveSliderImage(tempSliderImageUrl.trim(), sliderTitle, sliderDescription);
      setTempSliderImageUrl('');
      setSliderTitle('');
      setSliderDescription('');
      toast.success("Image ajoutée via lien !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout de l'image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSliderImage = async () => {
    if (!editingSliderImage?.id) return;
    setIsSaving(true);
    try {
      await updateSliderImage(editingSliderImage.id, {
        url: editingSliderImage.url,
        title: editingSliderImage.title,
        description: editingSliderImage.description
      });
      toast.success("Image slider mise à jour !");
      setIsSliderImageEditDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
      setEditingSliderImage(null);
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const url = await uploadLogo(compressedFile, (p) => setUploadProgress(p)); // Reuse uploadLogo for generic images
      setProductFormData(prev => ({ ...prev, image: url }));
      toast.success("Image produit téléchargée !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement de l'image.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleOpenDeleteDialog = (parcel: Parcel) => {
    setParcelToDelete(parcel);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!parcelToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteParcel(parcelToDelete.id);
      toast.success("Colis supprimé avec succès.");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setParcelToDelete(null);
    }
  };

  const handleSaveAffiliate = async () => {
    if (!affiliateFormData.name || !affiliateFormData.username || !affiliateFormData.password || !affiliateFormData.code) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setIsSaving(true);
    try {
      await saveAffiliate(affiliateFormData, editingAffiliate?.id);
      toast.success(editingAffiliate ? "Affilié mis à jour !" : "Affilié ajouté !");
      setIsAffiliateDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAffiliateDeleteDialog = (affiliate: Affiliate) => {
    setAffiliateToDelete(affiliate);
    setIsAffiliateDeleteConfirmOpen(true);
  };

  const handleConfirmAffiliateDelete = async () => {
    if (!affiliateToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteAffiliate(affiliateToDelete.id);
      toast.success("Affilié supprimé avec succès.");
      setIsAffiliateDeleteConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setAffiliateToDelete(null);
    }
  };

  const handleOpenNavButtonDialog = (button?: NavButton) => {
    if (button) {
      setEditingNavButton(button);
      setNavButtonFormData(button);
    } else {
      setEditingNavButton(null);
      setNavButtonFormData({
        label: '',
        iconName: 'Package',
        targetUrl: '',
        redirectionInstruction: '',
        color: '#F5A623',
        order: (buttons.length || 0) + 1
      });
    }
    setIsNavButtonDialogOpen(true);
  };

  const handleSaveNavButton = async () => {
    if (!navButtonFormData.label || !navButtonFormData.targetUrl) {
      toast.error("Le libellé et l'URL sont requis.");
      return;
    }
    setIsSaving(true);
    try {
      await saveNavButton(navButtonFormData, editingNavButton?.id);
      toast.success(editingNavButton ? "Bouton mis à jour !" : "Bouton ajouté !");
      setIsNavButtonDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteNavButton = async () => {
    if (!navButtonToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteNavButton(navButtonToDelete.id);
      toast.success("Bouton supprimé.");
      setIsNavButtonDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
      setNavButtonToDelete(null);
    }
  };

  const handleWithdrawalAction = async (request: WithdrawalRequest, status: 'approved' | 'rejected') => {
    let reason = '';
    if (status === 'rejected') {
      reason = window.prompt("Raison du rejet :") || '';
      if (!reason) return;
    }

    try {
      await updateWithdrawalStatus(request.id!, status, reason);
      toast.success(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'} !`);
      
      if (status === 'approved') {
        const message = `Bonjour ${request.affiliateName},\n\nVotre demande de retrait de ${request.amount} Goud a été validée avec succès. Vous recevrez le paiement sur votre compte ${request.method} dans les plus brefs délais.\n\nMerci pour votre patience et votre engagement avec Neopay Affilié.\n\nCordialement,\nL'équipe Neopay`;
        
        toast.success("Demande approuvée ! Message de confirmation prêt.");
        console.log("Message pour l'affilié:", message);
      }
      
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour du statut.");
    }
  };

  const handleAffiliateRequestAction = async (request: AffiliateRequest, status: 'approved' | 'rejected') => {
    try {
      await updateAffiliateRequestStatus(request.id!, status);
      toast.success(`Demande d'inscription ${status === 'approved' ? 'approuvée' : 'rejetée'} !`);
      
      if (status === 'approved') {
        // Open the affiliate dialog with pre-filled data
        setEditingAffiliate(null);
        setAffiliateFormData({
          name: request.name,
          username: request.email.split('@')[0],
          password: Math.random().toString(36).slice(-8),
          code: `AFF${Math.floor(1000 + Math.random() * 9000)}`,
          balance: 0,
          referredClients: 0,
          level: 'Bronze',
          directRevenue: 0,
          indirectRevenue: 0,
          totalEarnings: 0,
          points: 0
        });
        setIsAffiliateDialogOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour de la demande.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveParcel(formData, editingParcel?.id);
      toast.success(editingParcel ? "Colis mis à jour !" : "Colis ajouté avec succès !");
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      
      const url = await uploadProof(compressedFile, formData.trackingNumber!, (p) => setUploadProgress(p));
      setFormData(prev => ({ ...prev, proofOfDelivery: url }));
      toast.success("Image téléchargée et optimisée !");
    } catch (error) {
      console.error(error);
      toast.error("Échec du téléchargement de l'image.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Livré': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'Arrivé': return <Package className="h-4 w-4 text-primary" />;
      case 'En transit': return <Truck className="h-4 w-4 text-primary" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-dark tracking-tight flex items-center gap-3">
            <span className="bg-primary text-white p-2 rounded-2xl rotate-3 shadow-lg shadow-accent-light/50">
              <Shield className="h-6 w-6" />
            </span>
            Administration
          </h1>
          <p className="text-subtext text-sm mt-1 font-medium">
            Connecté : <span className="text-primary font-bold">{admin.fullName}</span> {admin.isSuperAdmin && <span className="bg-accent-light text-primary text-[10px] uppercase px-2 py-0.5 rounded-full ml-2 font-bold tracking-wider">Super Admin</span>}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {admin.isSuperAdmin && (
            <Button 
              variant="outline" 
              onClick={() => setIsLogsDialogOpen(true)}
              className="flex-1 sm:flex-none h-11 rounded-2xl border-gray-100 bg-gray-50/50 hover:bg-white hover:border-accent-light hover:text-primary font-bold"
            >
              <History className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logs</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={onLogout}
            className="flex-1 sm:flex-none h-11 rounded-2xl text-red-500 hover:bg-red-50 font-bold"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-white border p-1 rounded-xl h-auto flex flex-nowrap sm:flex-wrap gap-1 sm:gap-2 min-w-max sm:min-w-0">
            {visibleMenuItems.map((item) => (
              <TabsTrigger 
                key={item.value}
                value={item.value} 
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap transition-all"
              >
                <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="parcels" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Gestion des Colis</h2>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 border-0">
              <Plus className="h-4 w-4" />
              Nouveau Colis
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-accent-light/30 border-accent-light">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">Total Colis</p>
                    <p className="text-3xl font-bold text-dark">{parcels.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent-light/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">En Transit</p>
                    <p className="text-3xl font-bold text-dark">
                      {parcels.filter(p => p.status === 'En transit' || p.status === 'En route').length}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent-light/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">Livrés</p>
                    <p className="text-3xl font-bold text-dark">
                      {parcels.filter(p => p.status === 'Livré').length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <CardTitle className="text-lg font-semibold">Liste des expéditions</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm w-full"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {parcelsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Chargement des données...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="w-[180px]">N° de Suivi</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Localisation</TableHead>
                        <TableHead>Paiement</TableHead>
                        <TableHead>Dernière MÀJ</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParcels.map((parcel) => (
                        <TableRow key={parcel.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-mono font-medium text-primary">
                            {parcel.trackingNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-dark">
                              {getStatusIcon(parcel.status)}
                              <span className="text-sm font-medium">{parcel.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {parcel.currentLocation}
                          </TableCell>
                          <TableCell>
                            <Badge variant={parcel.paymentStatus === 'Payé' ? 'default' : 'destructive'} className="text-[10px] uppercase tracking-wider">
                              {parcel.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-400">
                            {parcel.updatedAt ? format(parcel.updatedAt.toDate(), 'dd/MM/yy HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(parcel)}>
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(parcel)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredParcels.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                            Aucun colis trouvé.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Gestion des Produits / Services</h2>
            <Button onClick={() => handleOpenProductDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 border-0">
              <Plus className="h-4 w-4" />
              Nouveau Produit
            </Button>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Chargement des produits...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Image</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <img 
                              src={product.image} 
                              className="h-10 w-10 object-cover rounded-lg border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/neopay/100/100';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-accent-light bg-accent-light/50">
                              {product.price}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            {product.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenProductDialog(product)} className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setProductToDelete(product);
                                setIsProductDeleteDialogOpen(true);
                              }} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 bg-white/50 border border-transparent hover:border-red-100 px-2 font-medium text-xs">
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                <span className="hidden sm:inline">Supprimer</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {products.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                            Aucun produit ajouté.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Gestion des Jeux (Top-up)</h2>
            <Button onClick={() => handleOpenGameDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 border-0">
              <Plus className="h-4 w-4" />
              Nouveau Jeu
            </Button>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {gamesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Chargement des jeux...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Image</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix (Range)</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {games.map((game) => (
                        <TableRow key={game.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <img 
                              src={game.image} 
                              className="h-10 w-10 object-cover rounded-lg border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/game/100/100';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{game.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-primary/20 bg-accent-light/50">
                              {game.priceRange}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            {game.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenGameDialog(game)} className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setGameToDelete(game);
                                setIsGameDeleteDialogOpen(true);
                              }} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 bg-white/50 border border-transparent hover:border-red-100 px-2 font-medium text-xs">
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                <span className="hidden sm:inline">Supprimer</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {games.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                            Aucun jeu ajouté.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Gestion des Cartes (Recharge)</h2>
            <Button onClick={() => handleOpenCardDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 border-0">
              <Plus className="h-4 w-4" />
              Nouvelle Carte
            </Button>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {cardsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Chargement des cartes...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Image</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((card) => (
                        <TableRow key={card.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <img 
                              src={card.image} 
                              className="h-10 w-10 object-cover rounded-lg border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/card/100/100';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{card.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-accent-light bg-accent-light/50">
                              {card.price}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            {card.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenCardDialog(card)} className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setCardToDelete(card);
                                setIsCardDeleteDialogOpen(true);
                              }} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 bg-white/50 border border-transparent hover:border-red-100 px-2 font-medium text-xs">
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                <span className="hidden sm:inline">Supprimer</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cards.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                            Aucune carte enregistrée.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slider" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Images du Slider Hero</CardTitle>
                <CardDescription>Gérez les images qui défilent sur la page d'accueil (titre et description personnalisés par image).</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titre du slide</Label>
                    <Input 
                      placeholder="Ex: Neopay Services" 
                      value={sliderTitle}
                      onChange={(e) => setSliderTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description du slide</Label>
                    <Input 
                      placeholder="Ex: Accès rapide et sécurisé..." 
                      value={sliderDescription}
                      onChange={(e) => setSliderDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t mt-4">
                  <div className="flex items-center gap-2 flex-grow w-full sm:w-auto">
                    <Input 
                      placeholder="URL de l'image (ex: https://...)" 
                      value={tempSliderImageUrl}
                      onChange={(e) => setTempSliderImageUrl(e.target.value)}
                      className="flex-grow h-10"
                    />
                    <Button 
                      onClick={handleSaveSliderUrl} 
                      disabled={isSaving || !tempSliderImageUrl.trim()}
                      className="bg-primary hover:bg-[#D98A1E] h-10 whitespace-nowrap border-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Lien
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-sm text-gray-400 font-medium hidden sm:inline">OU</span>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSliderImageUpload}
                      className="hidden" 
                      id="slider-upload"
                      disabled={isSliderUploading}
                    />
                    <Button asChild disabled={isSliderUploading} className="bg-primary hover:bg-[#D98A1E] h-10 w-full sm:w-auto border-0">
                      <label htmlFor="slider-upload" className="cursor-pointer flex items-center justify-center gap-2">
                        {isSliderUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Télécharger
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              {isSliderUploading && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Téléchargement en cours...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {sliderLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sliderImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sliderImages.map((image) => (
                    <div key={image.id} className="relative group rounded-xl overflow-hidden border bg-gray-50 aspect-video shadow-sm hover:shadow-md transition-all">
                      <img 
                        src={image.url} 
                        alt="Slider" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 opacity-100 transition-opacity">
                         <div className="mb-2">
                           <p className="text-white font-bold text-sm truncate">{image.title || 'Pas de titre'}</p>
                           <p className="text-white/70 text-xs truncate">{image.description || 'Pas de description'}</p>
                         </div>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-lg px-3 h-8 text-xs flex-grow bg-white/20 hover:bg-white/40 text-white border-none"
                            onClick={() => {
                              setEditingSliderImage({...image});
                              setIsSliderImageEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Modifier
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="rounded-lg px-3 h-8 text-xs flex-grow"
                            onClick={() => {
                              setSliderImageToDelete(image);
                              setIsSliderImageDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune image personnalisée. Les images par défaut sont affichées.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Slider Delete Confirmation Dialog */}
          <Dialog open={isSliderImageDeleteDialogOpen} onOpenChange={setIsSliderImageDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer cette image du slider ? Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-4">
                <div className="h-32 w-full rounded-lg overflow-hidden border">
                  <img src={sliderImageToDelete?.url} className="w-full h-full object-cover" alt="To delete" />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsSliderImageDeleteDialogOpen(false)}>Annuler</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmDeleteSliderImage}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Supprimer l'image
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Slider Edit Dialog */}
          <Dialog open={isSliderImageEditDialogOpen} onOpenChange={setIsSliderImageEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Modifier le Slide</DialogTitle>
                <DialogDescription>
                  Mettez à jour le titre, la description ou l'URL de cette image du slider.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL de l'image (Lien direct)</Label>
                    <Input 
                      value={editingSliderImage?.url || ''}
                      onChange={(e) => setEditingSliderImage(prev => prev ? {...prev, url: e.target.value} : null)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre du slide</Label>
                    <Input 
                      value={editingSliderImage?.title || ''}
                      onChange={(e) => setEditingSliderImage(prev => prev ? {...prev, title: e.target.value} : null)}
                      placeholder="Ex: Neopay Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description du slide</Label>
                    <Textarea 
                      value={editingSliderImage?.description || ''}
                      onChange={(e) => setEditingSliderImage(prev => prev ? {...prev, description: e.target.value} : null)}
                      placeholder="Ex: Accès rapide et sécurisé..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden border bg-gray-50 aspect-video relative">
                  {editingSliderImage?.url ? (
                    <img src={editingSliderImage.url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Aperçu de l'image
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSliderImageEditDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleUpdateSliderImage} disabled={isSaving} className="bg-primary hover:bg-[#D98A1E] border-0">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-6">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md py-4 border-b -mx-6 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <h2 className="text-xl font-bold text-dark">Gestion des Affiliés</h2>
            <Button onClick={() => {
              setEditingAffiliate(null);
              setAffiliateFormData({ 
                name: '', 
                username: '', 
                password: '', 
                code: '',
                balance: 0,
                referredClients: 0
              });
              setIsAffiliateDialogOpen(true);
            }} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 shadow-md border-0">
              <PlusCircle className="h-4 w-4" />
              Nouvel Affilié
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-accent-light/30 border-accent-light">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">Total Affiliés</p>
                    <p className="text-3xl font-bold text-dark">{affiliates.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent-light/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">Total à Payer</p>
                    <p className="text-3xl font-bold text-dark">{totalAffiliateBalance} Goud</p>
                  </div>
                  <Wallet className="h-8 w-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent-light/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase">Points Totaux</p>
                    <p className="text-3xl font-bold text-dark">
                      {affiliates.reduce((sum, a) => sum + (a.points || 0), 0)}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Liste des Affiliés</CardTitle>
                    {affiliateSearch && (
                      <Badge variant="secondary" className="bg-accent-light text-primary border-primary/20">
                        {filteredAffiliates.length} trouvé{filteredAffiliates.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Nom, prénom, code ou username..." 
                      className="pl-10 h-9 text-sm"
                      value={affiliateSearch}
                      onChange={(e) => setAffiliateSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {affiliatesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>Chargement des affiliés...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead>Nom</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Niveau</TableHead>
                            <TableHead>Solde</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Référés</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAffiliates.map((a) => (
                            <TableRow key={a.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => {
                              setEditingAffiliate(a);
                              setAffiliateFormData(a);
                              setIsAffiliateDialogOpen(true);
                            }}>
                              <TableCell className="font-medium">{a.name}</TableCell>
                              <TableCell className="font-mono text-xs">{a.code}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-bold uppercase text-[10px]">
                                  {a.level || 'Bronze'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-primary">{a.balance} Goud</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="bg-accent-light text-primary border-primary/20 w-fit">
                                    {a.points || 0} pts
                                  </Badge>
                                  {a.isMonthlyWinner && (
                                    <Badge 
                                      className="bg-accent-light text-primary border-primary/20 text-[9px] w-fit cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                      onClick={() => handleToggleWinnerStatus(a)}
                                      title="Cliquez pour retirer du classement"
                                    >
                                      Gagnant Approuvé
                                    </Badge>
                                  )}
                                  {!a.isMonthlyWinner && (a.points || 0) > 0 && (
                                    <Badge 
                                      className="bg-gray-100 text-gray-600 border-gray-200 text-[9px] w-fit cursor-pointer hover:bg-accent-light hover:text-primary hover:border-primary/20"
                                      onClick={() => handleToggleWinnerStatus(a)}
                                      title="Cliquez pour ajouter au classement"
                                    >
                                      Candidat
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{a.referredClients}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingAffiliate(a);
                                    setAffiliateFormData(a);
                                    setIsAffiliateDialogOpen(true);
                                  }}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-primary hover:text-[#D98A1E] hover:bg-accent-light/50" onClick={() => {
                                    setSelectedAffiliateForSale(a);
                                    setIsRecordSaleDialogOpen(true);
                                  }}>
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenAffiliateDeleteDialog(a)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredAffiliates.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                                {affiliateSearch ? "Aucun affilié ne correspond à votre recherche." : "Aucun affilié trouvé."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-sm border-primary/20 bg-accent-light/20">
                <CardHeader className="border-b border-primary/10 bg-accent-light/50">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    File d'attente des Prix
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-[10px] text-gray-500 italic mb-2">
                    Ces affiliés sont les candidats actuels basés sur les points. Cliquez sur le bouton ci-dessous pour les officialiser dans le classement public.
                  </p>
                  {winnersQueue.length > 0 ? (
                    <div className="space-y-3">
                      {winnersQueue.map((w, idx) => (
                        <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white border border-primary/10 shadow-sm gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-primary text-white' : 
                              idx === 1 ? 'bg-gray-400 text-white' : 
                              'bg-primary/80 text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{w.name}</p>
                              <p className="text-[10px] text-gray-500">{w.points} points</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] w-fit">
                            {idx === 0 ? '500 G' : idx === 1 ? '250 G' : '150 G'}
                          </Badge>
                        </div>
                      ))}
                      <Button 
                        className="w-full bg-primary hover:bg-[#D98A1E] text-white mt-2"
                        onClick={handleAwardPrizes}
                        disabled={isAwarding}
                      >
                        {isAwarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Approuver & Décerner les prix
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-xs italic">Aucun affilié n'a de points ce mois-ci.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-primary/20 bg-accent-light/30">
                <CardHeader className="border-b border-accent-light bg-accent-light/30">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Classement Officiel Actuel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-[10px] text-subtext italic mb-2">
                    Voici ce que les affiliés voient actuellement comme classement officiel.
                  </p>
                  {officialRankingsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : officialRankings.length > 0 ? (
                    <div className="space-y-3">
                      {officialRankings.map((w, idx) => (
                        <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-accent-light shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0 ? 'bg-primary text-white' : 
                              idx === 1 ? 'bg-gray-400 text-white' : 
                              'bg-primary text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-dark">{w.name}</p>
                              <p className="text-[10px] text-subtext">{w.points} points</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-accent-light text-primary border-primary/20">
                            Officiel
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-subtext border border-dashed border-accent-light rounded-lg bg-white/50">
                      <p className="text-xs italic">Aucun classement officiel publié.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="text-lg font-semibold">Actions Mensuelles</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full border-red-200 text-red-700 hover:bg-red-50"
                    onClick={handleClearWinners}
                    disabled={isClearingWinners}
                  >
                    {isClearingWinners ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Vider le classement
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-primary/20 text-primary hover:bg-accent-light/50"
                    onClick={async () => {
                      await resetMonthlyStats();
                      toast.success("Statistiques mensuelles réinitialisées !");
                    }}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Réinitialiser le mois
                  </Button>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Décernés les prix avant de réinitialiser le mois.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between py-3 px-4">
                  <CardTitle className="text-lg font-semibold">Demandes d'Inscription</CardTitle>
                  {pendingRegistrations.length > 0 && (
                    <Badge className="bg-red-500 text-white border-0">{pendingRegistrations.length}</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {affiliateRequestsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : affiliateRequests.filter(r => r.status === 'pending').length > 0 ? (
                    affiliateRequests.filter(r => r.status === 'pending').map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border bg-accent-light/30 border-accent-light space-y-3">
                        <div className="flex flex-col xs:flex-row justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-dark truncate">{r.name}</p>
                            <p className="text-xs text-subtext truncate">{r.email}</p>
                            <p className="text-xs text-subtext">{r.phone}</p>
                          </div>
                          <Badge variant="outline" className="bg-accent-light text-primary border-primary/20 shrink-0">Nouveau</Badge>
                        </div>
                        {r.message && (
                          <p className="text-xs text-gray-600 bg-white p-2 rounded border italic">
                            "{r.message}"
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-primary hover:bg-[#D98A1E] h-8 border-0"
                            onClick={() => handleAffiliateRequestAction(r, 'approved')}
                          >
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 h-8 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleAffiliateRequestAction(r, 'rejected')}
                          >
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Aucune demande d'inscription.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between py-3 px-4">
                  <CardTitle className="text-lg font-semibold">Demandes de Retrait</CardTitle>
                  {pendingWithdrawals.length > 0 && (
                    <Badge className="bg-red-500 text-white border-0">{pendingWithdrawals.length}</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {allWithdrawalsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : allWithdrawals.filter(w => w.status === 'pending').length > 0 ? (
                    allWithdrawals.filter(w => w.status === 'pending').map((w) => (
                      <div key={w.id} className="p-4 rounded-xl border bg-gray-50 space-y-3">
                        <div className="flex flex-col xs:flex-row justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold truncate">{w.affiliateName}</p>
                            <p className="text-xs text-gray-500">Code: {w.affiliateCode}</p>
                            <div className="mt-2 p-2 bg-accent-light rounded-lg border border-primary/20">
                              <p className="text-[10px] uppercase font-bold text-primary/70">Compte de Paiement</p>
                              <p className="text-sm font-bold text-dark break-all">
                                {w.method}: {w.accountNumber}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-accent-light text-primary shrink-0 border-primary/20">{w.amount} Goud</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Wallet className="h-3 w-3" />
                          <span>{w.method}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-primary hover:bg-[#D98A1E] h-8 border-0"
                            onClick={() => handleWithdrawalAction(w, 'approved')}
                          >
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1 h-8"
                            onClick={() => handleWithdrawalAction(w, 'rejected')}
                          >
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Aucune demande en attente.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-dark">
              <Bell className="h-5 w-5 text-primary" />
              Centre de Notifications
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={notifFilter} onValueChange={(v: any) => setNotifFilter(v)}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="registration">Inscriptions</SelectItem>
                  <SelectItem value="withdrawal">Retraits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <CardTitle className="text-lg font-semibold">Demandes en attente ({allPendingRequests.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Rechercher par nom ou code..." 
                  className="pl-10"
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {allPendingRequests.length > 0 ? (
                  allPendingRequests.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          req.type === 'registration' ? 'bg-accent-light text-primary' : 'bg-accent-light/50 text-dark'
                        }`}>
                          {req.type === 'registration' ? <Users className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-dark truncate">{req.name}</p>
                            <Badge variant="outline" className={
                              req.type === 'registration' ? 'bg-accent-light text-primary border-primary/20' : 'bg-muted text-subtext border-muted'
                            }>
                              {req.type === 'registration' ? 'Inscription' : 'Retrait'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'PPp', { locale: fr }) : 'Date inconnue'}
                            </span>
                            {req.type === 'withdrawal' && (
                              <span className="font-bold text-primary">{(req as any).amount} Goud</span>
                            )}
                            {req.type === 'registration' && (
                              <span>{(req as any).email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          className="flex-1 sm:flex-none bg-primary hover:bg-[#D98A1E] border-0"
                          onClick={() => {
                            if (req.type === 'registration') {
                              handleAffiliateRequestAction(req as any, 'approved');
                            } else {
                              handleWithdrawalAction(req as any, 'approved');
                            }
                          }}
                        >
                          Approuver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (req.type === 'registration') {
                              handleAffiliateRequestAction(req as any, 'rejected');
                            } else {
                              handleWithdrawalAction(req as any, 'rejected');
                            }
                          }}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Bell className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Aucune notification en attente</p>
                    <p className="text-sm">Toutes les demandes ont été traitées.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-xl font-bold text-center sm:text-left">Paramètres du Site</h2>
          <Card className="max-w-2xl mx-auto sm:mx-0">
            <CardHeader>
              <CardTitle>Identité Visuelle</CardTitle>
              <CardDescription>Gérez le logo de votre plateforme Neopay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Logo du site</Label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-100 overflow-hidden shrink-0">
                    {settings?.logoUrl ? (
                      <img 
                        src={settings.logoUrl} 
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-2 w-full sm:w-auto">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="hidden" 
                      id="logo-upload"
                    />
                    <Button asChild variant="outline" disabled={uploading} className="w-full sm:w-auto">
                      <label htmlFor="logo-upload" className="cursor-pointer flex items-center justify-center">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Changer le logo
                      </label>
                    </Button>
                    {uploading && (
                      <div className="w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center sm:text-left">Format recommandé: PNG ou SVG, fond transparent.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lien du logo (externe)</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                      placeholder="https://..." 
                      value={tempLogoUrl} 
                      onChange={(e) => setTempLogoUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => {
                        if (tempLogoUrl) {
                          updateSettings({ logoUrl: tempLogoUrl });
                          setTempLogoUrl('');
                          toast.success("Lien du logo appliqué !");
                        }
                      }}
                      className="bg-primary hover:bg-[#D98A1E] w-full sm:w-auto border-0"
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Numéro WhatsApp Admin (pour notifications)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="+509..." 
                      value={settings?.whatsappAdminNumber || ''} 
                      onChange={(e) => updateSettings({ whatsappAdminNumber: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Ce numéro recevra les demandes de retrait des affiliés.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <AdminShippingManager />
        </TabsContent>

        <TabsContent value="nav-buttons" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Boutons de Navigation Rapide</h2>
            <Button onClick={() => handleOpenNavButtonDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 border-0">
              <Plus className="h-4 w-4" />
              Nouveau Bouton
            </Button>
          </div>

          <Card className="shadow-sm border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ordre</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Icône</TableHead>
                  <TableHead>Cible / URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buttonsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : buttons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Aucun bouton de navigation configuré.
                    </TableCell>
                  </TableRow>
                ) : (
                  buttons.map((btn) => (
                    <TableRow key={btn.id}>
                      <TableCell className="font-mono">{btn.order}</TableCell>
                      <TableCell className="font-bold">{btn.label}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-50">
                            <LucideIcon name={btn.iconName} className="h-5 w-5" color={btn.color} />
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{btn.iconName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-gray-500">
                        {btn.targetUrl}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenNavButtonDialog(btn)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setNavButtonToDelete(btn);
                            setIsNavButtonDeleteDialogOpen(true);
                          }} className="text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-dark">Gestion des Administrateurs</h2>
            <Button onClick={() => handleOpenAdminDialog()} className="w-full sm:w-auto bg-primary hover:bg-[#D98A1E] text-white flex items-center justify-center gap-2 rounded-2xl h-11 px-6 font-bold shadow-lg shadow-accent-light/50 border-0">
              <Plus className="h-4 w-4" />
              Nouvel Admin
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((acc) => (
              <Card key={acc.id} className="border-0 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {acc.photoUrl ? (
                         <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-accent-light shadow-sm shrink-0 ring-2 ring-white">
                          <img 
                            src={acc.photoUrl} 
                            alt={acc.fullName} 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.fullName)}&background=random`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className={`p-3 rounded-2xl ${acc.isSuperAdmin ? 'bg-accent-light text-primary' : 'bg-gray-50 text-gray-400'}`}>
                          {acc.isSuperAdmin ? <Shield className="h-6 w-6" /> : <ShieldAlertIcon className="h-6 w-6" />}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-dark group-hover:text-primary transition-colors">{acc.fullName}</h3>
                        <p className="text-[10px] text-subtext uppercase font-bold tracking-widest leading-none mt-1">
                          {acc.isSuperAdmin ? "Super Admin" : "Administrateur"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenAdminDialog(acc)} className="rounded-xl hover:bg-accent-light hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!acc.isSuperAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setAdminToDelete(acc);
                            setIsAdminDeleteDialogOpen(true);
                          }} 
                          className="rounded-xl hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {acc.permissions.length === 0 ? (
                        <span className="text-[10px] text-gray-400 italic">Aucune permission</span>
                      ) : acc.permissions.includes('all') ? (
                        <span className="bg-accent-light text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">Accès Total</span>
                      ) : (
                        acc.permissions.map(p => (
                          <span key={p} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {menuItems.find(m => m.permission === p)?.label || p}
                          </span>
                        ))
                      )}
                    </div>
                    
                    <div className="pt-3 border-t flex justify-between items-center">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${acc.failedAttempts > 0 ? 'bg-primary' : 'bg-primary'}`} />
                         <span className="text-[10px] text-gray-500 font-medium">
                           {acc.failedAttempts > 0 ? `${acc.failedAttempts} échecs` : 'Sain'}
                         </span>
                       </div>
                       <p className="text-[10px] text-gray-400">MAJ {acc.updatedAt ? format(acc.updatedAt instanceof Timestamp ? acc.updatedAt.toDate() : new Date(acc.updatedAt), 'dd/MM/yy', { locale: fr }) : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Sale Dialog */}
      <Dialog open={isRecordSaleDialogOpen} onOpenChange={setIsRecordSaleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Enregistrer une vente
            </DialogTitle>
            <DialogDescription>
              Attribuez une vente à <span className="font-bold text-gray-900">{selectedAffiliateForSale?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Type de vente</Label>
              <Select value={saleType} onValueChange={(v: any) => setSaleType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Achat Général (2.5 Goud)</SelectItem>
                  <SelectItem value="subscription">Abonnement Netflix/Prime (100 Goud)</SelectItem>
                  <SelectItem value="virtual_card">Carte Virtuelle MasterCard (500 Goud)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-accent-light/50 p-3 rounded-lg border border-accent-light">
              <p className="text-xs text-primary">
                L'affilié recevra la commission directe et les points correspondants. 
                Si l'affilié a un parrain, celui-ci recevra 0.5 Goud de commission indirecte.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordSaleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRecordSale} disabled={isRecordingSale} className="bg-primary hover:bg-[#D98A1E] text-white">
              {isRecordingSale ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmer la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nav Button Edit/Add Dialog */}
      <Dialog open={isNavButtonDialogOpen} onOpenChange={setIsNavButtonDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingNavButton ? 'Modifier le bouton' : 'Ajouter un bouton'}</DialogTitle>
            <DialogDescription>
              Configurez le libellé, l'icône et l'action du bouton.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-label" className="text-right">Libellé</Label>
              <Input 
                id="nav-label" 
                value={navButtonFormData.label} 
                onChange={(e) => setNavButtonFormData({...navButtonFormData, label: e.target.value})}
                className="col-span-3"
                placeholder="Ex: Jeux"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="nav-instruction" className="text-right pt-2 text-xs">Instruction dynamique</Label>
              <div className="col-span-3 space-y-2">
                <Textarea 
                  id="nav-instruction" 
                  value={navButtonFormData.redirectionInstruction} 
                  onChange={(e) => setNavButtonFormData({...navButtonFormData, redirectionInstruction: e.target.value})}
                  className="min-h-[60px] text-xs"
                  placeholder="Ex: Rediriger vers la page des jeux à jour ou Aller à la section Jeux"
                />
                <p className="text-[10px] text-gray-500 leading-tight">
                  Une phrase décrivant l'action (optionnel).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-targetUrl" className="text-right">Cible (URL/#)</Label>
              <div className="col-span-3 space-y-2">
                <Input 
                  id="nav-targetUrl" 
                  value={navButtonFormData.targetUrl} 
                  onChange={(e) => setNavButtonFormData({...navButtonFormData, targetUrl: e.target.value})}
                  placeholder="Ex: #services ou /billing"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Ancre Services', value: '#services' },
                    { label: 'Ancre Produits', value: '#products' },
                    { label: 'Ancre Paiement', value: '#payment' },
                    { label: 'Page Suivi', value: 'tracking' },
                    { label: 'Page Shipping', value: 'shipping' },
                    { label: 'Page Affiliation', value: 'affiliate' }
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setNavButtonFormData({...navButtonFormData, targetUrl: s.value})}
                      className="text-[10px] px-2 py-1 bg-accent-light text-primary rounded-md border border-accent-light hover:bg-accent-light/50 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-iconName" className="text-right">Icône Lucide</Label>
              <Input 
                id="nav-iconName" 
                value={navButtonFormData.iconName} 
                onChange={(e) => setNavButtonFormData({...navButtonFormData, iconName: e.target.value})}
                className="col-span-3"
                placeholder="Ex: Gamepad2, Package, Star..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-color" className="text-right">Couleur</Label>
              <Input 
                id="nav-color" 
                type="color"
                value={navButtonFormData.color} 
                onChange={(e) => setNavButtonFormData({...navButtonFormData, color: e.target.value})}
                className="col-span-3 h-10 p-1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-order" className="text-right">Ordre</Label>
              <Input 
                id="nav-order" 
                type="number"
                value={navButtonFormData.order} 
                onChange={(e) => setNavButtonFormData({...navButtonFormData, order: parseInt(e.target.value) || 0})}
                className="col-span-3"
              />
            </div>
            <div className="flex justify-center p-4 border rounded-xl bg-gray-50 bg-opacity-50">
               <div className="flex flex-col items-center gap-2">
                 <p className="text-[10px] uppercase font-bold text-gray-400">Aperçu</p>
                 <div
                    className="bg-white border rounded-[16px] px-6 h-[52px] shadow-sm flex items-center justify-center pointer-events-none"
                  >
                    <LucideIcon name={navButtonFormData.iconName || 'HelpCircle'} className="mr-2 h-5 w-5" color={navButtonFormData.color} />
                    <span className="font-heading font-bold" style={{ color: navButtonFormData.color }}>{navButtonFormData.label || 'Aperçu'}</span>
                  </div>
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNavButtonDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveNavButton} className="bg-primary hover:bg-[#D98A1E] text-white border-0">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nav Button Delete Dialog */}
      <Dialog open={isNavButtonDeleteDialogOpen} onOpenChange={setIsNavButtonDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Supprimer le bouton
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer le bouton <span className="font-bold">"{navButtonToDelete?.label}"</span> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNavButtonDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteNavButton} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affiliate Edit/Add Dialog */}
      <Dialog open={isAffiliateDialogOpen} onOpenChange={setIsAffiliateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>{editingAffiliate ? 'Modifier l\'affilié' : 'Nouvel affilié'}</DialogTitle>
              <DialogDescription>
                Gérez les identifiants et les informations de l'affilié.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
            <div className="grid gap-4 py-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Nom Complet</Label>
              <Input 
                value={affiliateFormData.name} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, name: e.target.value})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Username</Label>
              <Input 
                value={affiliateFormData.username} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, username: e.target.value})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Password</Label>
              <Input 
                value={affiliateFormData.password} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, password: e.target.value})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Code</Label>
              <Input 
                value={affiliateFormData.code} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, code: e.target.value})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Niveau</Label>
              <Select 
                value={affiliateFormData.level} 
                onValueChange={(v: any) => setAffiliateFormData({...affiliateFormData, level: v})}
              >
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Parrain (ID)</Label>
              <Input 
                value={affiliateFormData.parentAffiliateId || ''} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, parentAffiliateId: e.target.value})}
                className="sm:col-span-3" 
                placeholder="ID de l'affilié parrain"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Solde (Goud)</Label>
              <Input 
                type="number"
                value={affiliateFormData.balance} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, balance: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Clients Parrainés</Label>
              <Input 
                type="number"
                value={affiliateFormData.referredClients} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, referredClients: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Points (Manuel)</Label>
              <Input 
                type="number"
                value={affiliateFormData.points || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, points: Number(e.target.value)})}
                className="sm:col-span-3 border-primary/20 focus:ring-primary" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Ventes Mois (G)</Label>
              <Input 
                type="number"
                value={affiliateFormData.monthlySales || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, monthlySales: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Réf. Mois</Label>
              <Input 
                type="number"
                value={affiliateFormData.monthlyReferredClients || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, monthlyReferredClients: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Rev. Direct</Label>
              <Input 
                type="number"
                value={affiliateFormData.directRevenue || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, directRevenue: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Rev. Indirect</Label>
              <Input 
                type="number"
                value={affiliateFormData.indirectRevenue || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, indirectRevenue: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-xs">Total Gains</Label>
              <Input 
                type="number"
                value={affiliateFormData.totalEarnings || 0} 
                onChange={(e) => setAffiliateFormData({...affiliateFormData, totalEarnings: Number(e.target.value)})}
                className="sm:col-span-3" 
              />
            </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 pt-3 border-t bg-white/80 backdrop-blur-md sticky bottom-0 z-20">
            <DialogFooter className="sm:justify-end flex-row gap-2 mt-0">
              <Button 
                variant="outline" 
                onClick={() => setIsAffiliateDialogOpen(false)}
                className="flex-1 sm:flex-none"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveAffiliate} 
                disabled={isSaving} 
                className="flex-1 sm:flex-none bg-primary hover:bg-[#D98A1E] text-white shadow-lg shadow-accent-light/50 border-0"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Affiliate Delete Confirmation Dialog */}
      <Dialog open={isAffiliateDeleteConfirmOpen} onOpenChange={setIsAffiliateDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'affilié <span className="font-bold text-gray-900">{affiliateToDelete?.name}</span> ? 
              Cette action est irréversible et supprimera toutes les données associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAffiliateDeleteConfirmOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmAffiliateDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Delete Confirmation */}
      <Dialog open={isProductDeleteDialogOpen} onOpenChange={setIsProductDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Supprimer le produit
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <span className="font-bold">{productToDelete?.name}</span> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsProductDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteProduct} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGameDeleteDialogOpen} onOpenChange={setIsGameDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Supprimer le jeu
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <span className="font-bold">{gameToDelete?.name}</span> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsGameDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteGame} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Edit/Add Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-4 overflow-hidden">
          <DialogHeader className="pb-4 border-b -mx-4 -mt-4 p-4 px-6 bg-white z-20">
            <DialogTitle className="text-xl font-black">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription className="text-xs">Ajoutez un service ou un produit dynamique à votre plateforme.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 py-4 custom-scrollbar overscroll-contain">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-xs font-bold uppercase text-gray-500">Nom</Label>
                <Input 
                  value={productFormData.name} 
                  onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                  className="sm:col-span-3 h-10 rounded-xl" 
                  placeholder="Ex: Netflix Premium 1 Mois"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Prix</Label>
                <Input 
                  value={productFormData.price} 
                  onChange={(e) => setProductFormData({...productFormData, price: e.target.value})}
                  className="sm:col-span-3" 
                  placeholder="Ex: 1500 HTG"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Description</Label>
                <textarea 
                  value={productFormData.description} 
                  onChange={(e) => setProductFormData({...productFormData, description: e.target.value})}
                  className="sm:col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Détails du service..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Msg WhatsApp</Label>
                <Input 
                  value={productFormData.whatsappMessage} 
                  onChange={(e) => setProductFormData({...productFormData, whatsappMessage: e.target.value})}
                  className="sm:col-span-3" 
                  placeholder="Message auto personnalisé..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Image (Lien)</Label>
                <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
                  <Input 
                    value={tempProductImageUrl} 
                    onChange={(e) => setTempProductImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => {
                      if (tempProductImageUrl) {
                        setProductFormData({...productFormData, image: tempProductImageUrl});
                        setTempProductImageUrl('');
                        toast.success("Lien d'image appliqué !");
                      }
                    }}
                    className="bg-primary hover:bg-[#D98A1E] w-full sm:w-auto border-0"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="sm:text-right text-sm">Image (Fichier)</Label>
              <div className="sm:col-span-3 space-y-4">
                {productFormData.image && (
                  <div className="relative h-40 sm:h-48 w-full rounded-xl overflow-hidden border bg-gray-50">
                    <img 
                      src={productFormData.image} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/neopay/400/400';
                      }}
                    />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => setProductFormData({...productFormData, image: ''})}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProductImageUpload}
                      className="hidden" 
                      id="product-image-upload"
                    />
                    <Button asChild variant="outline" className="w-full cursor-pointer" disabled={uploading}>
                      <label htmlFor="product-image-upload" className="flex items-center justify-center">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Télécharger l'image
                      </label>
                    </Button>
                  </div>
                  {uploading && (
                    <div className="w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 z-30 mt-auto border-t pt-4 pb-2 bg-white/95 backdrop-blur-md flex flex-row justify-between items-center sm:justify-between w-full -mx-4 px-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2">
              {editingProduct && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setProductToDelete(editingProduct);
                    setIsProductDeleteDialogOpen(true);
                    setIsProductDialogOpen(false);
                  }} 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2 h-9 text-[10px] sm:text-xs border border-transparent hover:border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden xs:inline">Supprimer</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsProductDialogOpen(false)} className="rounded-xl h-9 text-xs px-4">Annuler</Button>
              <Button 
                onClick={handleSaveProduct} 
                disabled={isSaving} 
                className="bg-primary hover:bg-[#D98A1E] text-white font-bold h-9 rounded-xl shadow-lg shadow-accent-light/50 border-0 px-6 min-w-[100px]"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-4 overflow-hidden">
          <DialogHeader className="pb-4 border-b -mx-4 -mt-4 p-4 px-6 bg-white z-20">
            <DialogTitle className="text-xl font-black">{editingGame ? 'Modifier le jeu' : 'Nouveau jeu'}</DialogTitle>
            <DialogDescription className="text-xs">Ajoutez un jeu pour le service de Top-up.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 py-4 custom-scrollbar overscroll-contain">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-xs font-bold uppercase text-gray-500">Nom</Label>
                <Input 
                  value={gameFormData.name} 
                  onChange={(e) => setGameFormData({...gameFormData, name: e.target.value})}
                  className="sm:col-span-3 h-10 rounded-xl" 
                  placeholder="Ex: Free Fire"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Prix (Range)</Label>
                <Input 
                  value={gameFormData.priceRange} 
                  onChange={(e) => setGameFormData({...gameFormData, priceRange: e.target.value})}
                  className="sm:col-span-3" 
                  placeholder="Ex: À partir de 100 G"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Description</Label>
                <textarea 
                  value={gameFormData.description} 
                  onChange={(e) => setGameFormData({...gameFormData, description: e.target.value})}
                  className="sm:col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Détails du jeu..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Msg WhatsApp</Label>
                <Input 
                  value={gameFormData.whatsappMessage} 
                  onChange={(e) => setGameFormData({...gameFormData, whatsappMessage: e.target.value})}
                  className="sm:col-span-3" 
                  placeholder="Message auto personnalisé..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="sm:text-right text-sm">Image (Lien)</Label>
                <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
                  <Input 
                    value={tempGameImageUrl} 
                    onChange={(e) => setTempGameImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => {
                      if (tempGameImageUrl) {
                        setGameFormData({...gameFormData, image: tempGameImageUrl});
                        setTempGameImageUrl('');
                        toast.success("Lien d'image appliqué !");
                      }
                    }}
                    className="bg-primary hover:bg-[#D98A1E] w-full sm:w-auto border-0"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="sm:text-right text-sm">Image (Fichier)</Label>
              <div className="sm:col-span-3 space-y-4">
                {gameFormData.image && (
                  <div className="relative h-40 sm:h-48 w-full rounded-xl overflow-hidden border bg-gray-50">
                    <img 
                      src={gameFormData.image} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/game/400/400';
                      }}
                    />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => setGameFormData({...gameFormData, image: ''})}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleGameImageUpload}
                      className="hidden" 
                      id="game-image-upload"
                    />
                    <Button asChild variant="outline" className="w-full cursor-pointer" disabled={uploading}>
                      <label htmlFor="game-image-upload" className="flex items-center justify-center">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Télécharger l'image
                      </label>
                    </Button>
                  </div>
                  {uploading && (
                    <div className="w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t relative">
              <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 -mx-2 px-2 rounded-lg mb-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  Catalogue de prix
                </Label>
                <Button variant="ghost" size="sm" onClick={addCatalogItem} className="h-8 text-primary hover:text-dark hover:bg-accent-light font-bold">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un pack
                </Button>
              </div>
              
              <div className="space-y-3">
                {gameFormData.catalog?.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl border bg-gray-50 space-y-3 relative group transition-all hover:border-primary/20">
                    <div className="flex justify-between items-center bg-white px-3 py-1 rounded-full border text-[10px] font-bold text-gray-400 w-fit shadow-sm">
                      PACK {idx + 1}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-gray-500 font-bold">Produit (ex: 100 Diamants)</Label>
                        <Input 
                          value={item.name} 
                          onChange={(e) => updateCatalogItem(item.id, { name: e.target.value })} 
                          placeholder="Ex: 500 G"
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-gray-500 font-bold">Prix (ex: 150 G)</Label>
                        <Input 
                          value={item.price} 
                          onChange={(e) => updateCatalogItem(item.id, { price: e.target.value })} 
                          placeholder="Prix"
                          className="h-9 bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-gray-500 font-bold">Message WhatsApp personnalisé (Optionnel)</Label>
                      <Input 
                        value={item.whatsappMessage} 
                        onChange={(e) => updateCatalogItem(item.id, { whatsappMessage: e.target.value })} 
                        placeholder="Laisse vide pour message par défaut"
                        className="h-9 bg-white"
                      />
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        removeCatalogItem(item.id);
                        toast.info("Pack retiré. N'oubliez pas d'enregistrer.");
                      }}
                      className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border border-red-100 bg-white shadow-sm z-30"
                      title="Supprimer ce pack"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {(!gameFormData.catalog || gameFormData.catalog.length === 0) && (
                  <div className="text-center py-6 border-2 border-dashed rounded-xl text-gray-400 text-sm">
                    Aucun pack défini.
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 z-30 mt-auto border-t pt-4 pb-2 bg-white/95 backdrop-blur-md flex flex-row justify-between items-center sm:justify-between w-full -mx-4 px-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2">
              {editingGame && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setGameToDelete(editingGame);
                    setIsGameDeleteDialogOpen(true);
                    setIsGameDialogOpen(false);
                  }} 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2 h-9 text-[10px] sm:text-xs border border-transparent hover:border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden xs:inline">Supprimer</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsGameDialogOpen(false)} className="rounded-xl h-9 text-xs px-4">Annuler</Button>
              <Button 
                onClick={handleSaveGame} 
                disabled={isSaving} 
                className="bg-primary hover:bg-[#D98A1E] text-white font-bold h-9 rounded-xl shadow-lg shadow-accent-light/50 border-0 px-6 min-w-[100px]"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Delete Confirmation Dialog */}
      <Dialog open={isCardDeleteDialogOpen} onOpenChange={setIsCardDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Supprimer la carte
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la carte "{cardToDelete?.name}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCardDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteCard} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Editor Dialog */}
      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              {editingCard ? 'Modifier la carte' : 'Ajouter une carte'}
            </DialogTitle>
            <DialogDescription>
              Gérez les informations de la carte de recharge.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="card-name">Nom de la carte</Label>
                <Input 
                  id="card-name" 
                  value={cardFormData.name} 
                  onChange={(e) => setCardFormData({...cardFormData, name: e.target.value})}
                  placeholder="Ex: Carte Visa Prépayée"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="card-price">Prix / Frais</Label>
                <Input 
                  id="card-price" 
                  value={cardFormData.price} 
                  onChange={(e) => setCardFormData({...cardFormData, price: e.target.value})}
                  placeholder="Ex: 500 HTG"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-description">Description</Label>
                <Input 
                  id="card-description" 
                  value={cardFormData.description} 
                  onChange={(e) => setCardFormData({...cardFormData, description: e.target.value})}
                  placeholder="Détails sur la carte..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-whatsapp">Message WhatsApp personnalisé (Optionnel)</Label>
                <Input 
                  id="card-whatsapp" 
                  value={cardFormData.whatsappMessage} 
                  onChange={(e) => setCardFormData({...cardFormData, whatsappMessage: e.target.value})}
                  placeholder="Message automatique quand l'utilisateur clique..."
                />
              </div>

              <div className="space-y-4">
                <Label>Image de la carte</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <Input 
                      value={tempCardImageUrl} 
                      onChange={(e) => setTempCardImageUrl(e.target.value)}
                      placeholder="Coller l'URL de l'image..."
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (tempCardImageUrl) {
                          setCardFormData({...cardFormData, image: tempCardImageUrl});
                          setTempCardImageUrl('');
                          toast.success("URL de l'image appliquée !");
                        }
                      }}
                    >
                      Appliquer
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">Ou télécharger</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 gap-4 bg-gray-50/50">
                    {cardFormData.image ? (
                      <div className="relative group w-full aspect-video bg-white rounded-lg overflow-hidden border">
                        <img 
                          src={cardFormData.image} 
                          className="w-full h-full object-contain"
                          alt="Previsualisation" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button variant="destructive" size="sm" onClick={() => setCardFormData({...cardFormData, image: ''})}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <ImageIcon className="h-10 w-10 text-gray-300 mx-auto" />
                        <p className="text-sm text-gray-500">Aucune image sélectionnée</p>
                      </div>
                    )}
                    
                    <div className="w-full">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCardImageUpload}
                        className="hidden" 
                        id="card-image-upload"
                      />
                      <Button asChild variant="outline" className="w-full cursor-pointer" disabled={uploading}>
                        <label htmlFor="card-image-upload">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          {cardFormData.image ? 'Changer l\'image' : 'Télécharger une image'}
                        </label>
                      </Button>
                      {uploading && (
                        <div className="mt-2 w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t bg-gray-50/50 sticky bottom-0 left-0 right-0 z-10 w-full flex flex-row items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {editingCard && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setCardToDelete(editingCard);
                    setIsCardDeleteDialogOpen(true);
                  }}
                  className="bg-red-500 hover:bg-red-600 border-0 h-10 px-4"
                  title="Supprimer cette carte"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsCardDialogOpen(false)} className="h-10 px-6">Annuler</Button>
              <Button onClick={handleSaveCard} disabled={isSaving} className="bg-primary hover:bg-[#D98A1E] h-10 px-8 text-white font-bold shadow-md shadow-accent-light/50 active:scale-95 transition-all border-0">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le colis <span className="font-mono font-bold">{parcelToDelete?.trackingNumber}</span> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingParcel ? 'Modifier le colis' : 'Ajouter un nouveau colis'}</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous pour mettre à jour le suivi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="tracking" className="sm:text-right">N° Suivi</Label>
              <Input 
                id="tracking" 
                value={formData.trackingNumber} 
                onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                className="sm:col-span-3 font-mono" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="status" className="sm:text-right">Statut</Label>
              <div className="sm:col-span-3 w-full">
                <Select 
                  value={formData.status} 
                  onValueChange={(v: ParcelStatus) => setFormData({...formData, status: v})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En route">En route</SelectItem>
                    <SelectItem value="En transit">En transit</SelectItem>
                    <SelectItem value="Arrivé">Arrivé</SelectItem>
                    <SelectItem value="Livré">Livré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="location" className="sm:text-right">Lieu</Label>
              <Input 
                id="location" 
                value={formData.currentLocation} 
                onChange={(e) => setFormData({...formData, currentLocation: e.target.value})}
                className="sm:col-span-3" 
                placeholder="Ex: Miami, USA"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="arrival" className="sm:text-right">Arrivée Est.</Label>
              <Input 
                id="arrival" 
                type="date"
                value={formData.estimatedArrival} 
                onChange={(e) => setFormData({...formData, estimatedArrival: e.target.value})}
                className="sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="payment" className="sm:text-right">Paiement</Label>
              <div className="sm:col-span-3 w-full">
                <Select 
                  value={formData.paymentStatus} 
                  onValueChange={(v: PaymentStatus) => setFormData({...formData, paymentStatus: v})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Statut paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payé">Payé</SelectItem>
                    <SelectItem value="Non payé">Non payé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right">Preuve (Lien)</Label>
              <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
                <Input 
                  value={tempProofUrl} 
                  onChange={(e) => setTempProofUrl(e.target.value)}
                  placeholder="Lien de l'image de preuve..."
                  className="flex-1"
                />
                <Button 
                  onClick={() => {
                    if (tempProofUrl) {
                      setFormData({...formData, proofOfDelivery: tempProofUrl});
                      setTempProofUrl('');
                      toast.success("Lien de preuve appliqué !");
                    }
                  }}
                  className="bg-primary hover:bg-[#D98A1E] w-full sm:w-auto border-0"
                >
                  Ajouter
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="sm:text-right">Preuve (Fichier)</Label>
              <div className="sm:col-span-3 space-y-2">
                {formData.proofOfDelivery && (
                  <div className="relative group rounded-lg overflow-hidden border h-40 sm:h-48 bg-gray-50">
                    <img 
                      src={formData.proofOfDelivery} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/neopay/400/400';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button variant="destructive" size="sm" onClick={() => setFormData({...formData, proofOfDelivery: ''})}>Supprimer</Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="file-upload"
                    />
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full cursor-pointer"
                      disabled={uploading}
                    >
                      <label htmlFor="file-upload" className="flex items-center justify-center">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        {formData.proofOfDelivery ? 'Changer l\'image' : 'Télécharger une preuve'}
                      </label>
                    </Button>
                  </div>
                  {uploading && (
                    <div className="w-full bg-accent-light/30 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-[#D98A1E] border-0">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Editor Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-white rounded-b-[2rem] shrink-0">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Shield className="h-6 w-6" />
              {editingAdmin ? 'Modifier Admin' : 'Créer un Admin'}
            </DialogTitle>
            <DialogDescription className="text-accent-light opacity-90">
              Gérez les accès et les permissions de cet administrateur.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6 overflow-y-auto flex-grow">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom Complet</Label>
                <Input 
                  value={adminFormData.fullName} 
                  onChange={(e) => setAdminFormData({...adminFormData, fullName: e.target.value})}
                  placeholder="Ex: John Doe"
                  className="rounded-2xl h-11 bg-gray-50/50 border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mot de Passe</Label>
                <Input 
                  value={adminFormData.password} 
                  onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})}
                  placeholder="Mot de passe"
                  className="rounded-2xl h-11 bg-gray-50/50 border-gray-100"
                  type="text" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lien de la Photo de Profil</Label>
                <Input 
                  value={adminFormData.photoUrl} 
                  onChange={(e) => setAdminFormData({...adminFormData, photoUrl: e.target.value})}
                  placeholder="Ex: https://images.com/profile.jpg"
                  className="rounded-2xl h-11 bg-gray-50/50 border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Code de Connexion (Super Admin)</Label>
                <Input 
                  value={adminFormData.loginCode} 
                  onChange={(e) => setAdminFormData({...adminFormData, loginCode: e.target.value})}
                  placeholder="Ex: 123456"
                  className="rounded-2xl h-11 bg-gray-50/50 border-gray-100 font-mono"
                />
                <p className="text-[10px] text-gray-400 px-1">Seulement requis si coché comme Super Admin.</p>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="is-super" 
                  checked={adminFormData.isSuperAdmin} 
                  onCheckedChange={(checked) => setAdminFormData({...adminFormData, isSuperAdmin: !!checked})}
                />
                <Label htmlFor="is-super" className="text-sm font-bold text-gray-700">Définir comme Super Administrateur</Label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                {menuItems.filter(m => m.permission !== 'super_admin_only').map(item => (
                  <div key={item.permission} className="flex items-center space-x-2 p-2 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                    <Checkbox 
                      id={`p-${item.permission}`}
                      checked={adminFormData.permissions?.includes(item.permission) || adminFormData.permissions?.includes('all')}
                      onCheckedChange={(checked) => {
                        const current = adminFormData.permissions || [];
                        if (checked) {
                          setAdminFormData({...adminFormData, permissions: [...current, item.permission]});
                        } else {
                          setAdminFormData({...adminFormData, permissions: current.filter(p => p !== item.permission && p !== 'all')});
                        }
                      }}
                    />
                    <Label htmlFor={`p-${item.permission}`} className="text-xs font-medium cursor-pointer truncate">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t bg-gray-50/50 flex flex-col sm:flex-row gap-3 shrink-0">
            {editingAdmin && !editingAdmin.isSuperAdmin && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setAdminToDelete(editingAdmin);
                  setIsAdminDeleteDialogOpen(true);
                  setIsAdminDialogOpen(false);
                }}
                className="text-red-500 hover:bg-red-50 h-12 rounded-2xl font-bold order-2 sm:order-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto w-full sm:w-auto order-1 sm:order-2">
              <Button variant="outline" onClick={() => setIsAdminDialogOpen(false)} className="flex-1 sm:flex-none h-12 rounded-2xl border-gray-100 font-bold bg-white">Annuler</Button>
              <Button onClick={handleSaveAdminAccount} disabled={isSaving} className="flex-1 sm:flex-none h-12 rounded-2xl bg-primary hover:bg-[#D98A1E] text-white font-bold px-8 shadow-xl shadow-accent-light/50 border-0">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer l'Admin
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Logs Dialog */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden">
          <DialogHeader className="p-8 bg-dark text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-white">
              <History className="h-6 w-6 text-primary" />
              Logs de Connexion
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Historique des tentatives de connexion réussies et échouées.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-4">
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl border bg-white hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${log.success ? 'bg-accent-light/50 text-primary' : 'bg-red-50 text-red-600'}`}>
                      {log.success ? <Shield className="h-4 w-4" /> : < ShieldAlertIcon className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{log.adminName}</p>
                      <p className="text-[10px] text-gray-400">
                        {log.timestamp ? format(log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp), 'dd MMMM yyyy HH:mm', { locale: fr }) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.success ? 'bg-accent-light text-primary border border-primary/20' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {log.success ? 'Réussi' : 'Échec'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-gray-50/50">
            <Button variant="outline" onClick={() => setIsLogsDialogOpen(false)} className="w-full sm:w-auto h-11 rounded-2xl border-gray-100 font-bold px-8">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Delete Confirmation Dialog */}
      <Dialog open={isAdminDeleteDialogOpen} onOpenChange={setIsAdminDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-600 text-2xl font-black">
              <ShieldAlertIcon className="h-6 w-6" />
              Supprimer Admin
            </DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              Êtes-vous sûr de vouloir supprimer l'administrateur <span className="font-bold text-gray-900 leading-none">{adminToDelete?.fullName}</span> ? Cette action retirera tous ses accès immédiatement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-6 sm:justify-end">
            <Button variant="ghost" onClick={() => setIsAdminDeleteDialogOpen(false)} className="rounded-2xl h-12 font-bold px-6">Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteAdmin} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 rounded-2xl h-12 font-bold px-8 shadow-lg shadow-red-100">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back to Top Button */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0 }}
        className="fixed bottom-6 right-6 z-50 pointer-events-none"
      >
        <Button 
          onClick={scrollToTop}
          className="pointer-events-auto h-14 w-14 rounded-3xl bg-primary hover:bg-[#D98A1E] text-white shadow-2xl flex items-center justify-center p-0 border-0 active:scale-90 transition-transform"
        >
          <ArrowUp className="h-7 w-7" />
        </Button>
      </motion.div>
    </div>
  );
}
