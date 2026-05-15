import { motion } from 'motion/react';

interface RenaLogoProps {
  size?: number;
  className?: string;
}

export default function RenaLogo({ size = 48, className = '' }: RenaLogoProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        <defs>
          <radialGradient id="rena-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </radialGradient>
          <filter id="rena-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring pulse */}
        <motion.circle
          cx="50" cy="50" r="48"
          stroke="#7C3AED"
          strokeWidth="1.5"
          fill="none"
          initial={{ opacity: 0.6, scale: 0.9 }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* Background circle */}
        <motion.circle
          cx="50" cy="50" r="44"
          fill="url(#rena-bg)"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* Inner shimmer highlight */}
        <motion.ellipse
          cx="38" cy="28" rx="16" ry="10"
          fill="white"
          opacity="0"
          animate={{ opacity: [0, 0.18, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Letter R */}
        <motion.text
          x="50" y="68"
          textAnchor="middle"
          fontFamily="Arial Black, Arial, sans-serif"
          fontWeight="900"
          fontSize="56"
          fill="white"
          filter="url(#rena-glow)"
          initial={{ opacity: 0, y: 78 }}
          animate={{ opacity: 1, y: 68 }}
          transition={{ duration: 0.45, delay: 0.15, ease: 'backOut' }}
        >
          R
        </motion.text>

        {/* Orbiting dot */}
        <motion.circle
          cx="50" cy="6" r="4"
          fill="#C4B5FD"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50px 50px' }}
        />
      </svg>
    </div>
  );
}
