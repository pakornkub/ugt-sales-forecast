import prisma from '../../db/prisma';

export type CcEmailRecipientPreview = {
  email: string;
  displayName: string;
  source: 'owner' | 'distribution';
};

export async function loadNotifyEnabledCcRecipients() {
  return prisma.forecastCcRecipient.findMany({
    where: { notifyEnabled: true },
    orderBy: [{ sortOrder: 'asc' }, { fullNameEng: 'asc' }],
  });
}

export function mapCcRecipientsToPreview(
  recipients: Awaited<ReturnType<typeof loadNotifyEnabledCcRecipients>>,
): CcEmailRecipientPreview[] {
  const previews: CcEmailRecipientPreview[] = [];
  for (const recipient of recipients) {
    const email = recipient.currentEmail.trim().toLowerCase();
    if (!email) continue;
    if (previews.some(item => item.email === email)) continue;
    previews.push({
      email,
      displayName: recipient.fullNameEng || email,
      source: 'distribution',
    });
  }
  return previews;
}

export function mapCcRecipientsToEmails(
  recipients: Awaited<ReturnType<typeof loadNotifyEnabledCcRecipients>>,
): string[] {
  return mapCcRecipientsToPreview(recipients).map(recipient => recipient.email);
}
