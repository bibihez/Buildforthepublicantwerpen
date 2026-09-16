import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Password gate for the deployed demo, so strangers can't spend the OpenAI key.
 * Off when DEMO_PASSWORD is unset (local development). Any username is accepted.
 */
export function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(':') + 1);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Bronwijzer demo", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
