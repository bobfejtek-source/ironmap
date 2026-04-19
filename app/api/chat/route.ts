import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '@/lib/rate-limit';
import { getGymCount } from '@/lib/stats';
import { sql, HAS_DB } from '@/lib/postgres';
import { buildSystemPrompt } from '@/lib/chat-prompt';
import { getCached, setCached } from '@/lib/chat-cache';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Msg = { role: 'user' | 'assistant'; content: string };

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 700;
const MAX_HISTORY = 12;
const MAX_INPUT_CHARS = 2000;
const MAX_TURNS = 4;

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'search_gyms',
    description:
      'Vyhleda posilovny/fitness centra v databazi IRON podle mesta, volitelne kategorie a mestske casti. Vraci top vysledky podle hodnoceni. Pouzivej vzdy, kdyz uzivatel hleda konkretni gymy.',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Nazev mesta cesky (napr. Praha, Brno, Ostrava).',
        },
        district: {
          type: 'string',
          description: 'Volitelne mestska cast (napr. Praha 6, Vinohrady). Filtruje se v adrese.',
        },
        category: {
          type: 'string',
          enum: ['Posilovna', 'CrossFit', 'Joga', 'Pilates', 'Outdoor', 'Bojove sporty', 'Spinning', 'Bazen'],
          description: 'Volitelne kategorie (presny nazev z ciselniku IRON).',
        },
        limit: {
          type: 'integer',
          description: 'Pocet vysledku, default 3, max 10.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['city'],
    },
  },
];

type GymRow = {
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  rating: number | null;
  rating_count: number | null;
  category: string | null;
  categories: string | null;
};

async function executeSearchGyms(input: Record<string, unknown>) {
  if (!HAS_DB) return { error: 'DB not available' };

  const city = String(input.city ?? '').trim();
  if (!city) return { error: 'city required' };

  const district = String(input.district ?? '').trim();
  const category = String(input.category ?? '').trim();
  const rawLimit = Number(input.limit ?? 3);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 3, 1), 10);

  const cityLower = city.toLowerCase();
  const rows = (await sql`
    SELECT name, slug, city, address, rating, rating_count, category, categories
    FROM gyms
    WHERE LOWER(city) = ${cityLower}
      AND COALESCE(staging, false) = false
      AND name IS NOT NULL
      AND name <> 'Unnamed Gym'
    ORDER BY COALESCE(rating, 0) DESC, COALESCE(rating_count, 0) DESC
    LIMIT 100
  `) as unknown as GymRow[];

  let filtered: GymRow[] = rows;

  if (district) {
    const d = district.toLowerCase();
    filtered = filtered.filter((r) => (r.address ?? '').toLowerCase().includes(d));
  }
  if (category) {
    const c = category.toLowerCase();
    filtered = filtered.filter((r) => {
      const cat = (r.category ?? '').toLowerCase();
      const cats = (r.categories ?? '').toLowerCase();
      return cat.includes(c) || cats.includes(c);
    });
  }

  const slim = filtered.slice(0, limit).map((r) => ({
    name: r.name,
    url: `/posilovny/${r.slug}`,
    city: r.city,
    address: r.address,
    rating: r.rating,
    rating_count: r.rating_count,
  }));

  return {
    count: slim.length,
    gyms: slim,
    note:
      slim.length === 0
        ? 'Zadne vysledky. Zkus obecnejsi dotaz nebo navrhni /posilovny/[mesto].'
        : undefined,
  };
}

function clientKey(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  return `chat:${ip}`;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'Chat neni nakonfigurovan' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!rateLimit(clientKey(req), 20, 5 * 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Prilis mnoho zprav. Zkus to za chvili.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = [];
  for (const m of raw) {
    if (
      m &&
      typeof m === 'object' &&
      ((m as Msg).role === 'user' || (m as Msg).role === 'assistant') &&
      typeof (m as Msg).content === 'string' &&
      (m as Msg).content.trim().length > 0
    ) {
      messages.push({
        role: (m as Msg).role,
        content: (m as Msg).content.slice(0, MAX_INPUT_CHARS),
      });
    }
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return new Response(JSON.stringify({ error: 'Chybi zprava uzivatele' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const trimmed = messages.slice(-MAX_HISTORY);
  const gymCount = await getGymCount().catch(() => 1500);
  const systemPrompt = buildSystemPrompt(gymCount);
  const client = new Anthropic({ apiKey: key });

  // FAQ cache: pouze single-turn dotazy (prvni zprava uzivatele)
  // kontextove follow-up dotazy NEcachujeme, protoze by ztratily kontext
  const isSingleTurn = trimmed.length === 1 && trimmed[0].role === 'user';
  const userMessage = isSingleTurn ? trimmed[0].content : '';

  const encoder = new TextEncoder();

  // Cache hit - vratime okamzite
  if (isSingleTurn) {
    const cached = getCached(userMessage);
    if (cached) {
      const hitStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(cached));
          controller.close();
        },
      });
      return new Response(hitStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Cache': 'HIT',
        },
      });
    }
  }

  const readable = new ReadableStream({
    async start(controller) {
      const convo: Anthropic.Messages.MessageParam[] = trimmed.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulatedText = '';
      let usedTool = false;

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            tools: TOOLS,
            messages: convo,
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              accumulatedText += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          const finalMsg = await stream.finalMessage();
          if (finalMsg.stop_reason !== 'tool_use') break;

          usedTool = true;
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
          for (const block of finalMsg.content) {
            if (block.type === 'tool_use') {
              let result: unknown;
              try {
                if (block.name === 'search_gyms') {
                  result = await executeSearchGyms(block.input as Record<string, unknown>);
                } else {
                  result = { error: 'Unknown tool: ' + block.name };
                }
              } catch (err) {
                console.error('[chat] tool error', block.name, err);
                result = { error: 'Tool selhal' };
              }
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }
          }

          convo.push({ role: 'assistant', content: finalMsg.content });
          convo.push({ role: 'user', content: toolResults });
        }

        // Ulozime do cache jen single-turn bez tool-use a s rozumnou delkou odpovedi
        if (isSingleTurn && !usedTool && accumulatedText.trim().length > 20) {
          setCached(userMessage, accumulatedText);
        }

        controller.close();
      } catch (err) {
        console.error('[chat] stream error', err);
        try {
          controller.enqueue(encoder.encode('\n\n(Neco se pokazilo, zkus to znovu.)'));
        } catch {}
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
