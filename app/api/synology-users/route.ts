// app/api/synology-users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const SYNOLOGY_URL = 'http://192.168.1.247:5654/webapi/entry.cgi';
    const API_PARAMS = new URLSearchParams({
      api: 'SYNO.Core.User',
      version: '1',
      method: 'list'
    });

    // Your session cookie
    const SESSION_COOKIE = '7YWSmNSTKwV0GtyIwR3lOrjAaQ5BZWQgcfAEP0gfeGwKRTqxfewWi19qyeTdvYGkifVG4BRtX8WPcGzgpbzOpA';

    const response = await fetch(`${SYNOLOGY_URL}?${API_PARAMS}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `id=${SESSION_COOKIE}`
      }
    });

    const data = await response.json();

    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching Synology users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 500, 
          message: error instanceof Error ? error.message : 'Internal server error' 
        } 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}