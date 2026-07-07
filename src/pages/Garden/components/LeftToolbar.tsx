import { motion, AnimatePresence } from 'framer-motion';
import { ToolId } from '../types';

interface ToolDef {
  id: ToolId;
  icon: string;
  label: string;
  hint: string;
}

const TOOLS: ToolDef[] = [
  { id: 'plant', icon: '🌱', label: 'Plant', hint: 'Choose a seed, then tap an empty plot to plant it' },
  { id: 'water', icon: '💧', label: 'Water', hint: 'Tap a growing plot to water it' },
  { id: 'fertilizer', icon: '🌿', label: 'Fertilizer', hint: 'Tap a plot to boost its growth' },
  { id: 'pesticide', icon: '🪲', label: 'Pesticide', hint: 'Tap an infested plot to remove pests instantly' },
  { id: 'scarecrow', icon: '🧱', label: 'Scarecrow', hint: 'Tap a plot to prevent future pest attacks' },
  { id: 'decorations', icon: '🎨', label: 'Decorate', hint: 'Equip fences & borders' },
  { id: 'inventory', icon: '🎒', label: 'Inventory', hint: 'View your tracked crops' },
  { id: 'shop', icon: '🛍️', label: 'Shop', hint: 'Spend AgriCoins on cosmetics' },
];

interface LeftToolbarProps {
  activeTool: ToolId | null;
  onSelectTool: (tool: ToolId) => void;
  orientation?: 'vertical' | 'horizontal';
  /** Shows a one-time "start here" callout pointing at a specific tool, for first-time users. */
  onboardingToolId?: ToolId | null;
}

export default function LeftToolbar({ activeTool, onSelectTool, orientation = 'vertical', onboardingToolId = null }: LeftToolbarProps) {
  const isVertical = orientation === 'vertical';
  return (
    <div
      className={`flex ${isVertical ? 'flex-col' : 'flex-row overflow-x-auto'} gap-1.5 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-panel backdrop-blur-md`}
    >
      {TOOLS.map(tool => {
        const active = activeTool === tool.id;
        const showOnboarding = onboardingToolId === tool.id;
        return (
          <div key={tool.id} className="group relative flex flex-shrink-0 flex-col items-center gap-0.5">
            <div className="relative">
              {/* Pulsing ring drawing the eye to the Plant button for a first-time user */}
              {showOnboarding && (
                <motion.span
                  className="absolute inset-0 rounded-xl border-2 border-gold-400"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectTool(tool.id)}
                aria-label={`${tool.label} — ${tool.hint}`}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-colors
                  ${active
                    ? 'border-garden-500 bg-garden-500 text-white shadow-glow-gold'
                    : 'border-garden-100 bg-white text-garden-800 hover:border-garden-300 hover:bg-garden-50'}`}
              >
                {tool.icon}
              </motion.button>
            </div>

            {/* Always-visible short label — no hover required to know what this button does */}
            <span className={`text-[9px] font-bold leading-none ${active ? 'text-garden-700' : 'text-garden-500'} ${isVertical ? '' : 'whitespace-nowrap'}`}>
              {tool.label}
            </span>

            {/* Detailed tooltip on hover */}
            <div
              className={`pointer-events-none absolute z-40 whitespace-nowrap rounded-lg bg-garden-900 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-glass transition-opacity duration-150 group-hover:opacity-100
                ${isVertical ? 'left-full top-1/2 ml-2 -translate-y-1/2' : 'bottom-full left-1/2 mb-2 -translate-x-1/2'}`}
            >
              {tool.hint}
            </div>

            <AnimatePresence>
              {showOnboarding && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`pointer-events-none absolute z-50 w-max max-w-[150px] rounded-xl bg-gold-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-glow-gold
                    ${isVertical ? 'left-full top-1/2 ml-2 -translate-y-1/2' : 'bottom-full left-1/2 mb-8 -translate-x-1/2'}`}
                >
                  👋 Start here — plant your first crop!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}