import React from 'react';
import { motion } from 'motion/react';
import { Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';

interface AccessChoiceProps {
  onChoice: (choice: 'affiliate' | 'admin') => void;
}

export default function AccessChoice({ onChoice }: AccessChoiceProps) {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Affiliate / Agent Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            onClick={() => onChoice('affiliate')}
            className="group relative h-full overflow-hidden border-0 shadow-xl rounded-[2.5rem] cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
            <div className="p-8 sm:p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-dark mb-3">Espace Affilié / Agent</h3>
              <p className="text-gray-500 font-medium mb-8">
                Accédez à votre tableau de bord, gérez vos clients, dépôts, retraits et commissions.
              </p>
              <div className="flex items-center gap-2 text-primary font-black uppercase text-sm tracking-widest group-hover:gap-4 transition-all mt-auto">
                Se Connecter <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          </Card>
        </motion.div>

        {/* Admin Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            onClick={() => onChoice('admin')}
            className="group relative h-full overflow-hidden border-0 shadow-xl rounded-[2.5rem] cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-dark"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
            <div className="p-8 sm:p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Administration</h3>
              <p className="text-gray-400 font-medium mb-8">
                Configuration système, gestion des comptes et surveillance des flux.
              </p>
              <div className="flex items-center gap-2 text-accent font-black uppercase text-sm tracking-widest group-hover:gap-4 transition-all mt-auto">
                Panneau Admin <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
