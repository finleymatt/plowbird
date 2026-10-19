import type { DrivewayLength, DrivewaySize, JobStatus } from './types';

export const money = (cents: number) =>
  `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;

export const moneyExact = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function when(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}

export function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export const SIZE_LABEL: Record<DrivewaySize, string> = {
  single: '1-car',
  double: '2-car',
  triple: '3-car',
  large: 'Large / acreage',
};

export const LENGTH_LABEL: Record<DrivewayLength, string> = {
  short: 'Short',
  standard: 'Standard',
  long: 'Long',
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  requested: 'Finding a driver',
  accepted: 'Driver assigned',
  en_route: 'On the way',
  in_progress: 'Plowing now',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const isOpen = (s: JobStatus) => s !== 'completed' && s !== 'cancelled';
