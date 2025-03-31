export function chunkBuffer(buffer: Buffer, size: number): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const end = offset + size;
    chunks.push(buffer.slice(offset, end));
    offset = end;
  }

  return chunks;
}
