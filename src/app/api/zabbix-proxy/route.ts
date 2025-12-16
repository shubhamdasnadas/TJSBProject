import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';
import https from 'https';

// Use environment variable to control TLS verification. If you want to
// disable verification locally, set NODE_TLS_REJECT_UNAUTHORIZED=0 in
// your `.env.local` (do NOT do this in production).
const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';

const httpsAgent = new https.Agent({
  rejectUnauthorized,
});

const zabbixUrl = process.env.ZABBIX_URL || 'http://localhost:8080/api_jsonrpc.php';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('Proxy received:', body);

    const resp = await axios.post(
      zabbixUrl,
      body,
      {
        headers: { 'Content-Type': 'application/json' },
        httpsAgent,
        // accept any status so we forward upstream status back
        validateStatus: () => true,
      }
    );

    console.log('Zabbix upstream status:', resp.status);
    console.log('Zabbix upstream data:', resp.data);

    return NextResponse.json(resp.data, { status: resp.status });
  } catch (err: any) {
    console.error('Zabbix Proxy Error:', err);
    // If axios returned a response (upstream error), forward it back
    if (err?.response) {
      console.error('Upstream response status:', err.response.status);
      console.error('Upstream response data:', err.response.data);
      return NextResponse.json(err.response.data, { status: err.response.status });
    }

    // If request was made but no response received
    if (err?.request) {
      console.error('No response received from upstream, request:', err.request);
      return NextResponse.json(
        { error: 'No response from upstream', message: err?.message ?? 'No response' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Zabbix proxy failed', message: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}