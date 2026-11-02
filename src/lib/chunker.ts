export type Chunk = { heading: string; content: string };

const MAX = 800;

/** Split text into passages by heading, then paragraph, targeting ~400–800 chars; each chunk keeps its section heading. */
export function chunkDocument(text: string, title: string): Chunk[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: { heading: string; body: string[] }[] = [];
  let cur = { heading: title, body: [] as string[] };
  for (const line of lines) {
    const m = line.match(/^#{1,6}\s+(.*)$/);
    if (m) {
      if (cur.body.join("").trim()) sections.push(cur);
      cur = { heading: (m[1] ?? "").trim(), body: [] };
    } else cur.body.push(line);
  }
  if (cur.body.join("").trim()) sections.push(cur);

  const chunks: Chunk[] = [];
  for (const s of sections) {
    const paras = s.body.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let buf = "";
    const flush = () => {
      if (buf.trim()) chunks.push({ heading: s.heading, content: buf.trim() });
      buf = "";
    };
    for (const p of paras) {
      const pieces = p.length > MAX ? splitSentences(p) : [p];
      for (const piece of pieces) {
        if (buf && buf.length + piece.length + 2 > MAX) flush();
        buf = buf ? `${buf}\n\n${piece}` : piece;
      }
    }
    flush();
  }
  return chunks;
}

function splitSentences(p: string): string[] {
  const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && buf.length + s.length > MAX) {
      out.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
