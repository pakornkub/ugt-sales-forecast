import { useCallback, useMemo, useState } from 'react';
import type { RegColumnKey } from '../../types/forecast';
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMN_KEYS,
  getOrderedColumns,
  reorderColumns,
  type OrderedRegColumn,
} from './regTableColumns';

export function useRegTableLayout() {
  const [columnOrder, setColumnOrder] = useState<RegColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedColumnKey, setDraggedColumnKey] = useState<RegColumnKey | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<RegColumnKey, boolean>>(
    () => {
      const initialVisibility = DEFAULT_COLUMN_ORDER.reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as Record<RegColumnKey, boolean>
      );
      DEFAULT_VISIBLE_COLUMN_KEYS.forEach(key => {
        initialVisibility[key] = true;
      });
      return initialVisibility;
    }
  );

  const orderedColumns = useMemo(() => getOrderedColumns(columnOrder), [columnOrder]);

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
