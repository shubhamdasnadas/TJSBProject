import React from 'react'

const Vmanage = () => {

    async function load() {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);

        try {
            const res = await fetch("/api/sdwan/tunnels");
            const json = await res.json();

            const data = transformJsonToRows(json);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
            setRows(data);
        } catch (e) {
            console.error("JSON LOAD ERROR:", e);
            setRows([]);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div>
            
        </div>
    )
}

export default Vmanage