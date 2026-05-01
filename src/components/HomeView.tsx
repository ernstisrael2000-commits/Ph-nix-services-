import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  CreditCard, 
  Gamepad2, 
  Truck, 
  MessageCircle, 
  ArrowRight,
  CheckCircle2,
  Info,
  ArrowUp,
  HelpCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useProducts, useGames, useCardTopups, useSliderImages, useNavButtons, useSettings } from '../services/parcelService';
import { AnimatePresence } from 'motion/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Loader2, ShieldCheck, Zap, Star, Headphones, QrCode, Wallet, Smartphone, Landmark, X } from 'lucide-react';

const WHATSAPP_NUMBER = "+50944813185";

const LucideIcon = ({ name, className, color }: { name: string, className?: string, color?: string }) => {
  const Icon = (LucideIcons as any)[name] || HelpCircle;
  return <Icon className={className} style={{ color }} />;
};

const SLIDER_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop", // Fintech/Crypto abstract
  "https://images.unsplash.com/photo-1614850523296-62c09279446a?q=80&w=2070&auto=format&fit=crop", // Abstract gradients
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop", // Tech/Security
];

export default function HomeView({ onTrackingClick, onViewChange }: { onTrackingClick: () => void, onViewChange: (view: any) => void }) {
  const { products, loading: productsLoading } = useProducts();
  const { games, loading: gamesLoading } = useGames();
  const { cards, loading: cardsLoading } = useCardTopups();
  const { sliderImages, loading: sliderLoading } = useSliderImages();
  const { buttons, loading: buttonsLoading } = useNavButtons();
  const { settings } = useSettings();
  const [isGamesDialogOpen, setIsGamesDialogOpen] = React.useState(false);
  const [isCardsDialogOpen, setIsCardsDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Card Recharge States
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [selectedCardForRecharge, setSelectedCardForRecharge] = useState<any>(null);
  const [rechargeAmountUSD, setRechargeAmountUSD] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ name: string, price: string, type: string } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'moncash' | 'natcash' | 'admi' | null>('moncash');
  const [paymentTransactionInfo, setPaymentTransactionInfo] = useState('');

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setSelectedPlan(product.plans && product.plans.length > 0 ? product.plans[0] : null);
    setIsProductDetailOpen(true);
  };

  const handleCardClick = (card: any) => {
    setSelectedCardForRecharge(card);
    setRechargeAmountUSD(card.presets && card.presets.length > 0 ? card.presets[0].toString() : '');
    setIsRechargeDialogOpen(true);
  };

  const handleBuyRequested = (item: { name: string, price: string, type: string }) => {
    setPaymentTarget(item);
    setIsPaymentModalOpen(true);
    setSelectedPaymentMethod('moncash');
  };

  const handleFinalPaymentSubmit = () => {
    if (!paymentTarget || !selectedPaymentMethod) return;

    const methodLabel = selectedPaymentMethod === 'moncash' ? 'Mon Cash' : selectedPaymentMethod === 'natcash' ? 'Natcash' : 'Admi';
    const message = `Bonjour Neopay,\n\nJe souhaite commander :\n📦 *${paymentTarget.name}*\n💰 Prix : *${paymentTarget.price}*\n\n💳 Mode de paiement : *${methodLabel}*\n📝 Infos Transaction : *${paymentTransactionInfo || 'Non fournie'}*\n\nMerci de valider ma commande.`;
    
    openWhatsApp(message);
    setIsPaymentModalOpen(false);
    setPaymentTransactionInfo('');
  };

  const handleRechargeSubmit = () => {
    if (!selectedCardForRecharge || !rechargeAmountUSD) return;
    setIsRechargeDialogOpen(false);
    setIsPaymentMethodDialogOpen(true);
  };

  const handleFinalRechargePayment = (method: string) => {
    if (!selectedCardForRecharge || !rechargeAmountUSD) return;
    
    const usd = parseFloat(rechargeAmountUSD);
    const gold = usd * (selectedCardForRecharge.goldRate || 1);
    const gourdes = usd * (settings?.exchangeRate || 146);
    
    const message = `Bonjour Neopay,\n\nJe souhaite recharger ma carte :\n👤 Client : *${customerName || 'Non spécifié'}*\n💳 Carte : *${selectedCardForRecharge.name}*\n💵 Montant USD : *${usd}$*\n💰 Équivalent Gold : *${gold} Gold*\n🇭🇹 Montant en Gourdes : *${gourdes.toLocaleString()} HTG*\n\n💳 Moyen de paiement : *${method}*\n\nMerci de valider ma recharge.`;
    
    openWhatsApp(message);
    setIsPaymentMethodDialogOpen(false);
    setRechargeAmountUSD('');
    setCustomerName('');
    setSelectedCardForRecharge(null);
  };
  
  const servicesRef = useRef<HTMLElement>(null);

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  const imagesToDisplay = sliderImages.length > 0 
    ? sliderImages.map(img => ({ url: img.url, title: img.title || 'Neopay', description: img.description || '' }))
    : SLIDER_IMAGES.map(url => ({ url, title: 'Neopay', description: 'Digital Services & Gift Cards' }));

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-play slider
  useEffect(() => {
    if (imagesToDisplay.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % imagesToDisplay.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, [imagesToDisplay.length]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const resolveRedirection = (btn: any) => {
    const target = btn.targetUrl?.trim();
    const instruction = btn.redirectionInstruction?.toLowerCase() || '';

    // If there's an explicit target, prioritize it
    if (target) {
      if (target.startsWith('#')) {
        const el = document.getElementById(target.substring(1));
        el?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (['tracking', 'shipping', 'affiliate'].includes(target)) {
        onViewChange(target);
        return;
      }
      // Check for common names in instruction if target is not a URL
      if (!target.includes('.') && !target.startsWith('/')) {
        const el = document.getElementById(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.location.href = target;
      return;
    }

    // Try to resolve based on instruction if target is empty
    if (instruction) {
      if (instruction.includes('jeu')) {
        setIsGamesDialogOpen(true);
        return;
      }
      if (instruction.includes('carte') || instruction.includes('recharge')) {
        setIsCardsDialogOpen(true);
        return;
      }
      if (instruction.includes('suivi') || instruction.includes('colis')) {
        onViewChange('tracking');
        return;
      }
      if (instruction.includes('shipping') || instruction.includes('envoi')) {
        onViewChange('shipping');
        return;
      }
      if (instruction.includes('service')) {
        servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  };

  const services = [
    {
      title: "Suivi de colis",
      description: "Suivez l'état de vos colis Neopay en temps réel.",
      icon: <Package className="h-8 w-8 text-primary" />,
      action: onTrackingClick,
      buttonText: "Suivre un colis",
      color: "bg-accent-light border-accent-light/50"
    },
    {
      title: "Recharge carte",
      description: "Rechargez vos cartes de crédit ou prépayées rapidement.",
      icon: <CreditCard className="h-8 w-8 text-emerald-600" />,
      action: () => setIsCardsDialogOpen(true),
      buttonText: "Voir les cartes",
      color: "bg-emerald-50 border-emerald-100"
    },
    {
      title: "Top-up jeux",
      description: "Créditez vos comptes de jeux préférés instantanément.",
      icon: <Gamepad2 className="h-8 w-8 text-purple-600" />,
      action: () => setIsGamesDialogOpen(true),
      buttonText: "Voir les jeux",
      color: "bg-purple-50 border-purple-100"
    },
    {
      title: "Shipping",
      description: "Service global d'envoi et de réception de colis.",
      icon: <Truck className="h-8 w-8 text-primary" />,
      action: () => onViewChange('shipping'),
      buttonText: "Accéder au service",
      color: "bg-accent-light border-accent-light/50"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-12 space-y-8">
      {/* Premium Hero Slider Section */}
      <section className="relative h-[220px] md:h-[300px] w-full rounded-[40px] overflow-hidden bg-black shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] group border border-white/10">
        {/* Slider Track */}
        <div className="absolute inset-0 w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full will-change-transform"
            >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[6000ms] ease-linear scale-100 group-hover:scale-105"
                  style={{ backgroundImage: `url(${imagesToDisplay[currentSlide]?.url || ''})` }}
                />
              {/* Overlay Gradients - Enhanced for top/bottom text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
              <div className="absolute inset-0 bg-black/10" />

              {/* Content Overlay - Distributed Layout */}
              <div className="relative z-10 h-full flex flex-col justify-between items-center py-8 md:py-10 px-6 text-center w-full max-w-7xl mx-auto">
                {/* Top Section: Stylish Centered Title */}
                <motion.div
                  initial={{ opacity: 0, y: -20, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  className="w-full"
                >
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.6)] uppercase italic leading-[1]">
                    <span className="bg-gradient-to-br from-primary/60 via-white to-primary bg-clip-text text-transparent">
                      {imagesToDisplay[currentSlide]?.title || 'Neopay'}
                    </span>
                  </h1>
                </motion.div>

                {/* Bottom Section: Description & Action */}
                <div className="w-full flex flex-col items-center space-y-6 md:space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                    className="max-w-2xl"
                  >
                    <h2 className="text-sm md:text-xl font-medium text-white/95 leading-tight drop-shadow-md">
                      {imagesToDisplay[currentSlide]?.description || 'Services Digitaux & Recharges'}
                    </h2>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="pb-4"
                  >
                    <Button 
                      size="lg"
                      onClick={scrollToServices}
                      className="bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all rounded-full h-10 md:h-12 px-6 md:px-8 text-xs md:text-sm font-bold shadow-2xl group"
                    >
                      Explorer nos services
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slider Navigation Dots */}
        <div className="absolute bottom-4 right-6 z-20 flex gap-2">
          {imagesToDisplay.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 transition-all duration-300 rounded-full ${
                  currentSlide === i ? 'bg-primary w-8' : 'bg-white/30 w-3 hover:bg-white/50'
                }`}
              />
          ))}
        </div>
      </section>

      {/* Quick Navigation Category Bar */}
      {!buttonsLoading && buttons.length > 0 ? (
        <div className="w-full overflow-hidden pt-2">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 px-1 custom-scrollbar scroll-smooth">
            {buttons.map((btn) => (
              <Button
                key={btn.id}
                variant="ghost"
                className="flex-shrink-0 bg-white border border-gray-100 rounded-[16px] px-6 h-[54px] shadow-sm hover:bg-accent-light/50 hover:-translate-y-0.5 transition-all group"
                onClick={() => resolveRedirection(btn)}
              >
                <div className="flex items-center gap-2">
                  <LucideIcon 
                    name={btn.iconName} 
                    className="h-5 w-5 transition-colors group-hover:text-primary" 
                    color={btn.color || '#F5A623'} 
                  />
                  <span 
                    className="font-heading font-bold text-sm md:text-base transition-colors group-hover:text-primary"
                    style={{ color: btn.color || '#F5A623' }}
                  >
                    {btn.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ) : buttonsLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[54px] w-32 bg-gray-100 animate-pulse rounded-[16px] flex-shrink-0" />
          ))}
        </div>
      ) : null}

      {/* Services Section */}
      <section ref={servicesRef} id="services" className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark">Nos Services</h2>
          <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`${service.color} border-2 hover:shadow-lg transition-all group h-full flex flex-col`}>
                <CardHeader>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button 
                    onClick={service.action}
                    className="w-full bg-white text-gray-900 border-2 border-transparent hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
                  >
                    {service.buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dynamic Products Section */}
      <section id="products" className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark">Nos Produits / Services</h2>
          <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
        </div>
        
        {productsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="mobile-product-card-wrapper cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <Card className="product-card overflow-hidden border-0 bg-white h-full flex flex-col pt-0 hover:shadow-xl transition-shadow">
                  <div className="aspect-[16/10] relative overflow-hidden bg-gray-50">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="product-image w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/neopay/400/400';
                      }}
                    />
                  </div>
                  <div className="product-card-content">
                    <div className="mb-2">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-subtitle truncate">Livraison rapide / Neopay</p>
                    </div>
                    
                    <div className="product-footer">
                      <span className="product-price">{product.price}</span>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyRequested({ name: product.name, price: product.price, type: 'product' });
                        }}
                        className="product-buy-button"
                      >
                        ⚡ Acheter
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun produit ou service supplémentaire disponible pour le moment.</p>
          </div>
        )}
      </section>

      {/* Payment Proof Section */}
      <section id="payment" className="bg-primary rounded-[2rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#D98A1E] rounded-full opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-[#D98A1E] rounded-full opacity-50 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold">Paiement et preuve</h2>
            <p className="text-accent-light text-lg max-w-xl">
              Après avoir effectué votre paiement, veuillez envoyer une capture d'écran via WhatsApp pour validation.
            </p>
          </div>
          <Button 
            onClick={() => openWhatsApp("Bonjour, j'ai effectué mon paiement pour un service Neopay. Voici la preuve.")}
            className="bg-white text-primary hover:bg-accent-light px-8 h-14 text-lg font-bold rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition-all"
          >
            <CheckCircle2 className="h-6 w-6" />
            J'ai effectué mon paiement
          </Button>
        </div>
      </section>

      {/* Games Dialog */}
      <Dialog open={isGamesDialogOpen} onOpenChange={setIsGamesDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto relative">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-purple-600" />
                Top-up Jeux
              </DialogTitle>
              <DialogClose className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors">
                <LucideIcons.X className="h-5 w-5 text-gray-500" />
              </DialogClose>
            </div>
            <DialogDescription>
              Choisissez votre jeu préféré pour effectuer une recharge.
            </DialogDescription>
          </DialogHeader>
          
          {gamesLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
            </div>
          ) : games.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {games.map((game) => (
                <Card key={game.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow pt-0">
                  <div className="aspect-[16/10] relative bg-gray-50">
                    <img 
                      src={game.image} 
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/game/400/400';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-600">{game.priceRange}</Badge>
                    </div>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">{game.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {game.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Catalog Section */}
                    {game.catalog && game.catalog.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catalogue de prix</p>
                        <div className="grid grid-cols-1 gap-2 md:max-h-[160px] md:overflow-y-auto pr-1 custom-scrollbar">
                          {game.catalog.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-purple-200 transition-colors group">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-purple-600 font-bold">{item.price}</p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleBuyRequested({ name: `${game.name} - ${item.name}`, price: item.price, type: 'game' })}
                                className="h-8 px-4 text-[10px] font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-md rounded-full transition-all active:scale-95 border-0"
                              >
                                Commander
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => openWhatsApp(game.whatsappMessage || `Bonjour, je souhaite faire un top-up pour le jeu : ${game.name}.`)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm h-9"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Commander
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Aucun jeu disponible pour le moment.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Cards Dialog */}
      <Dialog open={isCardsDialogOpen} onOpenChange={setIsCardsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto relative">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-emerald-600" />
                Recharge Cartes
              </DialogTitle>
              <DialogClose className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors">
                <LucideIcons.X className="h-5 w-5 text-gray-500" />
              </DialogClose>
            </div>
            <DialogDescription>
              Choisissez une carte pour recharger votre compte.
            </DialogDescription>
          </DialogHeader>
          
          {cardsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          ) : cards.length > 0 ? (
            <div className="product-grid grid grid-cols-2 sm:grid-cols-2 gap-2 py-4">
              {cards.map((card) => (
                <Card key={card.id} className="product-card overflow-hidden border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full pt-0">
                  <div className="aspect-[16/10] relative bg-gray-50">
                    <img 
                      src={card.image} 
                      alt={card.name}
                      className="product-image w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/card/400/400';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-600 text-[10px] h-5 px-1.5">{card.price}</Badge>
                    </div>
                  </div>
                  <div className="product-card-content p-2 flex-grow flex flex-col">
                    <div className="mb-1">
                      <h3 className="product-name line-clamp-1">{card.name}</h3>
                      <p className="product-subtitle truncate">Activation instantanée</p>
                    </div>
                    
                    <div className="product-footer mt-auto pt-2">
                      <Button 
                        size="sm"
                        onClick={() => handleCardClick(card)}
                        className="product-buy-button w-full justify-center text-[10px] py-1 h-7"
                      >
                        ⚡ Recharger
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Aucune carte disponible pour le moment.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Product Detail Dialog */}
      <Dialog open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
        <DialogContent className="w-[94%] sm:max-w-[500px] rounded-[1.5rem] sm:rounded-[2rem] overflow-y-auto max-h-[92vh] p-0 gap-0 border-0 shadow-2xl custom-scrollbar relative">
          <DialogClose className="absolute top-4 left-4 z-20 rounded-full bg-black/40 backdrop-blur-md p-2 hover:bg-black/60 transition-colors text-white">
            <LucideIcons.X className="h-5 w-5" />
          </DialogClose>
          {selectedProduct && (
            <div className="flex flex-col">
              <div className="relative aspect-video">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-white text-lg font-black px-4 py-1 rounded-full shadow-lg">
                    {selectedPlan ? selectedPlan.price : selectedProduct.price}
                  </Badge>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-dark leading-tight">{selectedProduct.name}</h2>
                  <p className="text-gray-400 font-medium">Service Premium • Neopay Digital</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent-light/30 border border-primary/10">
                    < LucideIcons.Info className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-dark font-medium leading-relaxed">
                      {selectedProduct.description || "Profitez de ce service exceptionnel avec Neopay. Qualité garantie et livraison ultra-rapide."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-2">
                      <LucideIcons.Clock className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Livraison <br/>24/7</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-2">
                       <LucideIcons.ShieldCheck className="h-4 w-4 text-primary" />
                       <span className="text-[10px] font-bold text-gray-500 uppercase">Paiement <br/>Sécurisé</span>
                    </div>
                  </div>

                  {selectedProduct.plans && selectedProduct.plans.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Choissisez votre plan</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.plans.map((plan: any) => (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                              selectedPlan?.id === plan.id 
                                ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPlan?.id === plan.id ? 'border-primary' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                {selectedPlan?.id === plan.id && (
                                  <motion.div 
                                    layoutId="plan-indicator"
                                    className="h-2.5 w-2.5 rounded-full bg-primary" 
                                  />
                                )}
                              </div>
                              <span className={`font-bold transition-colors ${selectedPlan?.id === plan.id ? 'text-primary' : 'text-dark'}`}>{plan.name}</span>
                            </div>
                            <span className={`font-black tracking-tight transition-colors ${selectedPlan?.id === plan.id ? 'text-primary' : 'text-gray-400'}`}>{plan.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => handleBuyRequested({ 
                    name: selectedPlan ? `${selectedProduct.name} (${selectedPlan.name})` : selectedProduct.name, 
                    price: selectedPlan ? selectedPlan.price : selectedProduct.price, 
                    type: 'product' 
                  })}
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-[#D98A1E] text-white font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <LucideIcons.CreditCard className="h-6 w-6" />
                  Payer maintenant
                </Button>
                
                <p className="text-center text-[10px] text-gray-400 font-medium italic">
                  *Un agent vous répondra instantanément sur WhatsApp
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0 }}
        className="fixed bottom-6 right-20 z-50 pointer-events-none"
      >
        <Button 
          onClick={scrollToTop}
          className="pointer-events-auto h-12 w-12 rounded-full bg-primary hover:bg-[#D98A1E] text-white shadow-xl flex items-center justify-center p-0"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Floating Chat Button */}
      <div className="floating-chat-button-container">
        <Button
          onClick={() => openWhatsApp("Bonjour Neopay, je souhaite avoir plus de renseignements.")}
          className="floating-chat-button"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-[94%] sm:max-w-[450px] p-0 overflow-y-auto max-h-[92vh] border-0 bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl custom-scrollbar relative">
          <div className="bg-primary p-6 text-white sticky top-0 z-10">
            <DialogHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                     <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Finaliser Paiement</DialogTitle>
                    <DialogDescription className="text-white/70 text-xs font-bold uppercase tracking-widest">Paiement Sécurisé Neopay</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>

            {paymentTarget && (
              <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Commande</p>
                <p className="text-lg font-bold truncate">{paymentTarget.name}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-white/60">Total à payer</span>
                  <span className="text-2xl font-black text-white">{paymentTarget.price}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Choisir le mode de paiement</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'moncash', label: 'Mon Cash', icon: Smartphone, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { id: 'natcash', label: 'Natcash', icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { id: 'admi', label: 'Admi', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      selectedPaymentMethod === method.id 
                        ? `${method.border} ${method.bg} shadow-md scale-105` 
                        : 'border-gray-50 bg-gray-50/50 grayscale hover:grayscale-0 hover:border-gray-100'
                    }`}
                  >
                    <method.icon className={`h-6 w-6 ${method.color} mb-1`} />
                    <span className="text-[10px] font-black uppercase text-dark">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedPaymentMethod && (
                <motion.div
                  key={selectedPaymentMethod}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 rounded-[2rem] bg-gray-50 border border-gray-100 space-y-4 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Infos de Paiement</p>
                    <Badge variant="outline" className="text-[10px] font-black bg-white">{selectedPaymentMethod.toUpperCase()}</Badge>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="space-y-1">
                      <p className="text-gray-400 text-[10px] font-bold uppercase">Numéro de réception</p>
                      <p className="text-2xl font-black text-dark tracking-tighter">
                        {selectedPaymentMethod === 'moncash' ? (settings?.moncashNumber || 'Précisé sur WhatsApp') : 
                         selectedPaymentMethod === 'natcash' ? (settings?.natcashNumber || 'Précisé sur WhatsApp') : 
                         (settings?.admiNumber || 'Précisé sur WhatsApp')}
                      </p>
                    </div>

                    {(settings?.[`${selectedPaymentMethod}QR` as keyof typeof settings]) && (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-hover:bg-primary/10 transition-colors" />
                        <Card className="relative p-2 rounded-2xl border-2 border-white shadow-xl bg-white">
                          <img 
                            src={settings[`${selectedPaymentMethod}QR` as keyof typeof settings] as string} 
                            alt="QR Code" 
                            className="h-24 w-24 object-contain"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1 rounded-lg">
                            <QrCode className="h-4 w-4" />
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails de votre transaction</Label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input 
                  placeholder="ID Transaction, Nom ou Numéro de l'expéditeur" 
                  value={paymentTransactionInfo}
                  onChange={(e) => setPaymentTransactionInfo(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-gray-100 focus:ring-primary/20 bg-gray-50/50 font-bold"
                />
              </div>
              <p className="text-[9px] text-gray-400 italic px-2 text-center">
                Veuillez saisir les informations permettant d'identifier votre transfert pour une validation immédiate.
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 sm:flex-col gap-3">
            <Button 
               onClick={handleFinalPaymentSubmit}
               disabled={!paymentTransactionInfo.trim()}
               className="w-full h-14 rounded-2xl bg-primary hover:bg-[#D98A1E] text-white font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
            >
               Envoyer et Payer
               <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              En cliquant, vous serez redirigé vers WhatsApp pour finaliser
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Recharge - Step 1: Details */}
      <Dialog open={isRechargeDialogOpen} onOpenChange={setIsRechargeDialogOpen}>
        <DialogContent className="w-[94%] sm:max-w-[450px] p-0 overflow-hidden border-0 bg-white rounded-[2rem] shadow-2xl relative">
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <CreditCard className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Recharge de Carte</DialogTitle>
                    <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-widest">Étape 1: Configuration</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>

            {selectedCardForRecharge && (
              <div className="mt-4 p-5 rounded-[1.5rem] bg-black/20 border border-white/10 backdrop-blur-sm flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={selectedCardForRecharge.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Carte sélectionnée</p>
                  <p className="text-lg font-bold leading-tight">{selectedCardForRecharge.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identifiant ou Nom complet</Label>
              <div className="relative">
                <LucideIcons.User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <Input 
                  placeholder="Votre nom ou ID Wallet"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-gray-100 focus:ring-emerald-500/20 bg-gray-50/50 font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Définir le montant (USD)</Label>
              
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600">$</div>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={rechargeAmountUSD}
                  onChange={(e) => setRechargeAmountUSD(e.target.value)}
                  className="pl-12 h-16 text-2xl font-black rounded-2xl border-gray-100 focus:ring-emerald-500/20 bg-gray-50/50"
                />
              </div>

              {selectedCardForRecharge?.presets && selectedCardForRecharge.presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCardForRecharge.presets.map((val: number) => (
                    <button
                      key={val}
                      onClick={() => setRechargeAmountUSD(val.toString())}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        rechargeAmountUSD === val.toString()
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center space-y-1">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valeur en Gold</p>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-600 fill-emerald-600" />
                <span className="text-3xl font-black text-emerald-950">
                  {rechargeAmountUSD ? (parseFloat(rechargeAmountUSD) * (selectedCardForRecharge?.goldRate || 1)).toLocaleString() : '0'} Gold
                </span>
              </div>
              <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-tighter">
                Taux: 1$ = {selectedCardForRecharge?.goldRate || 1} Gold
              </p>
            </div>

            <Button
              onClick={handleRechargeSubmit}
              disabled={!rechargeAmountUSD || parseFloat(rechargeAmountUSD) <= 0 || !customerName.trim()}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              Recharger maintenant
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Recharge - Step 2: Payment Method */}
      <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
        <DialogContent className="w-[94%] sm:max-w-[450px] p-0 overflow-hidden border-0 bg-white rounded-[2rem] shadow-2xl relative">
          <div className="bg-emerald-800 p-8 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Moyen de Paiement</DialogTitle>
                    <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-widest">Étape 2: Choisir votre mode</DialogDescription>
                  </div>
                </div>
                <DialogClose className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                  <LucideIcons.X className="h-5 w-5 text-white" />
                </DialogClose>
              </div>
            </DialogHeader>
            
            <div className="mt-4 p-5 rounded-[1.5rem] bg-white/10 border border-white/10">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-bold text-white/60 uppercase">Montant total</span>
                 <span className="text-2xl font-black text-white">${rechargeAmountUSD} USD</span>
               </div>
               <div className="flex justify-between items-center text-emerald-100">
                 <span className="text-[10px] font-bold uppercase">Estimation Gourdes</span>
                 <span className="text-sm font-bold">≈ {(parseFloat(rechargeAmountUSD || '0') * (settings?.exchangeRate || 146)).toLocaleString()} HTG</span>
               </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'MonCash', icon: Smartphone, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                { id: 'NatCash', icon: Smartphone, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                { id: 'Admi', icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => handleFinalRechargePayment(method.id)}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${method.bg} ${method.border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${method.color}`}>
                      <method.icon className="h-6 w-6" />
                    </div>
                    <span className="text-lg font-black text-dark uppercase">{method.id}</span>
                  </div>
                  <ArrowRight className={`h-6 w-6 ${method.color}`} />
                </button>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Cliquez pour confirmer et être redirigé vers WhatsApp
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
