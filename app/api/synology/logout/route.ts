import { NextResponse } from "next/server";
import axios from "axios";

const DSM = process.env.SYNOLOGY_URL!;

export async function POST(req: Request) {
  try {
    const cookies = req.headers.get("cookie");

    const { data } = await axios.get(`${DSM}/webapi/entry.cgi`, {
      params: {
        api: "SYNO.API.Auth",
        version: 6,
        method: "logout",
        session: "Core",
      },
      headers: {
        Cookie: cookies || "",
      },
      validateStatus: () => true,
    });

    const res = NextResponse.json(data);

    // Clear session cookies in browser
    res.cookies.set("id", "", { maxAge: 0 });
    res.cookies.set("smid", "", { maxAge: 0 });

    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
