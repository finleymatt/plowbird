// Jobs whose chat is on screen right now, so a new message there doesn't also pop a toast.
const open = new Map<number, number>();

export function chatOpened(jobId: number) {
  open.set(jobId, (open.get(jobId) ?? 0) + 1);
  return () => {
    const n = (open.get(jobId) ?? 1) - 1;
    if (n > 0) open.set(jobId, n);
    else open.delete(jobId);
  };
}

export const isChatOpen = (jobId: number | null | undefined) => jobId != null && open.has(jobId);
