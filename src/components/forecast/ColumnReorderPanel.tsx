import React, { useEffect, useMemo, useState } from 'react';
import { Columns3, GripVertical, RotateCcw, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import type {
  CarryDetailKey,
  CarryDetailVisibility,
  RegColumnKey,
} from '../../types/forecast';
import { ALL_REG_COLUMNS } from './regTableColumns';

const CARRY_DETAIL_OPTIONS: Array<{ key: CarryDetailKey; label: string }> = [
  { key: 'carryIn', label: 'Carry In (TON)' },
  { key: 'carryOut', label: 'Carry Out (TON)' },
  { key: 'carryTotal', label: 'Carry Total (In - Out)' },
];

export function ColumnReorderPanel({
  open,
  onClose,
  columnOrder,
  onReorder,
  onReset,
  columnVisibility,
  onToggleVisibility,
  carryDetailVisibility,
  onToggleCarryDetail,
}: {
  open: boolean;
  onClose: () => void;
  columnOrder: RegColumnKey[];
  onReorder: (dragged: RegColumnKey, target: RegColumnKey) => void;
  onReset: () => void;
  columnVisibility?: Record<RegColumnKey, boolean>;
  onToggleVisibility?: (key: RegColumnKey) => void;
  carryDetailVisibility: CarryDetailVisibility;
  onToggleCarryDetail: (key: CarryDetailKey) => void;
}) {
  const [draggedKey, setDraggedKey] = useState<RegColumnKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<RegColumnKey | null>(null);
  const [columnSearch, setColumnSearch] = useState('');

  const orderedDefs = columnOrder
    .map(key => ALL_REG_COLUMNS.find(c => c.key === key))
    .filter(Boolean) as typeof ALL_REG_COLUMNS;
  const filteredDefs = useMemo(() => {
    const query = columnSearch.trim().toLowerCase();
    if (!query) return orderedDefs;
    return orderedDefs.filter(col =>
      col.label.toLowerCase().includes(query) ||
      col.key.toLowerCase().includes(query)
    );
  }, [columnSearch, orderedDefs]);

  useEffect(() => {
    if (!open) setColumnSearch('');
  }, [open]);

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
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={columnSearch}
                  onChange={event => setColumnSearch(event.target.value)}
                  placeholder="Search columns..."
                  className="w-full h-8 rounded-md border border-slate-200 bg-white pl-8 pr-8 text-[10px] font-medium text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
                {columnSearch && (
                  <button
                    type="button"
                    onClick={() => setColumnSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label="Clear column search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Monthly Carry Details
                </p>
                <div className="space-y-1">
                  {CARRY_DETAIL_OPTIONS.map(option => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-100 bg-blue-50/40 px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:border-blue-200"
                    >
                      <input
                        type="checkbox"
                        checked={carryDetailVisibility[option.key]}
                        onChange={() => onToggleCarryDetail(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[8px] text-slate-400">Available in Month mode only</p>
              </div>

              <div className="space-y-1 p-2">
                {filteredDefs.map(col => (
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
                {filteredDefs.length === 0 && (
                  <div className="px-3 py-8 text-center text-[10px] text-slate-400">
                    No matching columns
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 p-3">
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full text-[9px] font-bold uppercase py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
                >
                  <RotateCcw size={10} />
                  Reset column order
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
