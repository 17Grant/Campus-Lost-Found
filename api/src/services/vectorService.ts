import { prisma } from '../lib/prisma';

// Starting point only. Tune against real data (see notes below the code).
export const MATCH_THRESHOLD = 0.55;

const MODEL = 'Xenova/all-MiniLM-L6-v2';

type Embedder = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>;

type PipelineFn = (task: string, model: string, options: object) => Promise<Embedder>;

let embedderPromise: Promise<Embedder> | null = null;

// Loaded lazily and once. The quantized (q8) model is ~25 MB and keeps memory low on free hosting.
function getEmbedder(): Promise<Embedder> {
  if (!embedderPromise) {
    embedderPromise = import('@huggingface/transformers')
      .then(({ pipeline }) =>
        (pipeline as unknown as PipelineFn)('feature-extraction', MODEL, { dtype: 'q8' }),
      )
      .catch((err) => {
        embedderPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return embedderPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Location is deliberately excluded so two unrelated items from the same zone don't look similar.
export function buildItemText(item: {
  title: string;
  category: string;
  description: string;
}): string {
  return `${item.title}. ${item.category}. ${item.description}`;
}

const toVectorLiteral = (v: number[]) => `[${v.join(',')}]`;

export async function saveEmbedding(itemId: string, embedding: number[]): Promise<void> {
  const vec = toVectorLiteral(embedding);
  await prisma.$executeRaw`UPDATE "Item" SET embedding = ${vec}::vector WHERE id = ${itemId}`;
}

export interface MatchRow {
  id: string;
  type: 'LOST' | 'FOUND';
  status: string;
  title: string;
  category: string;
  description: string;
  campusZone: string;
  custodyLocation: string | null;
  imageUrl: string | null;
  eventDate: Date;
  similarity: number;
}

export async function findMatches(
  embedding: number[],
  targetType: 'LOST' | 'FOUND',
  limit = 5,
): Promise<MatchRow[]> {
  const vec = toVectorLiteral(embedding);
  return prisma.$queryRaw<MatchRow[]>`
    SELECT id, type, status, title, category, description, "campusZone",
           "custodyLocation", "imageUrl", "eventDate",
           1 - (embedding <=> ${vec}::vector) AS similarity
    FROM "Item"
    WHERE type = ${targetType}::"ItemType"
      AND status IN ('OPEN', 'AT_SECURITY_DESK')
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${vec}::vector) > ${MATCH_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;
}
