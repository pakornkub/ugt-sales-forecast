import { Router } from 'express';
import type { Request } from 'express';
import type { AuthUser } from '../auth';
import {
  assertRegistrationIdsInAppMode,
  filterRegistrationIdsInAppMode,
} from '../../config/appMode';
import prisma from '../../db/prisma';
import { requireAdmin } from '../services/appRoles';

const router = Router();

const COLUMN_TYPES = new Set(['text', 'number', 'dropdown']);
const MAX_REGISTRATION_IDS = 5000;

function sessionDisplayName(req: Request & { user?: AuthUser }) {
  const user = req.user;
  return String(user?.name ?? user?.email ?? 'User').trim() || 'User';
}

function parseDropdownOptions(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw
      .map(value => String(value ?? '').trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(value => String(value ?? '').trim())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(/[\n,;]+/)
        .map(value => value.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function serializeDropdownOptions(options: string[] | null | undefined): string | null {
  if (!options || options.length === 0) return null;
  return JSON.stringify(options);
}

function mapDefinition(row: {
  id: string;
  name: string;
  type: string;
  dropdownOptions: string | null;
  defaultValue: string | null;
  displayOrder: number;
}) {
  let dropdownOptions: string[] | undefined;
  if (row.dropdownOptions) {
    try {
      const parsed = JSON.parse(row.dropdownOptions) as unknown;
      dropdownOptions = Array.isArray(parsed)
        ? parsed.map(value => String(value ?? '').trim()).filter(Boolean)
        : [];
    } catch {
      dropdownOptions = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as 'text' | 'number' | 'dropdown',
    dropdownOptions,
    defaultValue: row.defaultValue ?? undefined,
    displayOrder: row.displayOrder,
  };
}

function normalizeColumnType(type: unknown): string | null {
  const normalized = String(type ?? '').trim().toLowerCase();
  return COLUMN_TYPES.has(normalized) ? normalized : null;
}

function validateDefinitionPayload(body: Record<string, unknown>, isCreate: boolean) {
  const name = String(body.name ?? '').trim();
  if (!name) return { error: 'name is required' };

  const type = normalizeColumnType(body.type);
  if (!type) return { error: 'type must be text, number, or dropdown' };

  const dropdownOptions = type === 'dropdown'
    ? parseDropdownOptions(body.dropdownOptions)
    : null;
  if (type === 'dropdown' && (!dropdownOptions || dropdownOptions.length === 0)) {
    return { error: 'dropdownOptions is required for dropdown columns' };
  }

  let defaultValue: string | null = null;
  if (body.defaultValue != null && String(body.defaultValue).trim() !== '') {
    defaultValue = String(body.defaultValue).trim();
    if (type === 'dropdown' && dropdownOptions && !dropdownOptions.includes(defaultValue)) {
      return { error: 'defaultValue must be one of the dropdown options' };
    }
  }

  if (isCreate) {
    return { name, type, dropdownOptions, defaultValue };
  }

  return {
    name: body.name === undefined ? undefined : name,
    type: body.type === undefined ? undefined : type,
    dropdownOptions: body.dropdownOptions === undefined ? undefined : dropdownOptions,
    defaultValue: body.defaultValue === undefined ? undefined : defaultValue,
  };
}

router.get('/', async (_req, res) => {
  try {
    const rows = await prisma.customColumnDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        dropdownOptions: true,
        defaultValue: true,
        displayOrder: true,
      },
    });
    res.json(rows.map(mapDefinition));
  } catch (error) {
    console.error('[custom-columns] list error:', error);
    res.status(500).json({ error: 'Failed to load custom columns' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const validated = validateDefinitionPayload(body, true);
    if ('error' in validated) {
      return res.status(400).json({ error: validated.error });
    }

    const maxOrder = await prisma.customColumnDefinition.aggregate({
      _max: { displayOrder: true },
    });

    const created = await prisma.customColumnDefinition.create({
      data: {
        name: validated.name,
        type: validated.type,
        dropdownOptions: serializeDropdownOptions(validated.dropdownOptions),
        defaultValue: validated.defaultValue,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        createdBy: sessionDisplayName(req as Request & { user?: AuthUser }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        dropdownOptions: true,
        defaultValue: true,
        displayOrder: true,
      },
    });

    res.status(201).json(mapDefinition(created));
  } catch (error) {
    console.error('[custom-columns] create error:', error);
    res.status(500).json({ error: 'Failed to create custom column' });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const existing = await prisma.customColumnDefinition.findFirst({
      where: { id, isActive: true },
    });
    if (!existing) return res.status(404).json({ error: 'Custom column not found' });

    const body = req.body as Record<string, unknown>;
    const validated = validateDefinitionPayload(
      {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        dropdownOptions: body.dropdownOptions ?? (
          existing.dropdownOptions
            ? JSON.parse(existing.dropdownOptions)
            : []
        ),
        defaultValue: body.defaultValue ?? existing.defaultValue,
      },
      true,
    );
    if ('error' in validated) {
      return res.status(400).json({ error: validated.error });
    }

    const nextType = body.type === undefined ? existing.type : validated.type;
    const nextDropdownOptions = nextType === 'dropdown'
      ? (body.dropdownOptions === undefined
        ? parseDropdownOptions(existing.dropdownOptions)
        : validated.dropdownOptions)
      : null;
    const nextDefaultValue = body.defaultValue === undefined
      ? existing.defaultValue
      : validated.defaultValue;

    const updated = await prisma.customColumnDefinition.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: validated.name }),
        ...(body.type === undefined ? {} : { type: validated.type }),
        ...(body.type === undefined && body.dropdownOptions === undefined
          ? {}
          : { dropdownOptions: serializeDropdownOptions(nextDropdownOptions) }),
        ...(body.defaultValue === undefined ? {} : { defaultValue: nextDefaultValue }),
        ...(body.type !== undefined && nextType !== 'dropdown'
          ? { dropdownOptions: null, defaultValue: body.defaultValue === undefined ? null : nextDefaultValue }
          : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        dropdownOptions: true,
        defaultValue: true,
        displayOrder: true,
      },
    });

    res.json(mapDefinition(updated));
  } catch (error) {
    console.error('[custom-columns] patch error:', error);
    res.status(500).json({ error: 'Failed to update custom column' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });

    const existing = await prisma.customColumnDefinition.findFirst({
      where: { id, isActive: true },
    });
    if (!existing) return res.status(404).json({ error: 'Custom column not found' });

    await prisma.customColumnDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[custom-columns] delete error:', error);
    res.status(500).json({ error: 'Failed to delete custom column' });
  }
});

