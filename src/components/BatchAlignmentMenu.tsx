import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  AlignJustify,
  ArrowDownToLine,
  Columns3,
  Rows3,
  LayoutGrid,
} from 'lucide-react';

export interface BatchAlignmentMenuProps {
  isOpen: boolean;
  isDark: boolean;
  onAlignLeft: () => void;
  onAlignCenterHorizontal: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignCenterVertical: () => void;
  onAlignBottom: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  onArrangeInGrid: () => void;
}

export const BatchAlignmentMenu: React.FC<BatchAlignmentMenuProps> = ({
  isOpen,
  isDark,
  onAlignLeft,
  onAlignCenterHorizontal,
  onAlignRight,
  onAlignTop,
  onAlignCenterVertical,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
  onArrangeInGrid,
}) => {
  if (!isOpen) return null;

  const btnClass = isDark
    ? 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900';

  const popoverBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`absolute bottom-full mb-2 left-0 z-50 w-52 rounded-md border shadow-sm p-2 flex flex-col gap-1 ${popoverBg}`}
      >
        {/* Horizontal Alignment */}
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400">
          Horizontal Alignment
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={onAlignLeft}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Left</span>
          </button>
          <button
            type="button"
            onClick={onAlignCenterHorizontal}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Center Horizontally"
          >
            <AlignCenter className="w-3.5 h-3.5" />
            <span>Center</span>
          </button>
          <button
            type="button"
            onClick={onAlignRight}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
            <span>Right</span>
          </button>
        </div>

        {/* Vertical Alignment */}
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400 mt-1">
          Vertical Alignment
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={onAlignTop}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Top"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>
          <button
            type="button"
            onClick={onAlignCenterVertical}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Middle Vertically"
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span>Middle</span>
          </button>
          <button
            type="button"
            onClick={onAlignBottom}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Align Bottom"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Bottom</span>
          </button>
        </div>

        {/* Distribution & Matrix */}
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400 mt-1">
          Distribution & Grid
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={onDistributeHorizontal}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Distribute Horizontally"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Dist. H</span>
          </button>
          <button
            type="button"
            onClick={onDistributeVertical}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Distribute Vertically"
          >
            <Rows3 className="w-3.5 h-3.5" />
            <span>Dist. V</span>
          </button>
          <button
            type="button"
            onClick={onArrangeInGrid}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${borderClass}`}
            title="Arrange in Grid Matrix"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
