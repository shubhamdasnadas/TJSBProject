"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/login", {
        username,
        password,
      });

      if (res.data.success) {
        router.push("/dashboard");
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Unable to login. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center 
      bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200">

      <form
        onSubmit={handleLogin}
        className="bg-white/60 backdrop-blur-xl shadow-2xl 
          border border-white/50 rounded-3xl p-10 w-96 space-y-6"
      >
        <div className="flex justify-center">
          <Image
            src="/techsec-logo.png"
            alt="TechSec Digital"
            width={140}
            height={140}
          />
        </div>

        <h1 className="text-l font-bold text-center text-blue-900">
          NMS Login
        </h1>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-100 p-2 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
