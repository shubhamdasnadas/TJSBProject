// app/api/synology-apps/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const SYNOLOGY_URL = 'http://192.168.1.247:5654/webapi/entry.cgi';
    const SESSION_COOKIE = '7YWSmNSTKwV0GtyIwR3lOrjAaQ5BZWQgcfAEP0gfeGwKRTqxfewWi19qyeTdvYGkifVG4BRtX8WPcGzgpbzOpA';

    const API_PARAMS = new URLSearchParams({
      api: 'SYNO.Core.Package',
      version: '2',
      method: 'list'
    });

    const response = await fetch(`${SYNOLOGY_URL}?${API_PARAMS}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `id=${SESSION_COOKIE}`
      }
    });

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
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

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}