router.post('/values/query', async (req, res) => {
  try {
    const body = req.body as {
      registrationIds?: unknown;
      columnIds?: unknown;
    };

    const requestedIds = Array.isArray(body.registrationIds)
      ? body.registrationIds.map(value => String(value ?? '').trim()).filter(Boolean)
      : [];
    if (requestedIds.length === 0) {
      return res.json([]);
    }
    if (requestedIds.length > MAX_REGISTRATION_IDS) {
      return res.status(400).json({ error: `registrationIds exceeds limit of ${MAX_REGISTRATION_IDS}` });
    }
    const registrationIds = await filterRegistrationIdsInAppMode(requestedIds);
    if (registrationIds.length === 0) {
      return res.json([]);
    }

    const columnIds = Array.isArray(body.columnIds)
      ? body.columnIds.map(value => String(value ?? '').trim()).filter(Boolean)
      : undefined;

    const rows = await prisma.customColumnValue.findMany({
      where: {
        registrationId: { in: registrationIds },
        ...(columnIds && columnIds.length > 0 ? { columnId: { in: columnIds } } : {}),
        column: { isActive: true },
      },
      select: {
        columnId: true,
        registrationId: true,
        value: true,
      },
    });

    res.json(rows.map(row => ({
      columnId: row.columnId,
      registrationId: row.registrationId,
      value: row.value,
    })));
  } catch (error) {
    console.error('[custom-columns] values query error:', error);
    res.status(500).json({ error: 'Failed to load custom column values' });
  }
});

router.patch('/:columnId/values/:registrationId', async (req, res) => {
  try {
    const columnId = String(req.params.columnId ?? '').trim();
    const registrationId = String(req.params.registrationId ?? '').trim();
    if (!columnId || !registrationId) {
      return res.status(400).json({ error: 'columnId and registrationId are required' });
    }
    await assertRegistrationIdsInAppMode([registrationId]);

    const column = await prisma.customColumnDefinition.findFirst({
      where: { id: columnId, isActive: true },
    });
    if (!column) return res.status(404).json({ error: 'Custom column not found' });

    const rawValue = (req.body as { value?: unknown })?.value;
    let value: string | null;
    if (rawValue == null || String(rawValue).trim() === '') {
      value = null;
    } else {
      value = String(rawValue).trim();
      if (column.type === 'number' && !Number.isFinite(Number(value))) {
        return res.status(400).json({ error: 'value must be a valid number' });
      }
      if (column.type === 'dropdown') {
        const options = parseDropdownOptions(column.dropdownOptions) ?? [];
        if (!options.includes(value)) {
          return res.status(400).json({ error: 'value must be one of the dropdown options' });
        }
      }
    }

    const updatedBy = sessionDisplayName(req as Request & { user?: AuthUser });
    const saved = await prisma.customColumnValue.upsert({
      where: {
        columnId_registrationId: { columnId, registrationId },
      },
      create: {
        columnId,
        registrationId,
        value,
        updatedBy,
      },
      update: {
        value,
        updatedBy,
      },
      select: {
        columnId: true,
        registrationId: true,
        value: true,
      },
    });

    res.json(saved);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : undefined;
    if (code === 'REGISTRATION_OUT_OF_MODE') {
      return res.status(403).json({
        error: error instanceof Error ? error.message : 'Registration outside selected mode',
        code,
      });
    }
    console.error('[custom-columns] upsert value error:', error);
    res.status(500).json({ error: 'Failed to save custom column value' });
  }
});

export default router;
