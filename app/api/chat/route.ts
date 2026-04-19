import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '@/lib/rate-limit';
import { getGymCount } from '@/lib/stats';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Msg = { role: 'user' | 'assistant'; content: string };

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 600;
const MAX_HISTORY = 12; // keep last 12 turns
const MAX_INPUT_CHARS = 2000;

function clientKey(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  return `chat:${ip}`;
}

function buildSystemPrompt(gymCount: number): string {
  return `Jsi chatbot na webu IRON (ironmap.cz) - největším adresáři posiloven v České republice. Aktuálně máme v databázi ${gymCount} gymů.

TVŮJ ÚKOL:
- Pomáháš návštěvníkům najít vhodnou posilovnu/fitness centrum
- Odpovídáš na dotazy o fungování webu (FAQ, kontakt, doplnění gymu)
- Vysvětluješ majitelům gymů naše placené tiery a nasměruješ je k registraci

JAK HLEDAT GYMY:
- Posilovny ve městě: odkaž na /posilovny/[mesto] (např. /posilovny/praha, /posilovny/brno)
- Kategorie: /kategorie/[kategorie] - dostupné: posilovna, crossfit, joga, pilates, outdoor, bojove-sporty, spinning, bazen
- Detail gymu: /posilovny/[slug]

PRICING (pro majitele gymů):
- Free: základní listing zdarma
- Pro: 399 Kč/měsíc - více fotek, kontakt, statistiky
- Premium: 999 Kč/měsíc - top pozice, vlastní branding
- Trenéři: 299 Kč/měsíc - profil trenéra
- Registrace: /pro-majitele

DŮLEŽITÉ STRÁNKY:
- /pro-majitele - pricing a registrace pro majitele
- /kontakt - kontakt na tým
- /o-projektu - info o projektu
- /treneri - sekce pro trenéry

STYL:
- Odpovídej česky, stručně, lidsky
- Bez em-dashů a en-dashů, používej pomlčky
- Max 3-4 věty na odpověď
- Když posíláš odkaz, napiš ho jako relativní cestu (např. /posilovny/praha) - chatové UI ho zformátuje
- Když nevíš, přiznej to a odkaž na /kontakt
- Nic si nevymýšlej - ceny, URL a fakta drž přesně podle tohoto promptu`;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'Chat není nakonfigurován' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: 20 zpráv za 5 minut na IP
  if (!rateLimit(clientKey(req), 20, 5 * 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Příliš mnoho zpráv. Zkus to za chvíli.' }), {
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
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0
    ) {
      messages.push({ role: m.role, content: m.content.slice(0, MAX_INPUT_CHARS) });
    }
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return new Response(JSON.stringify({ error: 'Chybí zpráva uživatele' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const trimmed = messages.slice(-MAX_HISTORY);

  let gymCount = 1500;
  try {
    gymCount = await getGymCount();
  } catch {
    // use fallback
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(gymCount),
      messages: trimmed,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[chat] error', err);
    return new Response(JSON.stringify({ error: 'Něco se pokazilo, zkus to znovu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
