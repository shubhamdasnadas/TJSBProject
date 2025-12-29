import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL || process.env.ZABBIX_URL;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // Validate environment variable
  if (!ZABBIX_URL) {
    console.error("ZABBIX_URL not configured");
    return NextResponse.json(
      { success: false, message: "Server configuration error" },
      { status: 500 }
    );
  }

  console.log("Login attempt for user:", username);
  console.log("Zabbix URL:", ZABBIX_URL);

  try {
    const zbxRes = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "user.login",
        params: { username, password },
        id: 1,
      }),
    });

    if (!zbxRes.ok) {
      console.error("Zabbix HTTP error:", zbxRes.status, zbxRes.statusText);
      return NextResponse.json(
        { success: false, message: `Zabbix server error: ${zbxRes.status}` },
        { status: 502 }
      );
    }

    const data = await zbxRes.json();
    console.log("Zabbix response:", data);

    if (data.error) {
      console.error("Zabbix API error:", data.error);
      const errorMsg = data.error.data || data.error.message || "Invalid credentials";
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: 401 }
      );
    }

    if (!data.result) {
      console.error("No token received from Zabbix");
      return NextResponse.json(
        { success: false, message: "Invalid response from Zabbix" },
        { status: 500 }
      );
    }

    // ✅ Store token in secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("zabbix_token", data.result, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Also store username for display purposes
    cookieStore.set("zabbix_username", username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    console.log("Login successful for user:", username);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false, 
        message: `Unable to connect to Zabbix: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
