"use client";
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SysReport() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/zabbix-proxy", { // Calling your local proxy
                method: 'POST',
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "history.get",
                    params: {
                        itemids: "143506",
                        history: 0,
                        limit: 50,
                        sortfield: "clock",
                        sortorder: "DESC"
                    },
                    id: 1
                })
            });
            
            const result = await res.json();
            if (result.error) throw new Error(result.error.data || "API Error");

            const formatted = result.result.map(h => ({
                time: new Date(h.clock * 1000).toLocaleTimeString(),
                val: parseFloat(h.value)
            })).reverse();

            setHistory(formatted);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    return (
        <div className="p-4 w-full">
            <h2 className="text-lg font-bold mb-4">System Performance Report</h2>
            
            {error && <div className="text-red-500 mb-4 font-mono text-sm">Error: {error}</div>}

            <div className="bg-slate-800 rounded-lg p-4" style={{ width: '100%', height: '450px' }}>
                {loading ? (
                    <div className="flex h-full items-center justify-center text-cyan-500">Fetching from Zabbix...</div>
                ) : (
                    <ResponsiveContainer width="99%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="time" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip />
                            <Line type="monotone" dataKey="val" stroke="#00d2ff" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}