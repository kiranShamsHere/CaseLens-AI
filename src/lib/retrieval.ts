export type SearchPassage = { id: string; page: number | null; content: string; documents?: { filename?: string } | null };
const stopWords = new Set(["what", "when", "where", "which", "who", "whom", "whose", "how", "does", "did", "have", "has", "was", "were", "are", "the", "and", "for", "from", "with", "that", "this", "about", "into", "case", "file", "client"]);

function terms(text: string) { return text.toLowerCase().match(/[a-z0-9]{2,}/g)?.filter(word => !stopWords.has(word)) ?? []; }

/** Lightweight BM25-like keyword ranking, restricted to passages already scoped to one case. */
export function rankPassages<T extends SearchPassage>(passages: T[], question: string, limit = 8): T[] {
  const query = [...new Set(terms(question))];
  return passages.map(passage => {
    const words = terms(passage.content);
    const counts = new Map<string, number>();
    words.forEach(word => counts.set(word, (counts.get(word) ?? 0) + 1));
    const score = query.reduce((total, word) => total + (counts.get(word) ? 1 + Math.log(counts.get(word)!) : 0), 0) / Math.sqrt(Math.max(1, words.length));
    return { passage, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.passage);
}

export function quoteAppearsIn(quote: string, sourceText: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s\u00a0]+/g, " ").trim();
  const normalizedQuote = normalize(quote);
  return Boolean(normalizedQuote) && normalize(sourceText).includes(normalizedQuote);
}
