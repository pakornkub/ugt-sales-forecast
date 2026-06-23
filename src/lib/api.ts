import type {
  ActualValue,
  CPLPrice,
  ForecastSummary,
  ForecastSummaryRequest,
  ForecastValue,
  InventoryRow,
  Registration,
} from '../types/forecast';

export interface CurrentForecastImportRecord {
  sourceRow: number;
  excelKeyForNoRegist: string;
  matchedRegistrationId: string;
  version: 'Current Forecast';
  sourceColumn: string;
  sourceMonthHeader: string;
  forecastMonth: string;
  period: string;
  granularity: 'week';
  qtyFcst: number;
  action: 'create' | 'overwrite';
  oldQtyFcst: number | null;
}

export interface CurrentForecastUnifiedPreviewRow {
  sourceRow: number | null;
  sourceRows: number[];
  status: 'matched' | 'actual_only' | 'registration_only' | 'proposed_registration';
  keyRegist: string | null;
  keyNoRegist: string;
  country: string | null;
  soldTo: string | null;
  shipTo: string | null;
  enduser: string | null;
  plant: string | null;
  materialCode: string | null;
  onOff: string | null;
  process: string | null;
  application: string | null;
  subApplication: string | null;
  owner: string | null;
  qtyActual: number;
  qtyFcst: number;
  dimensionSource: 'registration' | 'actual' | 'excel' | 'actual_with_excel_fallback' | 'registration_with_actual_fallback';
}

export interface CurrentForecastImportPreview {
  previewContractVersion: number;
  summary: {
    sheetName: string;
    version: 'Current Forecast';
    totalRows: number;
    validRows: number;
    importableRecords: number;
    candidateRecords: number;
    headerErrors: number;
    missingKeyRows: number;
    unmatchedRows: number;
    duplicateExcelKeys: number;
    duplicateRegistrationMatches: number;
    invalidNumericValues: number;
    existingDbConflicts: number;
    matchedRows: number;
    actualOnlyRows: number;
    registrationOnlyRows: number;
    proposedRegistrationRows: number;
    uniqueExcelKeys: number;
    groupedDuplicateKeys: number;
    createRecords: number;
    overwriteRecords: number;
  };
  expectedForecastColumns: Array<{
    col: string;
    index: number;
    header: string;
    month: string;
    period: string;
  }>;
  detectedHeaders: Array<{ index: number; name: string }>;
  headerErrors: Array<{ column: string; expected: string; actual: string }>;
  missingKeyRows: Array<{ sourceRow: number }>;
  duplicateExcelKeys: Array<{ excelKeyForNoRegist: string; sourceRows: number[] }>;
  unmatchedRows: Array<{ sourceRow: number; excelKeyForNoRegist: string }>;
  duplicateRegistrationMatches: Array<{
    sourceRow: number;
    excelKeyForNoRegist: string;
    matchedRegistrationIds: string[];
  }>;
  invalidNumericValues: Array<{
    sourceRow: number;
    excelKeyForNoRegist: string;
    column: string;
    header: string;
    value: unknown;
  }>;
  existingDbConflicts: Array<{
    sourceRow: number;
    excelKeyForNoRegist: string;
    matchedRegistrationId: string;
    period: string;
    sourceMonthHeader: string;
  }>;
  overwriteRecords: Array<{
    sourceRow: number;
    excelKeyForNoRegist: string;
    matchedRegistrationId: string;
    period: string;
    sourceMonthHeader: string;
    oldQtyFcst: number;
    newQtyFcst: number;
  }>;
  unifiedPreviewRows: CurrentForecastUnifiedPreviewRow[];
  importableRecords: CurrentForecastImportRecord[];
}

