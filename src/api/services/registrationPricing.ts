import prisma from '../../db/prisma';

/** Keep raw text (including formula notes). Empty → null. */
export function normalizeSpread(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw Object.assign(new Error('Spread must be text or a finite number'), { code: 'VALIDATION' });
    }
    return String(value);
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

/** Parse numeric-only spread for price math; notes / non-numeric → 0. */
export function parseNumericSpread(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const text = String(value).trim().replaceAll(',', '');
  if (text === '') return 0;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function upsertRegistrationSpread(
  registrationId: string,
  spreadInput: unknown,
  updatedBy?: string,
) {
  const spread = normalizeSpread(spreadInput);
  const id = String(registrationId ?? '').trim();
  if (!id) {
    throw Object.assign(new Error('Registration id is required'), { code: 'VALIDATION' });
  }

  const managed = await prisma.masterDataCrmRegistration.findFirst({
    where: { OR: [{ id }, { newKey: id }] },
    select: { id: true },
  });

  if (managed) {
    await prisma.masterDataCrmRegistration.update({
      where: { id: managed.id },
      data: { spread },
    });
  } else {
    await prisma.$executeRaw`
      MERGE [dbo].[registration_price_settings] AS target
      USING (SELECT ${id} AS registrationId, ${spread} AS spread, ${updatedBy ?? null} AS updatedBy) AS source
      ON target.[registrationId] = source.registrationId
      WHEN MATCHED THEN
        UPDATE SET
          [spread] = source.spread,
          [updatedBy] = source.updatedBy,
          [updatedAt] = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT ([registrationId], [spread], [updatedBy], [updatedAt])
        VALUES (source.registrationId, source.spread, source.updatedBy, GETUTCDATE());
    `;
  }

  return { registrationId: id, spread };
}
