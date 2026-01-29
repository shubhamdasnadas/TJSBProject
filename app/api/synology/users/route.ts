// LINE 1
import { NextResponse } from "next/server";
import axios from "axios";

// LINE 5
const SYNO_URL = "http://192.168.1.247:5654/webapi/entry.cgi";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie"); // DSM session cookie

    const res = await axios.get(SYNO_URL, {
      params: {
        api: "SYNO.Core.User",
        version: 1,
        method: "list",
      },
      headers: {
        Cookie: cookie || "",
      },
    });

    return NextResponse.json(res.data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
