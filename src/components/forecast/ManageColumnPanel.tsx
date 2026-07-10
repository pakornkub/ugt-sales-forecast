import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Columns3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api, ApiError } from '../../lib/api';
import type { CustomColumnDef, CustomColumnType } from '../../types/forecast';

type ManageColumnPanelProps = {
  readonly open: boolean;
  readonly initialSection?: 'add' | 'manage';
  readonly onClose: () => void;
  readonly onColumnsChanged: (columns: CustomColumnDef[]) => void;
};

type Section = 'add' | 'manage';

const TYPE_OPTIONS: Array<{ value: CustomColumnType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
];

function TypeBadge({ type }: Readonly<{ type: CustomColumnType }>) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      {type}
    </span>
  );
}

function parseDropdownOptionsInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(value => value.trim())
    .filter(Boolean);
}

export function ManageColumnPanel({
  open,
  initialSection = 'add',
  onClose,
  onColumnsChanged,
}: ManageColumnPanelProps) {
  const [section, setSection] = useState<Section>(initialSection);
  const [columns, setColumns] = useState<CustomColumnDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<CustomColumnType>('text');
  const [dropdownOptionsText, setDropdownOptionsText] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<CustomColumnType>('text');
  const [editDropdownOptionsText, setEditDropdownOptionsText] = useState('');
  const [editDefaultValue, setEditDefaultValue] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const dropdownOptions = useMemo(
    () => parseDropdownOptionsInput(dropdownOptionsText),
    [dropdownOptionsText],
  );
  const editDropdownOptions = useMemo(
    () => parseDropdownOptionsInput(editDropdownOptionsText),
    [editDropdownOptionsText],
  );

  const loadColumns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.customColumns.list();
      setColumns(rows);
      onColumnsChanged(rows);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Failed to load custom columns');
    } finally {
      setLoading(false);
    }
  }, [onColumnsChanged]);

  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    setEditingId(null);
    setDeleteTarget(null);
    setName('');
    setType('text');
    setDropdownOptionsText('');
    setDefaultValue('');
    void loadColumns();
  }, [initialSection, loadColumns, open]);

  const resetAddForm = useCallback(() => {
    setName('');
    setType('text');
    setDropdownOptionsText('');
    setDefaultValue('');
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Column name is required');
      return;
    }
    if (type === 'dropdown' && dropdownOptions.length === 0) {
      setError('Dropdown options are required');
      return;
    }
    if (type === 'dropdown' && defaultValue && !dropdownOptions.includes(defaultValue)) {
      setError('Default value must be one of the dropdown options');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.customColumns.create({
        name: trimmedName,
        type,
        dropdownOptions: type === 'dropdown' ? dropdownOptions : undefined,
        defaultValue: defaultValue.trim() || undefined,
      });
      resetAddForm();
      await loadColumns();
      setSection('manage');
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : 'Failed to create column');
    } finally {
      setSaving(false);
    }
  }, [defaultValue, dropdownOptions, loadColumns, name, resetAddForm, type]);

  const startEdit = useCallback((column: CustomColumnDef) => {
    setEditingId(column.id);
    setEditName(column.name);
    setEditType(column.type);
    setEditDropdownOptionsText((column.dropdownOptions ?? []).join('\n'));
    setEditDefaultValue(column.defaultValue ?? '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleUpdate = useCallback(async (columnId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError('Column name is required');
      return;
    }
    if (editType === 'dropdown' && editDropdownOptions.length === 0) {
      setError('Dropdown options are required');
      return;
    }
    if (editType === 'dropdown' && editDefaultValue && !editDropdownOptions.includes(editDefaultValue)) {
      setError('Default value must be one of the dropdown options');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.customColumns.update(columnId, {
        name: trimmedName,
        type: editType,
        dropdownOptions: editType === 'dropdown' ? editDropdownOptions : [],
        defaultValue: editDefaultValue.trim() || null,
      });
      setEditingId(null);
      await loadColumns();
    } catch (updateError) {
      setError(updateError instanceof ApiError ? updateError.message : 'Failed to update column');
    } finally {
      setSaving(false);
    }
  }, [editDefaultValue, editDropdownOptions, editName, editType, loadColumns]);

  const requestDelete = useCallback((columnId: string, columnName: string) => {
    setDeleteTarget({ id: columnId, name: columnName });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const { id: columnId } = deleteTarget;
    setSaving(true);
    setError(null);
    try {
      await api.customColumns.remove(columnId);
      if (editingId === columnId) setEditingId(null);
      setDeleteTarget(null);
      await loadColumns();
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Failed to delete column');
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, editingId, loadColumns]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close manage columns dialog"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', duration: 0.32, bounce: 0.18 }}
            className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#007ABE]/[0.06] to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#007ABE] text-white shadow-sm">
                  <Columns3 size={17} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Manage Columns</h2>
                  <p className="text-[11px] text-slate-500">
                    Add custom registration columns and manage their definitions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex shrink-0 gap-2 border-b border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setSection('add')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition',
                  section === 'add'
                    ? 'bg-[#007ABE] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                Add Column
              </button>
              <button
                type="button"
                onClick={() => setSection('manage')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition',
                  section === 'manage'
                    ? 'bg-[#007ABE] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                Manage Columns
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  <span className="text-xs font-medium">Loading columns...</span>
                </div>
              ) : section === 'add' ? (
                <section className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Column Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="e.g. Priority Tag"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={event => setType(event.target.value as CustomColumnType)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {type === 'dropdown' && (
                    <>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Dropdown Options
                        </label>
                        <textarea
                          value={dropdownOptionsText}
                          onChange={event => setDropdownOptionsText(event.target.value)}
                          placeholder="One option per line"
                          rows={5}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Default Value
                        </label>
                        <select
                          value={defaultValue}
                          onChange={event => setDefaultValue(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">(None)</option>
                          {dropdownOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => { void handleCreate(); }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#007ABE] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#00629a] disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create Column
                  </button>
                </section>
              ) : (
                <section className="space-y-3">
                  {columns.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                      No custom columns yet. Use Add Column to create one.
                    </div>
                  ) : (
                    columns.map(column => (
                      <div
                        key={column.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        {editingId === column.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editName}
                              onChange={event => setEditName(event.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <select
                              value={editType}
                              onChange={event => setEditType(event.target.value as CustomColumnType)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            >
                              {TYPE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            {editType === 'dropdown' && (
                              <>
                                <textarea
                                  value={editDropdownOptionsText}
                                  onChange={event => setEditDropdownOptionsText(event.target.value)}
                                  rows={4}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <select
                                  value={editDefaultValue}
                                  onChange={event => setEditDefaultValue(event.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="">(None)</option>
                                  {editDropdownOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { void handleUpdate(column.id); }}
                                disabled={saving}
                                className="rounded-lg bg-[#007ABE] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate text-sm font-bold text-slate-800">{column.name}</h4>
                                <TypeBadge type={column.type} />
                              </div>
                              {column.type === 'dropdown' && column.dropdownOptions && column.dropdownOptions.length > 0 && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Options: {column.dropdownOptions.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(column)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                aria-label={`Edit ${column.name}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete(column.id, column.name)}
                                className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                                aria-label={`Delete ${column.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </section>
              )}
            </div>

            <AnimatePresence>
              {deleteTarget && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-[2px]"
                >
                  <motion.div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-column-title"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: 'spring', duration: 0.28, bounce: 0.15 }}
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <Trash2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 id="delete-column-title" className="text-sm font-bold text-slate-900">
                          Delete column?
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-800">&quot;{deleteTarget.name}&quot;</span>
                          {' '}will be removed from the grid. Existing cell values stay in the database but will no longer be shown.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelDelete}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => { void confirmDelete(); }}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
