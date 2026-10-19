import { useEffect, useState } from 'react';

import { api } from './api';
import type { Job, JobRoute } from './types';

// Live road route + ETA for a job, refetched as the driver's GPS position changes.
// (The server caches routes, so a truck sitting at a light costs nothing.)
export function useJobRoute(job: Job | null) {
  const [route, setRoute] = useState<JobRoute | null>(null);
  const d = job?.driver;
  const live = !!job && !!d && d.lat != null && (job.status === 'accepted' || job.status === 'en_route');
  // ~10 m precision: a new GPS fix that hasn't really moved doesn't trigger a refetch.
  const key = live ? `${job!.id}:${job!.status}:${d!.lat!.toFixed(4)},${d!.lng!.toFixed(4)}` : null;

  useEffect(() => {
    if (!key || !job) return;
    let stale = false;
    api<JobRoute | null>(`/jobs/${job.id}/route`)
      .then((r) => !stale && setRoute(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return live ? route : null;
}
