import { motion } from 'motion/react';
import RenaLogo from './RenaLogo';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Initialisation de Rena...' }: LoadingScreenProps) {
  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-6">

        {/* Animated logo */}
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', width: 120, height: 120, top: -12, left: -12 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <RenaLogo size={96} />
        </div>

        {/* Brand name */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              RENA
            </span>
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">{message}</p>
        </motion.div>

        {/* Animated progress bar */}
        <motion.div
          className="w-48 h-1 bg-violet-100 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }}
          />
        </motion.div>

        {/* Floating dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-400"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
