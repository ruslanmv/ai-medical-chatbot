/**
 * Embeddings utility for future FAISS integration.
 * Uses HF Inference API for sentence embeddings when available.
 * Falls back to keyword search (medical-kb.ts) when not.
 */

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generate embeddings via HuggingFace Inference API.
 * This is used for future FAISS-based vector search.
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${EMBEDDING_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const embedding = await response.json();
    return Array.isArray(embedding) ? embedding : null;
  } catch {
    return null;
  }
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
