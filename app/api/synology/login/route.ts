import { NextResponse } from "next/server";
import axios from "axios";

const DSM = "http://192.168.1.247:5654";

export async function POST(req: Request) {
  const { user, pass } = await req.json();

  const r = await axios.get(`${DSM}/webapi/entry.cgi`, {
    params: {
      api: "SYNO.API.Auth",
      version: 6,
      method: "login",
      account: user,
      passwd: pass,
      session: "Core",
      format: "cookie",
    },
    headers: { Accept: "application/json" },
    withCredentials: true,
    validateStatus: () => true,
  });

  if (!r.data?.success) {
    return NextResponse.json(r.data, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  // forward cookies
  const cookies = r.headers["set-cookie"];
  if (cookies) {
    cookies.forEach((c: string) => {
      res.headers.append("Set-Cookie", c);
    });
  }

  return res;
}
