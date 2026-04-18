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
  ArrowUp
} from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useParcels, saveParcel, uploadProof, deleteParcel, useProducts, saveProduct, deleteProduct, useSettings, updateSettings, uploadLogo, useGames, saveGame, deleteGame } from '../services/parcelService';
import { useAllAffiliates, useAllWithdrawals, saveAffiliate, updateWithdrawalStatus, deleteAffiliate, useAllAffiliateRequests, updateAffiliateRequestStatus, resetMonthlyStats, awardMonthlyPrizes, clearMonthlyWinners, useMonthlyRankings, recordPurchase } from '../services/affiliateService';
import { Parcel, ParcelStatus, PaymentStatus, Product, AppSettings, Affiliate, WithdrawalRequest, AffiliateRequest, Game } from '../types';
import AdminShippingManager from './AdminShippingManager';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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

export default function AdminDashboard() {
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
  const { settings, loading: settingsLoading } = useSettings();
  const { affiliates, loading: affiliatesLoading } = useAllAffiliates();
  const { withdrawals: allWithdrawals, loading: allWithdrawalsLoading } = useAllWithdrawals();
  const { requests: affiliateRequests, loading: affiliateRequestsLoading } = useAllAffiliateRequests();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [parcelToDelete, setParcelToDelete] = useState<Parcel | null>(null);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  
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

  const [isAwarding, setIsAwarding] = useState(false);
  const [isClearingWinners, setIsClearingWinners] = useState(false);

  const [isAffiliateDialogOpen, setIsAffiliateDialogOpen] = useState(false);
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

  const handleOpenGameDialog = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setGameFormData({
        ...game,
        catalog: game.catalog || []
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
    setGameFormData({
      ...gameFormData,
      catalog: (gameFormData.catalog || []).filter(item => item.id !== id)
    });
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
      case 'Livré': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Arrivé': return <Package className="h-4 w-4 text-blue-500" />;
      case 'En transit': return <Truck className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Administration Neopay</h1>
        <p className="text-sm sm:text-base text-gray-500">Gérez les colis, les produits et les paramètres du site.</p>
      </div>

      <Tabs defaultValue="parcels" className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-white border p-1 rounded-xl h-auto flex flex-nowrap sm:flex-wrap gap-1 sm:gap-2 min-w-max sm:min-w-0">
            <TabsTrigger value="parcels" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Colis
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Produits / Services
            </TabsTrigger>
            <TabsTrigger value="games" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Gamepad2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Top-up Jeux
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap relative">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Affiliés
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {totalPending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap relative">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Notifications
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {totalPending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Paramètres
            </TabsTrigger>
            <TabsTrigger value="shipping" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-3 sm:px-4 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Shipping
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="parcels" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold">Gestion des Colis</h2>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Colis
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 uppercase">Total Colis</p>
                    <p className="text-3xl font-bold text-blue-900">{parcels.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 uppercase">En Transit</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {parcels.filter(p => p.status === 'En transit' || p.status === 'En route').length}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-amber-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 uppercase">Livrés</p>
                    <p className="text-3xl font-bold text-green-900">
                      {parcels.filter(p => p.status === 'Livré').length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-300" />
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
                          <TableCell className="font-mono font-medium text-blue-600">
                            {parcel.trackingNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
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
            <h2 className="text-xl font-bold">Gestion des Produits / Services</h2>
            <Button onClick={() => handleOpenProductDialog()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
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
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                              {product.price}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            {product.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenProductDialog(product)}>
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setProductToDelete(product);
                                setIsProductDeleteDialogOpen(true);
                              }}>
                                <Trash2 className="h-4 w-4 text-red-500" />
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
            <h2 className="text-xl font-bold">Gestion des Jeux (Top-up)</h2>
            <Button onClick={() => handleOpenGameDialog()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
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
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              {game.priceRange}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            {game.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenGameDialog(game)}>
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setGameToDelete(game);
                                setIsGameDeleteDialogOpen(true);
                              }}>
                                <Trash2 className="h-4 w-4 text-red-500" />
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

        <TabsContent value="affiliates" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold">Gestion des Affiliés</h2>
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
            }} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Nouvel Affilié
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 uppercase">Total Affiliés</p>
                    <p className="text-3xl font-bold text-blue-900">{affiliates.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 uppercase">Total à Payer</p>
                    <p className="text-3xl font-bold text-green-900">{totalAffiliateBalance} Goud</p>
                  </div>
                  <Wallet className="h-8 w-8 text-green-300" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 uppercase">Points Totaux</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {affiliates.reduce((sum, a) => sum + (a.points || 0), 0)}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-amber-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="text-lg font-semibold">Liste des Affiliés</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {affiliatesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>Chargement des affiliés...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
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
                          {affiliates.map((a) => (
                            <TableRow key={a.id} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium">{a.name}</TableCell>
                              <TableCell className="font-mono text-xs">{a.code}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-bold uppercase text-[10px]">
                                  {a.level || 'Bronze'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-blue-600">{a.balance} Goud</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit">
                                    {a.points || 0} pts
                                  </Badge>
                                  {a.isMonthlyWinner && (
                                    <Badge 
                                      className="bg-green-100 text-green-700 border-green-200 text-[9px] w-fit cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                      onClick={() => handleToggleWinnerStatus(a)}
                                      title="Cliquez pour retirer du classement"
                                    >
                                      Gagnant Approuvé
                                    </Badge>
                                  )}
                                  {!a.isMonthlyWinner && (a.points || 0) > 0 && (
                                    <Badge 
                                      className="bg-gray-100 text-gray-600 border-gray-200 text-[9px] w-fit cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
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
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingAffiliate(a);
                                    setAffiliateFormData(a);
                                    setIsAffiliateDialogOpen(true);
                                  }}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => {
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
                          {affiliates.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                                Aucun affilié trouvé.
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
              <Card className="shadow-sm border-amber-200 bg-amber-50/20">
                <CardHeader className="border-b border-amber-100 bg-amber-50/50">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
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
                        <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white border border-amber-100 shadow-sm gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-amber-500 text-white' : 
                              idx === 1 ? 'bg-gray-400 text-white' : 
                              'bg-orange-500 text-white'
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
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-2"
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

              <Card className="shadow-sm border-blue-200 bg-blue-50/30">
                <CardHeader className="border-b border-blue-100 bg-blue-50/50">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    Classement Officiel Actuel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-[10px] text-gray-500 italic mb-2">
                    Voici ce que les affiliés voient actuellement comme classement officiel.
                  </p>
                  {officialRankingsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  ) : officialRankings.length > 0 ? (
                    <div className="space-y-3">
                      {officialRankings.map((w, idx) => (
                        <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0 ? 'bg-amber-500 text-white' : 
                              idx === 1 ? 'bg-gray-400 text-white' : 
                              'bg-orange-500 text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{w.name}</p>
                              <p className="text-[10px] text-gray-500">{w.points} points</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            Officiel
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 border border-dashed border-blue-200 rounded-lg bg-white/50">
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
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
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
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : affiliateRequests.filter(r => r.status === 'pending').length > 0 ? (
                    affiliateRequests.filter(r => r.status === 'pending').map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border bg-blue-50/30 border-blue-100 space-y-3">
                        <div className="flex flex-col xs:flex-row justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-blue-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-500 truncate">{r.email}</p>
                            <p className="text-xs text-gray-500">{r.phone}</p>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 shrink-0">Nouveau</Badge>
                        </div>
                        {r.message && (
                          <p className="text-xs text-gray-600 bg-white p-2 rounded border italic">
                            "{r.message}"
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 h-8"
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
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : allWithdrawals.filter(w => w.status === 'pending').length > 0 ? (
                    allWithdrawals.filter(w => w.status === 'pending').map((w) => (
                      <div key={w.id} className="p-4 rounded-xl border bg-gray-50 space-y-3">
                        <div className="flex flex-col xs:flex-row justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold truncate">{w.affiliateName}</p>
                            <p className="text-xs text-gray-500">Code: {w.affiliateCode}</p>
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                              <p className="text-[10px] uppercase font-bold text-blue-400">Compte de Paiement</p>
                              <p className="text-sm font-bold text-blue-700 break-all">
                                {w.method}: {w.accountNumber}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 shrink-0">{w.amount} Goud</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Wallet className="h-3 w-3" />
                          <span>{w.method}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700 h-8"
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
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
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
                          req.type === 'registration' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {req.type === 'registration' ? <Users className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 truncate">{req.name}</p>
                            <Badge variant="outline" className={
                              req.type === 'registration' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
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
                              <span className="font-bold text-blue-600">{(req as any).amount} Goud</span>
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
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
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
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-300" 
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
                      className="bg-blue-600 w-full sm:w-auto"
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
      </Tabs>

      {/* Record Sale Dialog */}
      <Dialog open={isRecordSaleDialogOpen} onOpenChange={setIsRecordSaleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
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
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700">
                L'affilié recevra la commission directe et les points correspondants. 
                Si l'affilié a un parrain, celui-ci recevra 0.5 Goud de commission indirecte.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordSaleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRecordSale} disabled={isRecordingSale} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isRecordingSale ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmer la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affiliate Edit/Add Dialog */}
      <Dialog open={isAffiliateDialogOpen} onOpenChange={setIsAffiliateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingAffiliate ? 'Modifier l\'affilié' : 'Nouvel affilié'}</DialogTitle>
            <DialogDescription>
              Gérez les identifiants et les informations de l'affilié.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                className="sm:col-span-3 border-amber-200 focus:ring-amber-500" 
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAffiliateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveAffiliate} disabled={isSaving} className="bg-blue-600">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription>Ajoutez un service ou un produit dynamique à votre plateforme.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-sm">Nom</Label>
              <Input 
                value={productFormData.name} 
                onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                className="sm:col-span-3" 
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
                  className="bg-blue-600 w-full sm:w-auto"
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
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveProduct} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingGame ? 'Modifier le jeu' : 'Nouveau jeu'}</DialogTitle>
            <DialogDescription>Ajoutez un jeu pour le service de Top-up.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="sm:text-right text-sm">Nom</Label>
              <Input 
                value={gameFormData.name} 
                onChange={(e) => setGameFormData({...gameFormData, name: e.target.value})}
                className="sm:col-span-3" 
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
                  className="bg-blue-600 w-full sm:w-auto"
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
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-purple-600" />
                  Catalogue de prix
                </Label>
                <Button variant="ghost" size="sm" onClick={addCatalogItem} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un pack
                </Button>
              </div>
              
              <div className="space-y-3 md:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar overscroll-contain">
                {gameFormData.catalog?.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl border bg-gray-50 space-y-3 relative group transition-all hover:border-purple-200">
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
                      onClick={() => removeCatalogItem(item.id)}
                      className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {(!gameFormData.catalog || gameFormData.catalog.length === 0) && (
                  <div className="text-center py-6 border-2 border-dashed rounded-xl text-gray-400 text-sm">
                    Aucun pack défini. Le bouton "Commander" utilisera le message par défaut du jeu.
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGameDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveGame} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
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
                  className="bg-blue-600 w-full sm:w-auto"
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
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300" 
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
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
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
          className="pointer-events-auto h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}
