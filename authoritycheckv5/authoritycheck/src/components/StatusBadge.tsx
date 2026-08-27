import type { VerificationStatus } from '../types';

/**
 * Status is rendered in brackets, in mono, in the margin rail. The bracket is
 * the visual signature of the product: [2025] EWHC 1383, [F1], [verified].
 */
const LABELS: Record<VerificationStatus, string> = {
  verified: 'verified',
  notFound: 'not found',
  malformed: 'unreadable',
  ambiguous: 'ambiguous',
  pending: 'checking',
  error: 'unavailable',
};

interface Props {
  status: VerificationStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`badge badge--${status}`}>[{LABELS[status]}]</span>
  );
}
