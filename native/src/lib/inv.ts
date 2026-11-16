// Shared invoice shapes and plain-language states for the built-in Invoices screens.
import { t } from './i18n';

export type Inv = { id: number; number: string; kind: 'invoice' | 'quote'; status: string; customer: string | null; customer_email: string | null; issue_date: string; due_date: string;
  total: number; amount_paid: number; balance: number; overdue: boolean; days_late: number; quote_status?: string | null; recurring?: string | null };

/** Plain words and colour for an invoice's state. */
export function invState(i: Inv): [string, 'good' | 'warn' | 'bad' | 'info' | 'plain'] {
  if (i.kind === 'quote') {
    if (i.quote_status === 'accepted' || i.quote_status === 'converted') return [t('Accepted'), 'good'];
    if (i.quote_status === 'declined') return [t('Declined'), 'bad'];
    return i.status === 'draft' ? [t('Draft quote'), 'plain'] : [t('Quote sent'), 'info'];
  }
  if (i.status === 'paid') return [t('Paid'), 'good'];
  if (i.status === 'void') return [t('Void'), 'plain'];
  if (i.status === 'draft') return [t('Draft'), 'plain'];
  if (i.overdue) return [t('{n} days late', { n: i.days_late || 1 }), 'bad'];
  if (Number(i.amount_paid) > 0) return [t('Part paid'), 'warn'];
  return [t('Sent'), 'info'];
}

