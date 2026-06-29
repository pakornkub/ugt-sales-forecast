import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Columns3, Download, FilePlus2, FileSpreadsheet, LoaderCircle, Pencil, Upload, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import type { CurrentForecastImportPreview } from '../../lib/api';
import type { FilterOptionsPage } from '../../lib/api';
import type {
  ColumnFilterValue,
  ColumnFiltersState,
  CPLPrice,
  CarryDetailKey,
  CarryDetailVisibility,
  Dimension,
  ForecastValue,
  ForecastSummary,
  PriceFormula,
  Registration,
  RegColumnKey,
  ValueType,
} from '../../types/forecast';
import { ColumnReorderPanel } from './ColumnReorderPanel';
import { DraftRegistrationPanel, ManageRegistrationPanel } from './DraftRegistrationPanel';
import { FixedColumnsTable } from './FixedColumnsTable';
import { ResizablePaneLayout } from './ResizablePaneLayout';
import { ScrollableMonthGrid } from './ScrollableMonthGrid';
import {
  getRegColumnsTotalWidth,
  REG_PANE_MAX_RATIO,
  REG_PANE_MIN_WIDTH,
} from './regTableColumns';
import { usePaneResize } from './usePaneResize';
import { useRegTableLayout } from './useRegTableLayout';
import { useScrollSync } from './useScrollSync';

export interface ForecastInputTableProps {
  registrations: Registration[];
  allRegistrations: Registration[];
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  monthsToShow: string[];
  forecastData: ForecastValue[];
  cplPrices: CPLPrice[];
  selectedVersion: string;
  selectedDimension: Dimension;
  selectedType: ValueType;
  onForecastChange: (regId: string, month: string, value: number) => void;
  onExport: () => void;
  forecastMode: 'month' | 'week' | 'day';
  planningView: 'sale' | 'accounting' | 'production';
  formulaMap: Map<string, PriceFormula>;
  onFormulaChange: (regId: string, formula: PriceFormula) => void;
  formulaFilter: ColumnFilterValue;
  onFormulaFilterChange: (v: ColumnFilterValue) => void;
  naphthaprices: CPLPrice[];
  benzeneprices: CPLPrice[];
  fixedPriceMap: Map<string, Map<string, number>>;
  onFixedPriceChange: (regId: string, month: string, price: number) => void;
  isTableDataLoading: boolean;
  isLoadingMore: boolean;
  hasMoreRows: boolean;
  onLoadMore: () => void;
  loadFilterOptions: (
    columnKey: string,
    search: string,
    cursor?: string | null
  ) => Promise<FilterOptionsPage>;
  managedRegistrations: Registration[];
  onCreateManagedRegistration: (registration: Registration) => Promise<Registration>;
  onUpdateManagedRegistration: (registration: Registration) => Promise<Registration>;
  onDeleteManagedRegistration: (registrationId: string) => Promise<void>;
  onImportComplete: () => Promise<void>;
  forecastSummary: ForecastSummary | null;
  isForecastSummaryUpdating: boolean;
  forecastAuditVersion: number;
  stampPeriod: string;
}

