import React, { useState } from 'react';
import { Columns3, GripVertical, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import type { RegColumnKey } from '../../types/forecast';
import { ALL_REG_COLUMNS } from './regTableColumns';

export function ColumnReorderPanel({
  open,
  onClose,
  columnOrder,
  onReorder,
  onReset,
  columnVisibility,
  onToggleVisibility,
}: {
  open: boolean;
  onClose: () => void;
  columnOrder: RegColumnKey[];
  onReorder: (dragged: RegColumnKey, target: RegColumnKey) => void;
  onReset: () => void;
  columnVisibility?: Record<RegColumnKey, boolean>;
  onToggleVisibility?: (key: RegColumnKey) => void;
}) {
  const [draggedKey, setDraggedKey] = useState<RegColumnKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<RegColumnKey | null>(null);

  const orderedDefs = columnOrder
    .map(key => ALL_REG_COLUMNS.find(c => c.key === key))
    .filter(Boolean) as typeof ALL_REG_COLUMNS;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/20"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-0 bottom-0 z-50 w-72 max-w-[90vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Columns3 size={14} className="text-blue-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                  Column Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <p className="px-4 py-2 text-[9px] text-slate-400 font-medium border-b border-slate-50">
              Drag columns to change display order
            </p>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {orderedDefs.map(col => (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => setDraggedKey(col.key)}
                  onDragEnd={() => {
                    setDraggedKey(null);
                    setDragOverKey(null);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverKey(col.key);
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    if (draggedKey) onReorder(draggedKey, col.key);
                    setDraggedKey(null);
                    setDragOverKey(null);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all duration-150',
                    dragOverKey === col.key
                      ? 'border-blue-300 bg-blue-50/70 shadow-sm'
                      : 'border-slate-100 bg-slate-50/60 hover:border-slate-200',
                    draggedKey === col.key && 'opacity-50 scale-[0.98]'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={columnVisibility ? !!columnVisibility[col.key] : true}
                    onChange={() => onToggleVisibility && onToggleVisibility(col.key)}
                    className="shrink-0 mt-0.5"
                    draggable={false}
                    onPointerDown={e => e.stopPropagation()}
                    aria-label={`Toggle ${col.label}`}
                  />
                  <span className="text-[10px] font-bold text-slate-700 truncate ml-2">{col.label}</span>
                  <div className="ml-auto">
                    <GripVertical size={12} className="text-slate-300 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onReset}
                className="w-full text-[9px] font-bold uppercase py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
              >
                <RotateCcw size={10} />
                Reset column order
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
