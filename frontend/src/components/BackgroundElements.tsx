import { motion } from "framer-motion";

export function AdvancedBackground() {
  return (
    <div className="fixed inset-0 z-[0] overflow-hidden bg-background pointer-events-none transition-colors duration-700">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 dark:opacity-20"></div>
      
      {/* Floating Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1], 
          x: [0, 50, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-gold-vivid/10 blur-[120px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1], 
          x: [0, -60, 0],
          y: [0, -40, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gold-dark/10 blur-[150px]" 
      />
    </div>
  )
}
