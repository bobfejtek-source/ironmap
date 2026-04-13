import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref || !ref.startsWith('places/')) {
    return new NextResponse('Invalid ref', { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new NextResponse('No API key', { status: 500 });

  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse('Photo fetch failed', { status: res.status });

    const data = await res.json() as { photoUri?: string };
    if (!data.photoUri) return new NextResponse('No photoUri', { status: 502 });

    // Redirect to the signed Google photo URL (no CORS issues, cached by browser)
    return NextResponse.redirect(data.photoUri);
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