function ForecastInputTableComponent({
  registrations,
  allRegistrations,
  columnFilters,
  onColumnFiltersChange,
  monthsToShow,
  forecastData,
  cplPrices,
  selectedVersion,
  selectedDimension,
  selectedType,
  onForecastChange,
  onExport,
  forecastMode,
  planningView,
  formulaMap,
  onFormulaChange,
  formulaFilter,
  onFormulaFilterChange,
  naphthaprices,
  benzeneprices,
  fixedPriceMap,
  onFixedPriceChange,
  isTableDataLoading,
  isLoadingMore,
  hasMoreRows,
  onLoadMore,
  loadFilterOptions,
  managedRegistrations,
  onCreateManagedRegistration,
  onUpdateManagedRegistration,
  onDeleteManagedRegistration,
  onImportComplete,
  forecastSummary,
  isForecastSummaryUpdating,
  forecastAuditVersion,
  stampPeriod,
}: ForecastInputTableProps) {
  const {
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
  } = useRegTableLayout();

  const visibleOrderedColumns = orderedColumns.filter(c => {
    return columnVisibility ? columnVisibility[c.key] !== false : true;
  });


  const { regPaneRef, monthPaneRef, scrollTop, syncFromReg, syncFromMonth, resetScrollTop } = useScrollSync();
  const [dragOverColumnKey, setDragOverColumnKey] = useState<RegColumnKey | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CurrentForecastImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showScrollLoader, setShowScrollLoader] = useState(false);
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [manageRegistrationOpen, setManageRegistrationOpen] = useState(false);
  const [carryDetailVisibility, setCarryDetailVisibility] = useState<CarryDetailVisibility>({
    carryIn: false,
    carryOut: false,
    carryTotal: false,
  });

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [splitContainerWidth, setSplitContainerWidth] = useState(900);

  useEffect(() => {
    const el = splitContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setSplitContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paneMinWidth = REG_PANE_MIN_WIDTH;
  const regContentWidth = getRegColumnsTotalWidth(visibleOrderedColumns);
  const paneMaxWidth = Math.max(
    regContentWidth,
    Math.floor(splitContainerWidth * REG_PANE_MAX_RATIO)
  );
  const paneInitialWidth = Math.min(
    paneMaxWidth,
    Math.max(paneMinWidth, Math.min(regContentWidth, Math.floor(splitContainerWidth * 0.38)))
  );

  const { regPaneWidth, onDividerPointerDown, isDragging } = usePaneResize({
    initialWidth: paneInitialWidth,
    minWidth: paneMinWidth,
    maxWidth: paneMaxWidth,
  });

  const setColumnFilter = useCallback(
    (key: RegColumnKey, value: ColumnFilterValue) => {
      onColumnFiltersChange(prev => ({ ...prev, [key]: value }));
    },
    [onColumnFiltersChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedColumnKey(null);
    setDragOverColumnKey(null);
  }, [setDraggedColumnKey]);

  const resetImportPreview = useCallback(() => {
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setIsPreviewingImport(false);
    setIsConfirmingImport(false);
    setImportSuccess(null);
  }, []);

  useEffect(() => {
    const panes = [regPaneRef.current, monthPaneRef.current].filter(
      (pane): pane is HTMLDivElement => Boolean(pane)
    );

    const checkLoadMore = () => {
      const pane = monthPaneRef.current ?? regPaneRef.current;
      if (!pane) return;
      const remaining = pane.scrollHeight - pane.scrollTop - pane.clientHeight;
      if (remaining < 700 && hasMoreRows) {
        setShowScrollLoader(true);
        if (!isLoadingMore) onLoadMore();
      } else if (remaining >= 700 || !hasMoreRows) {
        setShowScrollLoader(false);
      }
    };

    panes.forEach(pane => pane.addEventListener('scroll', checkLoadMore, { passive: true }));
    return () => {
      panes.forEach(pane => pane.removeEventListener('scroll', checkLoadMore));
    };
  }, [hasMoreRows, isLoadingMore, onLoadMore, registrations.length, regPaneRef, monthPaneRef]);

  useEffect(() => {
    if (!hasMoreRows) setShowScrollLoader(false);
  }, [hasMoreRows]);

  useEffect(() => {
    resetScrollTop();
    setShowScrollLoader(false);
  }, [columnFilters, resetScrollTop]);

  const closeImportModal = useCallback(() => {
    setImportOpen(false);
    resetImportPreview();
  }, [resetImportPreview]);

  const toggleCarryDetail = useCallback((key: CarryDetailKey) => {
    setCarryDetailVisibility(previous => ({
      ...previous,
      [key]: !previous[key],
    }));
  }, []);

  const handleImportPreview = useCallback(async () => {
    if (!importFile) {
      setImportError('Please select CurrentForecast.xlsx first.');
      return;
    }
    try {
      setIsPreviewingImport(true);
      setImportError(null);
      setImportSuccess(null);
      const preview = await api.imports.currentForecastPreview(importFile);
      setImportPreview(preview);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to preview Current Forecast import';
      setImportError(msg);
      setImportPreview(null);
    } finally {
      setIsPreviewingImport(false);
    }
  }, [importFile]);

  const handleImportConfirm = useCallback(async () => {
    if (!importPreview) return;
    try {
      setIsConfirmingImport(true);
      setImportError(null);
      setImportSuccess(null);
      const result = await api.imports.currentForecastConfirm(importPreview, stampPeriod);
      await onImportComplete();
      setImportSuccess(
        `Imported ${result.imported.toLocaleString()} records: ${result.created.toLocaleString()} created, ${result.overwritten.toLocaleString()} overwritten.`
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to import Current Forecast';
      setImportError(message);
    } finally {
      setIsConfirmingImport(false);
    }
  }, [importPreview, onImportComplete, stampPeriod]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 w-full">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/80">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
          Business columns ↔ · Months ↔ · drag divider to resize
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setManageRegistrationOpen(false);
              setSettingsOpen(false);
              setDraftPanelOpen(true);
            }}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all duration-200',
              draftPanelOpen
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <FilePlus2 size={12} />
            Add Registration
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftPanelOpen(false);
              setSettingsOpen(false);
              setManageRegistrationOpen(true);
            }}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all duration-200',
              manageRegistrationOpen
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <Pencil size={12} />
            Manage Registration
            {managedRegistrations.length > 0 && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[8px] text-blue-700">
                {managedRegistrations.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftPanelOpen(false);
              setManageRegistrationOpen(false);
              setSettingsOpen(true);
            }}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all duration-200',
              settingsOpen
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <Columns3 size={12} />
            Column Settings
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <Upload size={12} />
            Import
          </button>
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      <ColumnReorderPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        columnOrder={columnOrder}
        onReorder={handlePanelReorder}
        onReset={resetColumnOrder}
        columnVisibility={columnVisibility}
        onToggleVisibility={toggleColumnVisibility}
        carryDetailVisibility={carryDetailVisibility}
        onToggleCarryDetail={toggleCarryDetail}
      />

      <DraftRegistrationPanel
        open={draftPanelOpen}
        onClose={() => setDraftPanelOpen(false)}
        onCreate={async registration => {
          const saved = await onCreateManagedRegistration(registration);
          if (
            !Object.values(columnFilters).some(filter => filter.selectedValues.length > 0) &&
            formulaFilter.selectedValues.length === 0
          ) {
            resetScrollTop();
          }
          return saved;
        }}
      />

      <ManageRegistrationPanel
        open={manageRegistrationOpen}
        registrations={managedRegistrations}
        onClose={() => setManageRegistrationOpen(false)}
        onUpdate={onUpdateManagedRegistration}
        onDelete={onDeleteManagedRegistration}
      />

      <ImportPreviewModal
        open={importOpen}
        file={importFile}
        preview={importPreview}
        error={importError}
        success={importSuccess}
        loading={isPreviewingImport}
        confirming={isConfirmingImport}
        onClose={closeImportModal}
        onFileChange={file => {
          setImportFile(file);
          setImportPreview(null);
          setImportError(null);
          setImportSuccess(null);
        }}
        onPreview={handleImportPreview}
        onConfirm={handleImportConfirm}
      />

      <ResizablePaneLayout
        splitContainerRef={splitContainerRef}
        regPaneWidth={regPaneWidth}
        isDragging={isDragging}
        onDividerPointerDown={onDividerPointerDown}
        fixedPane={
          <FixedColumnsTable
            scrollRef={regPaneRef}
            scrollTop={scrollTop}
            onScroll={syncFromReg}
            tableWidth={regContentWidth}
            columns={visibleOrderedColumns}
            registrations={registrations}
            allRegistrations={allRegistrations}
            columnFilters={columnFilters}
            onColumnFilterChange={setColumnFilter}
            draggedColumnKey={draggedColumnKey}
            dragOverColumnKey={dragOverColumnKey}
            onDragStart={setDraggedColumnKey}
            onDragEnd={handleDragEnd}
            onDragOver={setDragOverColumnKey}
            onDragLeave={() => setDragOverColumnKey(null)}
            onColumnDrop={handleColumnDrop}
            selectedDimension={selectedDimension}
            formulaMap={formulaMap}
            onFormulaChange={onFormulaChange}
            formulaFilter={formulaFilter}
            onFormulaFilterChange={onFormulaFilterChange}
            loadFilterOptions={loadFilterOptions}
          />
        }
        monthPane={
          <ScrollableMonthGrid
            scrollRef={monthPaneRef}
            scrollTop={scrollTop}
            onScroll={syncFromMonth}
            monthsToShow={monthsToShow}
            registrations={registrations}
            forecastData={forecastData}
            cplPrices={cplPrices}
            selectedVersion={selectedVersion}
            selectedDimension={selectedDimension}
            selectedType={selectedType}
            onForecastChange={onForecastChange}
            forecastMode={forecastMode}
            planningView={planningView}
            formulaMap={formulaMap}
            naphthaprices={naphthaprices}
            benzeneprices={benzeneprices}
            fixedPriceMap={fixedPriceMap}
            onFixedPriceChange={onFixedPriceChange}
            carryDetailVisibility={carryDetailVisibility}
            forecastSummary={forecastSummary}
            isForecastSummaryUpdating={isForecastSummaryUpdating}
            forecastAuditVersion={forecastAuditVersion}
          />
        }
      />
      {showScrollLoader && (isTableDataLoading || isLoadingMore || hasMoreRows) && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-md">
            <LoaderCircle size={15} className="animate-spin text-blue-600" />
            Loading more rows...
          </div>
        </div>
      )}
    </div>
  );
}