export interface CurrentForecastImportResult {
  ok: boolean;
  imported: number;
  created: number;
  overwritten: number;
  version: 'Current Forecast';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RegistrationPage {
  items: Registration[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FilterOptionsPage {
  items: string[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SnapshotStatus {
  enabled: boolean;
  activeVersion: string | null;
  status: 'disabled' | 'empty' | 'idle' | 'syncing' | 'ready' | 'failed' | string;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  rowCount: number;
}

export interface ForecastAuditChange {
  id: string;
  batchId: string;
  source: 'manual_commit' | 'excel_import' | string;
  changedBy: string;
  batchCreatedAt: string;
  registrationId: string;
  versionName: string;
  period: string;
  granularity: string;
  oldQtyFcst: number | null;
  newQtyFcst: number;
  oldPriceFcst: number | null;
  newPriceFcst: number;
  changedAt: string;
}

export interface ForecastCellAuditSummary {
  totalChanges: number;
  latestChanges: ForecastAuditChange[];
}

export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: AuthUser;
}

const appBasePath = (
  (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
).replace(/\/$/g, '');

function withAppBase(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!appBasePath) return normalizedPath;
  if (normalizedPath === appBasePath || normalizedPath.startsWith(`${appBasePath}/`)) {
    return normalizedPath;
  }
  return `${appBasePath}${normalizedPath}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withAppBase(path), {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && typeof body?.loginUrl === 'string') {
      window.location.href = body.loginUrl;
    }
    throw new ApiError(res.status, body?.error ?? `Request failed: ${res.status}`, body);
  }
  return res.json() as Promise<T>;
}

// ── Registrations ────────────────────────────────────────────────────────────

export const api = {
  auth: {
    me: async (): Promise<AuthMeResponse> => {
      const res = await fetch(withAppBase('/auth/me'));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ApiError(res.status, body?.error ?? `Request failed: ${res.status}`, body);
      }
      return body as AuthMeResponse;
    },
    logout: async (): Promise<{ ok: boolean; logoutUrl?: string }> => {
      const result = await request<{ ok: boolean; logoutUrl?: string }>('/auth/logout', { method: 'POST' });
      if (result.logoutUrl) window.location.href = result.logoutUrl;
      return result;
    },
    loginUrl: () => withAppBase('/auth/login'),
  },

  sync: {
    status: (): Promise<SnapshotStatus> => request('/api/sync/status'),
    refresh: (): Promise<SnapshotStatus> =>
      request('/api/sync/refresh', { method: 'POST' }),
  },

  inventory: {
    list: (): Promise<InventoryRow[]> => request('/api/inventory'),
    query: (registrationIds: string[], signal?: AbortSignal): Promise<InventoryRow[]> =>
      request('/api/inventory/query', {
        method: 'POST',
        body: JSON.stringify({ registrationIds }),
        signal,
      }),
  },

  registrations: {
    list: (): Promise<Registration[]> => request('/api/registrations'),
    managed: (): Promise<Registration[]> => request('/api/registrations/managed'),
    create: (registration: Registration): Promise<Registration> =>
      request('/api/registrations', {
        method: 'POST',
        body: JSON.stringify(registration),
      }),
    update: (registration: Registration): Promise<Registration> =>
      request(`/api/registrations/${encodeURIComponent(registration.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(registration),
      }),
    remove: (registrationId: string): Promise<{ ok: boolean }> =>
      request(`/api/registrations/${encodeURIComponent(registrationId)}`, {
        method: 'DELETE',
      }),
    page: (
      cursor?: string | null,
      limit = 80,
      filters: Record<string, string[]> = {},
      signal?: AbortSignal
    ): Promise<RegistrationPage> => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (cursor) qs.set('cursor', cursor);
      if (Object.keys(filters).length > 0) qs.set('filters', JSON.stringify(filters));
      return request(`/api/registrations?${qs.toString()}`, { signal });
    },
    filterOptions: (
      column: string,
      search = '',
      filters: Record<string, string[]> = {},
      cursor?: string | null,
      limit = 200
    ): Promise<FilterOptionsPage> => {
      const qs = new URLSearchParams({ column, limit: String(limit) });
      if (search) qs.set('search', search);
      if (Object.keys(filters).length > 0) qs.set('filters', JSON.stringify(filters));
      if (cursor) qs.set('cursor', cursor);
      return request(`/api/registrations/filter-options?${qs.toString()}`);
    },
  },

  // ── Forecast values ──────────────────────────────────────────────────────
  forecast: {
    list: (params: {
      version?: string;
      startPeriod?: string;
      endPeriod?: string;
      granularity?: 'month' | 'week';
      registrationIds?: string[];
      signal?: AbortSignal;
    } = {}): Promise<ForecastValue[]> => {
      const qs = new URLSearchParams();
      if (params.version)     qs.set('version',     params.version);
      if (params.startPeriod) qs.set('startPeriod', params.startPeriod);
      if (params.endPeriod)   qs.set('endPeriod',   params.endPeriod);
      if (params.granularity) qs.set('granularity', params.granularity);
      params.registrationIds?.forEach(id => qs.append('registrationId', id));
      return request<{ registrationId: string; period: string; version: string; qtyFcst: number; priceFcst: number }[]>(
        `/api/forecast?${qs.toString()}`,
        { signal: params.signal }
      ).then(rows => rows.map(r => ({
        registrationId: r.registrationId,
        month:          r.period,     // server uses 'period'; frontend uses 'month'
        version:        r.version,
        qtyAct:         0,            // filled in from actuals merge
        qtyFcst:        r.qtyFcst,
        priceAct:       0,            // filled in from actuals merge
      })));
    },

    save: (
      values: ForecastValue[],
      changedBy = 'User (Admin)',
      stampPeriod = 'No'
    ): Promise<{ ok: boolean; updated: number }> =>
      request('/api/forecast', {
        method: 'PATCH',
        body: JSON.stringify({
          changedBy,
          stampPeriod,
          values: values.map(v => ({
            registrationId: v.registrationId,
            version:        v.version,
          period:         v.month,    // map month → period for server
            granularity:    /^\d{4}-\d{2}-\d{2}$/.test(v.month) ? 'week' : 'month',
            qtyFcst:        v.qtyFcst,
            priceFcst:      0,
          })),
        }),
      }),

    auditCell: (
      registrationId: string,
      version: string,
      period: string,
      signal?: AbortSignal
    ): Promise<ForecastCellAuditSummary> => {
      const qs = new URLSearchParams({ registrationId, version, period });
      return request(`/api/forecast/audit/cell?${qs.toString()}`, { signal });
    },

    audit: (params: {
      registrationId?: string;
      version?: string;
      start?: string;
      end?: string;
      signal?: AbortSignal;
    }): Promise<ForecastAuditChange[]> => {
      const qs = new URLSearchParams();
      if (params.registrationId) qs.set('registrationId', params.registrationId);
      if (params.version) qs.set('version', params.version);
      if (params.start) qs.set('start', params.start);
      if (params.end) qs.set('end', params.end);
      return request(`/api/forecast/audit?${qs.toString()}`, { signal: params.signal });
    },

    summary: (
      params: ForecastSummaryRequest,
      signal?: AbortSignal
    ): Promise<ForecastSummary> =>
      request('/api/forecast/summary', {
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      }),
  },

  // ── Actuals ───────────────────────────────────────────────────────────────
  actuals: {
    list: (
      startMonth?: string,
      endMonth?: string,
      registrationIds?: string[],
      filters: Record<string, string[]> = {},
      granularity: 'month' | 'week' = 'month',
      signal?: AbortSignal
    ): Promise<ActualValue[]> => {
      if (registrationIds && registrationIds.length > 0) {
        return request('/api/actuals/query', {
          method: 'POST',
          body: JSON.stringify({
            startMonth,
            endMonth,
            registrationIds,
            filters,
            granularity,
          }),
          signal,
        });
      }

      const qs = new URLSearchParams();
      if (startMonth) qs.set('startMonth', startMonth);
      if (endMonth)   qs.set('endMonth',   endMonth);
      qs.set('granularity', granularity);
      if (Object.keys(filters).length > 0) qs.set('filters', JSON.stringify(filters));
      const query = qs.toString();
      return request(`/api/actuals${query ? '?' + query : ''}`, { signal });
    },
  },

  // ── CPL prices ────────────────────────────────────────────────────────────
  cpl: {
    list: (fy?: number): Promise<CPLPrice[]> => {
      const qs = fy !== undefined ? `?fy=${fy}` : '';
      return request(`/api/cpl-prices${qs}`);
    },

    create: (month: string, price: number): Promise<{ ok: boolean }> =>
      request('/api/cpl-prices', {
        method: 'POST',
        body: JSON.stringify({ month, price }),
      }),

    update: (month: string, price: number): Promise<{ ok: boolean }> =>
      request(`/api/cpl-prices/${month}`, {
        method: 'PATCH',
        body: JSON.stringify({ price }),
      }),

    remove: (month: string): Promise<{ ok: boolean }> =>
      request(`/api/cpl-prices/${month}`, { method: 'DELETE' }),
  },

  // ── Versions ──────────────────────────────────────────────────────────────
  versions: {
    list: (): Promise<string[]> => request('/api/versions'),

    create: (name: string): Promise<{ ok: boolean }> =>
      request('/api/versions', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  },

  imports: {
    currentForecastPreview: async (file: File): Promise<CurrentForecastImportPreview> => {
      const res = await fetch(withAppBase('/api/import/current-forecast/preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: await file.arrayBuffer(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.error ?? `Request failed: ${res.status}`);
      }
      return res.json() as Promise<CurrentForecastImportPreview>;
    },
    currentForecastConfirm: (
      preview: CurrentForecastImportPreview,
      stampPeriod = 'No'
    ): Promise<CurrentForecastImportResult> =>
      request('/api/import/current-forecast/confirm', {
        method: 'POST',
        body: JSON.stringify({
          previewContractVersion: preview.previewContractVersion,
          stampPeriod,
          records: preview.importableRecords,
        }),
      }),
  },
};
