import { useState } from 'react';
import { useShippingConfigs } from '../services/parcelService';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Truck, MapPin, ExternalLink, MessageCircle, Play, ChevronLeft, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

export default function ShippingView() {
  const { configs, loading } = useShippingConfigs();
  const [activeTab, setActiveTab] = useState<'selection' | 'online_purchase' | 'dropshipping'>('selection');

  const getConfig = (type: 'online_purchase' | 'dropshipping') => {
    return configs.find(c => c.type === type);
  };

  const openWhatsApp = (number?: string, message?: string) => {
    const finalNumber = number || "+50944813185";
    const finalMessage = message || (activeTab === 'online_purchase' ? "Bonjour, je suis intéressé par l'achat en ligne, pouvez-vous m'assister ?" : "Bonjour, je suis intéressé par le drop shipping.");
    
    // Remove all non-digit characters except possibly the + (though wa.me prefers just digits)
    const cleanNumber = finalNumber.replace(/\D/g, ''); 
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <AnimatePresence mode="wait">
        {activeTab === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Nos Solutions Shipping</h1>
              <p className="text-gray-500 max-w-xl mx-auto">Choisissez le service qui correspond le mieux à vos besoins logistiques.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="group border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer shadow-md overflow-hidden" onClick={() => setActiveTab('online_purchase')}>
                <div className="aspect-video bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <MapPin className="h-20 w-20 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Achat en ligne</CardTitle>
                  <CardDescription>
                    Recevez vos achats effectués sur Amazon, eBay et autres sites internationaux vers Haiti.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-blue-600 text-white group-hover:bg-blue-700">
                    Découvrir l'achat en ligne
                  </Button>
                </CardContent>
              </Card>

              <Card className="group border-2 border-transparent hover:border-amber-500 transition-all cursor-pointer shadow-md overflow-hidden" onClick={() => setActiveTab('dropshipping')}>
                <div className="aspect-video bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Truck className="h-20 w-20 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Drop Shipping</CardTitle>
                  <CardDescription>
                    Solutions logistiques complètes pour votre business en ligne.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-amber-600 text-white group-hover:bg-amber-700">
                    Découvrir le drop shipping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {(activeTab === 'online_purchase' || activeTab === 'dropshipping') && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('selection')} className="rounded-full">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h2 className="text-3xl font-bold text-gray-900">
                {activeTab === 'online_purchase' ? 'Achat en ligne' : 'Drop Shipping'}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Addresses Section */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <MapPin className={`h-6 w-6 ${activeTab === 'online_purchase' ? 'text-blue-600' : 'text-amber-600'}`} />
                      Adresses de réception
                    </h3>
                    <Badge variant="outline" className="px-3 py-1 font-mono">
                      {getConfig(activeTab)?.addresses?.length || 0} Adresses
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getConfig(activeTab)?.addresses?.map((addr, idx) => (
                      <Card key={addr.id} className={`relative overflow-hidden border-l-4 transition-all hover:shadow-lg ${
                        activeTab === 'online_purchase' ? 'border-l-blue-600 bg-blue-50/20' : 'border-l-amber-600 bg-amber-50/20'
                      }`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                          <span className="text-6xl font-black italic">{idx + 1}</span>
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Badge className={activeTab === 'online_purchase' ? 'bg-blue-600' : 'bg-amber-600'}>
                              {addr.city || 'Adresse'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-inner group">
                            <p className="font-mono text-sm text-gray-800 leading-relaxed break-words">
                              {addr.text}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider h-8 hover:bg-white border-t border-dashed mt-4 pt-4 rounded-none"
                              onClick={() => {
                                navigator.clipboard.writeText(addr.text);
                                toast.success('Adresse copiée !');
                              }}
                            >
                              Copier l'adresse
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {!getConfig(activeTab)?.addresses?.length && (
                      <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">Aucune adresse configurée pour le moment.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Videos Section */}
                <section className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Play className="h-5 w-5 text-red-600" />
                    Vidéos d'instruction
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getConfig(activeTab)?.videos?.map((video) => (
                      <Card key={video.id} className="overflow-hidden border-0 shadow-sm group">
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform z-20">
                            <Play className="h-6 w-6 text-white fill-white" />
                          </div>
                          <img 
                            src={`https://img.youtube.com/vi/${video.url.split('v=')[1]?.split('&')[0] || video.url.split('/').pop()}/maxresdefault.jpg`}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/instruction/400/225';
                            }}
                          />
                        </a>
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                        </div>
                      </Card>
                    ))}
                    {!getConfig(activeTab)?.videos?.length && <p className="text-gray-400 italic">Aucune vidéo disponible.</p>}
                  </div>
                </section>
              </div>

              {/* Sidebar Area */}
              <div className="space-y-8">
                {/* Websites Section */}
                {activeTab === 'online_purchase' && (
                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-purple-600" />
                      Sites recommandés
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {getConfig(activeTab)?.websites?.map((site) => (
                        <a 
                          key={site.id} 
                          href={site.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                        >
                          <span className="font-medium">{site.name}</span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                        </a>
                      ))}
                      {!getConfig(activeTab)?.websites?.length && <p className="text-gray-400 italic">Aucun site configuré.</p>}
                    </div>
                  </section>
                )}

                {/* WhatsApp Section */}
                <section className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl space-y-4">
                  <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Besoin d'assistance ?</h4>
                    <p className="text-blue-100 text-sm opacity-90">
                      Nos conseillers sont disponibles sur WhatsApp pour vous guider pas à pas.
                    </p>
                  </div>
                  <Button 
                    onClick={() => openWhatsApp(getConfig(activeTab)?.whatsappNumber, getConfig(activeTab)?.whatsappMessage)}
                    className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold h-12 shadow-md flex items-center justify-center gap-2"
                  >
                    Contacter via WhatsApp
                  </Button>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
