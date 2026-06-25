import { motion } from 'motion/react';

interface PhenixLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export default function PhenixLogo({ size = 48, className = '', animated = true }: PhenixLogoProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={animated ? { scale: [1, 1.03, 1] } : undefined}
        transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 } : undefined}
      >
        {/* Left vertical stem */}
        <rect x="8" y="6" width="16" height="68" rx="7" fill="#4361EE" />

        {/* Upper right bowl — D-shape arc */}
        <path d="M24 6 H46 A22 21 0 0 1 46 48 H24 Z" fill="#4361EE" />

        {/* Lower diagonal leg */}
        <path d="M24 48 L44 48 L62 72 L62 78 Q57 78 54 74 L24 58 Z" fill="#4361EE" />

        {/* White arrow — cuts through the bowl (Revolut-style animated) */}
        <motion.path
          d="M21 21 H52 V13 L70 27 L52 41 V33 H21 Z"
          fill="white"
          animate={animated ? { x: [0, 8, 0] } : undefined}
          transition={animated ? {
            duration: 0.48,
            repeat: Infinity,
            repeatDelay: 2.4,
            ease: [0.22, 0.61, 0.36, 1],
          } : undefined}
        />
      </motion.svg>
    </div>
  );
}
