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
  ArrowUp
} from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useProducts, useGames, useCardTopups } from '../services/parcelService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Loader2 } from 'lucide-react';

const WHATSAPP_NUMBER = "+50944813185";

export default function HomeView({ onTrackingClick, onViewChange }: { onTrackingClick: () => void, onViewChange: (view: any) => void }) {
  const { products, loading: productsLoading } = useProducts();
  const { games, loading: gamesLoading } = useGames();
  const { cards, loading: cardsLoading } = useCardTopups();
  const [isGamesDialogOpen, setIsGamesDialogOpen] = React.useState(false);
  const [isCardsDialogOpen, setIsCardsDialogOpen] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const services = [
    {
      title: "Suivi de colis",
      description: "Suivez l'état de vos colis Neopay en temps réel.",
      icon: <Package className="h-8 w-8 text-blue-600" />,
      action: onTrackingClick,
      buttonText: "Suivre un colis",
      color: "bg-blue-50 border-blue-100"
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
      icon: <Truck className="h-8 w-8 text-amber-600" />,
      action: () => onViewChange('shipping'),
      buttonText: "Accéder au service",
      color: "bg-amber-50 border-amber-100"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-12 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 px-4 pt-4 pb-6 relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/30 blur-[120px] rounded-full -z-10" />
        
        <div className="space-y-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-wider uppercase mb-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Solution de paiement moderne
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]"
          >
            <motion.span
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="inline-block"
            >
              Bienvenue sur
            </motion.span>{" "}
            <motion.span
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="relative inline-block text-blue-600"
            >
              Neopay
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute -bottom-2 left-0 h-1.5 bg-blue-600/20 rounded-full"
              />
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Votre plateforme complète de services digitaux, logistique et bien plus encore.
          </motion.p>
        </div>
      </section>

      {/* Services Section */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Nos Services</h2>
          <div className="h-1 w-20 bg-blue-600 mx-auto mt-4 rounded-full" />
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
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Nos Produits / Services</h2>
          <div className="h-1 w-20 bg-blue-600 mx-auto mt-4 rounded-full" />
        </div>
        
        {productsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="mobile-product-card-wrapper"
              >
                <Card className="product-card overflow-hidden border-0 bg-white h-full flex flex-col pt-0">
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
                        onClick={() => openWhatsApp(product.whatsappMessage || `Bonjour, je suis intéressé par ce service Neopay : ${product.name}. Je souhaite passer commande.`)}
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
      <section className="bg-blue-600 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 rounded-full opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-700 rounded-full opacity-50 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold">Paiement et preuve</h2>
            <p className="text-blue-100 text-lg max-w-xl">
              Après avoir effectué votre paiement, veuillez envoyer une capture d'écran via WhatsApp pour validation.
            </p>
          </div>
          <Button 
            onClick={() => openWhatsApp("Bonjour, j'ai effectué mon paiement pour un service Neopay. Voici la preuve.")}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 h-14 text-lg font-bold rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition-all"
          >
            <CheckCircle2 className="h-6 w-6" />
            J'ai effectué mon paiement
          </Button>
        </div>
      </section>

      {/* Games Dialog */}
      <Dialog open={isGamesDialogOpen} onOpenChange={setIsGamesDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-purple-600" />
              Top-up Jeux
            </DialogTitle>
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
                                onClick={() => openWhatsApp(item.whatsappMessage || `Bonjour, je souhaite acheter le pack ${item.name} (${item.price}) pour le jeu ${game.name}.`)}
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-emerald-600" />
              Recharge Cartes
            </DialogTitle>
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
                        onClick={() => openWhatsApp(card.whatsappMessage || `Bonjour, je souhaite recharger ma carte via le service : ${card.name}.`)}
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0 }}
        className="fixed bottom-6 right-20 z-50 pointer-events-none"
      >
        <Button 
          onClick={scrollToTop}
          className="pointer-events-auto h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0"
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
    </div>
  );
}
