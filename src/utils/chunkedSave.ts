export async function chunkedSave<T>(rows: T[], chunkSize: number, saver: (chunk: T[]) => Promise<void>, onProgress?: (done: number, total: number) => void) {
  const total = rows.length;
  if (total === 0) return;
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await saver(chunk);
    onProgress?.(Math.min(i + chunk.length, total), total);
  }
}
