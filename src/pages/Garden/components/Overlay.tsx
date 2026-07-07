import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface OverlayProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Overlay({ title, onClose, children, maxWidth = 'max-w-2xl' }: OverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-garden-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className={`max-h-[85vh] w-full ${maxWidth} overflow-y-auto rounded-3xl border border-white/60 bg-white p-5 shadow-glass-lg sm:p-6`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-garden-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-garden-400 hover:bg-garden-50 hover:text-garden-700" aria-label="Close">✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
