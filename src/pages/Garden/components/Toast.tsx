import { AnimatePresence, motion } from 'framer-motion';

export default function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="rounded-full bg-garden-900 px-5 py-3 text-sm font-bold text-white shadow-glass-lg"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
