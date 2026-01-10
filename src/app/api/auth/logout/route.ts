import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL || process.env.ZABBIX_URL;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("zabbix_token")?.value;

    // Call Zabbix logout if we have a token
    if (token) {
      try {
        await fetch(ZABBIX_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "user.logout",
            params: [],
            auth: token,
            id: 1,
          }),
        });
      } catch (err) {
        console.error("Zabbix logout error:", err);
        // Continue to clear cookies even if Zabbix logout fails
      }
    }

    // Clear cookies
    cookieStore.delete("zabbix_token");
    cookieStore.delete("zabbix_username");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}
