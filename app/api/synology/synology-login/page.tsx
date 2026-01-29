"use client";
import { useState } from "react";
import axios from "axios";

export default function Page() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [out, setOut] = useState<any>(null);

  const login = async () => {
    try {
      const r = await axios.post(
        "/api/synology/login",
        { user, pass },
        { withCredentials: true }
      );
      setOut(r.data);
    } catch (e: any) {
      setOut(e.response?.data || { error: e.message });
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <input placeholder="user" onChange={e=>setUser(e.target.value)} />
      <input placeholder="pass" type="password" onChange={e=>setPass(e.target.value)} />
      <button onClick={login}>login</button>
      <pre>{JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}
