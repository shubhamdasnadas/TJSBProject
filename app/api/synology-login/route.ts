
import { NextResponse } from 'next/server';
import axios from 'axios';

const DSM_BASE = process.env.SYNOLOGY_URL || 'http://192.168.1.247:5654';

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const { user, pass } = body;

  if (!user || !pass) {
    return NextResponse.json(
      { success: false, error: 'Missing username or password' },
      { status: 400 }
    );
  }

  try {
    const loginUrl = `${DSM_BASE}/webapi/entry.cgi`;

    const res = await axios.get(loginUrl, {
      params: {
        api: 'SYNO.API.Auth',
        version: 6,
        method: 'login',
        account: user,
        passwd: pass,
        session: 'Core',
        format: 'cookie',
      },
      timeout: 10000,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    if (!res.data?.success) {
      return NextResponse.json(
        { success: false, error: 'DSM login failed', dsm: res.data },
        { status: 401 }
      );
    }

    const setCookie = res.headers['set-cookie'];
    if (!setCookie || setCookie.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No session cookie received from DSM' },
        { status: 500 }
      );
    }

    // Forward the cookie(s) to the browser
    const response = NextResponse.json({ success: true });

    setCookie.forEach((cookie: string) => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err.message);
    return NextResponse.json(
      { success: false, error: 'Network error reaching DSM' },
      { status: 502 }
    );
  }
}