export const ForecastInputTable = React.memo(ForecastInputTableComponent);

function ImportPreviewModal({
  open,
  file,
  preview,
  error,
  success,
  loading,
  confirming,
  onClose,
  onFileChange,
  onPreview,
  onConfirm,
}: {
  open: boolean;
  file: File | null;
  preview: CurrentForecastImportPreview | null;
  error: string | null;
  success: string | null;
  loading: boolean;
  confirming: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const summary = preview?.summary;
  const unifiedPreviewRows = preview?.unifiedPreviewRows ?? [];
  const isStalePreviewBackend = Boolean(preview && preview.previewContractVersion !== 5);
  const hasBlockingIssues = summary
    ? summary.headerErrors > 0 ||
      summary.duplicateRegistrationMatches > 0 ||
      summary.invalidNumericValues > 0
    : false;
  const warningCount = summary
    ? summary.missingKeyRows + summary.unmatchedRows + (summary.proposedRegistrationRows ?? 0)
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[86vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Current Forecast Import Preview</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Preview first, then confirm to save Current Forecast.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
            aria-label="Close import preview"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
            <label className="min-w-0">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Excel File</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:text-slate-600 hover:file:bg-slate-50"
              />
              {file && <p className="mt-1 text-[10px] text-slate-400 font-medium truncate">{file.name}</p>}
            </label>
            <button
              type="button"
              onClick={onPreview}
              disabled={loading || confirming}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <Upload size={13} />
              {loading ? 'Previewing...' : 'Preview'}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 font-semibold">
              {success}
            </div>
          )}

          {isStalePreviewBackend && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold">
              Backend import preview is an older version. Restart `npm.cmd run server`, then run Preview again.
            </div>
          )}

          {summary && (
            <>
              <div className={cn(
                'rounded-xl border px-4 py-3 flex items-center gap-3',
                hasBlockingIssues ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              )}>
                {hasBlockingIssues ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    {hasBlockingIssues ? 'Preview found blocking issues' : 'Preview ready'}
                  </p>
                  <p className="text-[10px] font-semibold opacity-80">
                    {hasBlockingIssues
                      ? 'Resolve blocking issues and run Preview again before importing.'
                      : 'Review the result, then confirm to save these values to Current Forecast.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                    Months in this import
                  </span>
                  {preview.expectedForecastColumns.map(column => (
                    <span
                      key={`${column.index}-${column.header}`}
                      className="rounded border border-blue-200 bg-white px-2 py-1 font-mono text-[9px] font-bold text-blue-700"
                    >
                      {column.header}
                    </span>
                  ))}
                  <span className="text-[9px] font-semibold text-blue-600">
                    Missing month columns are not changed.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <PreviewStat label="Total Rows" value={summary.totalRows} />
                <PreviewStat label="Valid Rows" value={summary.validRows} />
                <PreviewStat label="Importable Records" value={summary.importableRecords} />
                <PreviewStat label="Warnings" value={warningCount} tone={warningCount > 0 ? 'amber' : 'slate'} />
                <PreviewStat label="Unique Excel Keys" value={summary.uniqueExcelKeys} />
                <PreviewStat label="Grouped Duplicate Keys" value={summary.groupedDuplicateKeys ?? summary.duplicateExcelKeys} />
                <PreviewStat label="Invalid Numbers" value={summary.invalidNumericValues} tone={summary.invalidNumericValues > 0 ? 'red' : 'slate'} />
                <PreviewStat label="Create Forecast Records" value={summary.createRecords ?? 0} />
                <PreviewStat label="Overwrite Forecast Records" value={summary.overwriteRecords ?? 0} tone={(summary.overwriteRecords ?? 0) > 0 ? 'amber' : 'slate'} />
                <PreviewStat label="Matched Reg + Actual" value={summary.matchedRows ?? 0} />
                <PreviewStat label="Actual Only" value={summary.actualOnlyRows ?? 0} tone={(summary.actualOnlyRows ?? 0) > 0 ? 'amber' : 'slate'} />
                <PreviewStat label="Registration Only" value={summary.registrationOnlyRows ?? 0} />
                <PreviewStat label="Proposed New Registration" value={summary.proposedRegistrationRows ?? 0} tone={(summary.proposedRegistrationRows ?? 0) > 0 ? 'amber' : 'slate'} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PreviewList
                  title="Grouped Duplicate Keys (Forecast Summed)"
                  emptyText="No duplicate keys needed grouping"
                  items={preview.duplicateExcelKeys.slice(0, 8).map(item => `${item.excelKeyForNoRegist} | summed rows ${item.sourceRows.join(', ')}`)}
                />
                <PreviewList
                  title="Proposed New Registrations"
                  emptyText="No new registrations are required"
                  items={unifiedPreviewRows
                    .filter(row => row.status === 'proposed_registration')
                    .slice(0, 8)
                    .map(row => `Rows ${row.sourceRows.join(', ')} | ${row.keyNoRegist}`)}
                />
                <PreviewList
                  title="Duplicate Registration Matches"
                  emptyText="No duplicate registration matches"
                  items={preview.duplicateRegistrationMatches.slice(0, 8).map(item => `Row ${item.sourceRow} | ${item.excelKeyForNoRegist} | ${item.matchedRegistrationIds.join(', ')}`)}
                />
                <PreviewList
                  title="Existing Forecast Values to Overwrite"
                  emptyText="No existing forecast values will be overwritten"
                  items={(preview.overwriteRecords ?? []).slice(0, 8).map(item =>
                    `Row ${item.sourceRow} | ${item.sourceMonthHeader} | ${item.oldQtyFcst} -> ${item.newQtyFcst}`
                  )}
                />
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registration + Actual Preview</h4>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {unifiedPreviewRows.length.toLocaleString()} rows
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="min-w-[1500px] w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                      <tr className="text-[9px] uppercase tracking-widest text-slate-400">
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Key Regist</th>
                        <th className="p-2 text-left">Key No Regist</th>
                        <th className="p-2 text-left">Country</th>
                        <th className="p-2 text-left">Sold To</th>
                        <th className="p-2 text-left">Ship To</th>
                        <th className="p-2 text-left">Enduser</th>
                        <th className="p-2 text-left">Plant</th>
                        <th className="p-2 text-left">Material</th>
                        <th className="p-2 text-left">BU</th>
                        <th className="p-2 text-left">On/Off</th>
                        <th className="p-2 text-left">Process</th>
                        <th className="p-2 text-left">Application</th>
                        <th className="p-2 text-left">SubApplication</th>
                        <th className="p-2 text-left">Owner</th>
                        <th className="p-2 text-right">Qty Actual</th>
                        <th className="p-2 text-right">Qty Fcst</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {unifiedPreviewRows.slice(0, 100).map((row, idx) => (
                        <tr key={`${row.status}-${row.keyNoRegist}-${idx}`} className="text-[10px] text-slate-600">
                          <td className="p-2">
                            <span className={cn(
                              'inline-flex whitespace-nowrap rounded px-2 py-1 text-[9px] font-black uppercase',
                              row.status === 'matched'
                                ? 'bg-emerald-50 text-emerald-700'
                                : row.status === 'actual_only'
                                  ? 'bg-amber-50 text-amber-700'
                                  : row.status === 'proposed_registration'
                                    ? 'bg-violet-50 text-violet-700'
                                    : 'bg-blue-50 text-blue-700'
                            )}>
                              {row.status === 'matched'
                                ? 'Matched'
                                : row.status === 'actual_only'
                                  ? 'Actual Only'
                                  : row.status === 'proposed_registration'
                                    ? 'New Registration'
                                    : 'Registration Only'}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{row.keyRegist ?? 'NULL'}</td>
                          <td className="p-2 font-mono max-w-[260px] truncate" title={row.keyNoRegist}>{row.keyNoRegist}</td>
                          <td className="p-2">{row.country ?? 'NULL'}</td>
                          <td className="p-2 max-w-[180px] truncate" title={row.soldTo ?? undefined}>{row.soldTo ?? 'NULL'}</td>
                          <td className="p-2 max-w-[180px] truncate" title={row.shipTo ?? undefined}>{row.shipTo ?? 'NULL'}</td>
                          <td className="p-2 max-w-[180px] truncate" title={row.enduser ?? undefined}>{row.enduser ?? 'NULL'}</td>
                          <td className="p-2">{row.plant ?? 'NULL'}</td>
                          <td className="p-2 font-mono">{row.materialCode ?? 'NULL'}</td>
                          <td className="p-2 font-bold text-sky-700">{row.businessUnit ?? 'NULL'}</td>
                          <td className="p-2">{row.onOff ?? 'NULL'}</td>
                          <td className="p-2">{row.process ?? 'NULL'}</td>
                          <td className="p-2">{row.application ?? 'NULL'}</td>
                          <td className="p-2">{row.subApplication ?? 'NULL'}</td>
                          <td className="p-2">{row.owner ?? 'NULL'}</td>
                          <td className="p-2 text-right font-mono">{row.qtyActual.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                          <td className="p-2 text-right font-mono">{row.qtyFcst.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                        </tr>
                      ))}
                      {unifiedPreviewRows.length === 0 && (
                        <tr>
                          <td colSpan={17} className="p-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            No Registration or Actual preview rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sample Importable Records</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{preview.importableRecords.length.toLocaleString()} records</span>
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b border-slate-100">
                      <tr className="text-[9px] uppercase tracking-widest text-slate-400">
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Key</th>
                        <th className="p-2 text-left">Month</th>
                        <th className="p-2 text-left">Period</th>
                        <th className="p-2 text-left">Action</th>
                        <th className="p-2 text-right">Old Qty</th>
                        <th className="p-2 text-right">New Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {preview.importableRecords.slice(0, 20).map((record, idx) => (
                        <tr key={`${record.sourceRow}-${record.sourceColumn}-${idx}`} className="font-mono text-[10px] text-slate-600">
                          <td className="p-2">{record.sourceRow}</td>
                          <td className="p-2 max-w-[260px] truncate">{record.excelKeyForNoRegist}</td>
                          <td className="p-2">{record.sourceMonthHeader}</td>
                          <td className="p-2">{record.period}</td>
                          <td className="p-2">
                            <span className={cn(
                              'inline-flex rounded px-2 py-1 text-[9px] font-black uppercase',
                              record.action === 'overwrite'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            )}>
                              {record.action}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {record.oldQtyFcst === null
                              ? '-'
                              : record.oldQtyFcst.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          </td>
                          <td className="p-2 text-right">{record.qtyFcst.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                        </tr>
                      ))}
                      {preview.importableRecords.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No importable records</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              confirming ||
              loading ||
              !preview ||
              hasBlockingIssues ||
              preview.importableRecords.length === 0 ||
              Boolean(success)
            }
            className="px-4 py-2 rounded-lg bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors"
          >
            {confirming ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number | null | undefined;
  tone?: 'slate' | 'amber' | 'red';
}) {
  const displayValue = value ?? 0;
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={cn('rounded-xl border p-3', toneClass)}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-xl font-black font-mono tracking-tight mt-1">{displayValue.toLocaleString()}</p>
    </div>
  );
}

function PreviewList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h4>
      </div>
      <div className="p-3 max-h-32 overflow-auto">
        {items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((item, idx) => (
              <li key={`${item}-${idx}`} className="text-[10px] font-mono text-slate-600 truncate" title={item}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
