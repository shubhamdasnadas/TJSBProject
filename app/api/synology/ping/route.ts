import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    const r = await axios.get("http://192.168.1.247:5654/webapi/entry.cgi", {
      timeout: 5000,
      validateStatus: () => true,
    });

    return NextResponse.json({
      ok: true,
      status: r.status,
      data: r.data,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}
