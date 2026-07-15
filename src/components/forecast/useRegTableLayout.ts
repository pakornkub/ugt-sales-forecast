import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RegColumnKey } from '../../types/forecast';
import {
  DEFAULT_COLUMN_ORDER,
  getDefaultVisibleColumnKeys,
  getOrderedColumns,
  reorderColumns,
  type OrderedRegColumn,
} from './regTableColumns';

export function useRegTableLayout(appMode?: 'nyl' | 'ufa' | null) {
  const [columnOrder, setColumnOrder] = useState<RegColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedColumnKey, setDraggedColumnKey] = useState<RegColumnKey | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<RegColumnKey, boolean>>(
    () => {
      const initialVisibility = DEFAULT_COLUMN_ORDER.reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as Record<RegColumnKey, boolean>
      );
      getDefaultVisibleColumnKeys(appMode).forEach(key => {
        initialVisibility[key] = true;
      });
      return initialVisibility;
    }
  );

  useEffect(() => {
    if (appMode !== 'ufa') return;
    setColumnVisibility(prev => {
      const next = { ...prev };
      let changed = false;
      for (const key of getDefaultVisibleColumnKeys('ufa')) {
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [appMode]);

  const orderedColumns = useMemo(
    () => getOrderedColumns(columnOrder, appMode),
    [columnOrder, appMode]
  );

  const resetColumnOrder = useCallback(() => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
  }, []);

  const handleColumnDrop = useCallback(
    (targetKey: RegColumnKey) => {
      if (!draggedColumnKey) return;
      setColumnOrder(prev => reorderColumns(prev, draggedColumnKey, targetKey));
      setDraggedColumnKey(null);
    },
    [draggedColumnKey]
  );

  const handlePanelReorder = useCallback((draggedKey: RegColumnKey, targetKey: RegColumnKey) => {
    setColumnOrder(prev => reorderColumns(prev, draggedKey, targetKey));
  }, []);

  const toggleColumnVisibility = useCallback((key: RegColumnKey) => {
    setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    columnOrder,
    settingsOpen,
    setSettingsOpen,
    orderedColumns,
    draggedColumnKey,
    setDraggedColumnKey,
    resetColumnOrder,
    handleColumnDrop,
    handlePanelReorder,
    columnVisibility,
    toggleColumnVisibility,
  };
}

export type { OrderedRegColumn };
