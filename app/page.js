"use client";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [percent, setPercent] = useState(0);

  // NEW: filter & sort state
  const [minRating, setMinRating] = useState(""); // "" means no filter
  const [sortBy, setSortBy] = useState("newest"); // newest | highest | lowest

  const MAX_MB = 500;
  const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

  async function refreshList() {
    try {
      setLoadingList(true);
      const res = await fetch("/api/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "List failed");
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch swings");
    } finally {
      setLoadingList(false);
    }
  }

  function onPick(e) {
    const f = e.target.files?.[0] || null;
    if (!f) return setFile(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      alert("Please select an MP4/MOV/WEBM video.");
      e.target.value = "";
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      alert(`File is ${sizeMB.toFixed(1)} MB. Max allowed is ${MAX_MB} MB.`);
      e.target.value = "";
      return;
    }
    setFile(f);
    setPercent(0);
    setStatus("");
  }

  async function uploadFile() {
    try {
      if (!file) { alert("Pick a video first."); return; }
      setStatus("Requesting upload URL…");
      setPercent(0);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ name: file.name, type: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not get upload URL");

      setStatus("Uploading to S3…");

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadURL);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setPercent(pct);
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setStatus("✅ Uploaded successfully!");
      setFile(null);
      setPercent(0);
      await refreshList();
    } catch (err) {
      console.error(err);
      setStatus("❌ Upload failed. Check console.");
    }
  }

  async function deleteItem(key) {
    if (!confirm("Delete this swing?")) return;
    const res = await fetch("/api/delete", { method: "POST", body: JSON.stringify({ key }) });
    const data = await res.json();
    if (!res.ok) { alert(data?.error || "Delete failed"); return; }
    await refreshList();
  }

  async function setRating(key, rating) {
    const res = await fetch("/api/rate", {
      method: "POST",
      body: JSON.stringify({ key, rating }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Failed to save rating");
      return;
    }
    // update UI without full refresh
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, rating } : it)));
  }

  // Derived list: apply filter + sort client-side
  const filteredSorted = useMemo(() => {
    let list = [...items];

    // filter by min rating if set
    if (minRating !== "") {
      const threshold = Number(minRating);
      list = list.filter((it) => (typeof it.rating === "number" ? it.rating : 0) >= threshold);
    }

    // sort
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    } else if (sortBy === "highest") {
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sortBy === "lowest") {
      list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));
    }

    return list;
  }, [items, minRating, sortBy]);

  useEffect(() => { refreshList(); }, []);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Golf Cloud</h1>

      {/* Upload + controls row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" accept="video/*" onChange={onPick} />
        <button
          onClick={uploadFile}
          disabled={!file}
          style={{ background: "#16a34a", color: "white", padding: "8px 16px", borderRadius: 8, opacity: file ? 1 : 0.5 }}
        >
          Upload Swing
        </button>
        <button
          onClick={refreshList}
          style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: 8 }}
        >
          Refresh
        </button>
        {percent > 0 ? <span>{percent}%</span> : null}
      </div>

      {status ? <p>{status}</p> : null}
      {loadingList ? <p>Loading…</p> : null}

      {/* NEW: Filter & Sort controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", width: "100%", maxWidth: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Min rating</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            style={{ background: "#111827", color: "white", borderRadius: 6, padding: "4px 6px" }}
          >
            <option value="">—</option>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ background: "#111827", color: "white", borderRadius: 6, padding: "4px 6px" }}
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>
      </div>

      {/* Gallery */}
      <div style={{ width: "100%", maxWidth: 1000 }}>
        {filteredSorted.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No swings match your filter.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 12 }}>
            {filteredSorted.map((it) => (
              <div key={it.key} style={{ border: "1px solid #1f2937", padding: 10, borderRadius: 10, background: "#0b0f16" }}>
                <video src={it.url} controls style={{ width: "100%", borderRadius: 8 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
                  <small title={it.key} style={{ color: "#9ca3af" }}>
                    {new Date(it.lastModified).toLocaleString()}
                  </small>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label htmlFor={`r-${it.key}`} style={{ color: "#9ca3af", fontSize: 12 }}>Rating</label>
                    <select
                      id={`r-${it.key}`}
                      value={it.rating ?? ""}
                      onChange={(e) => setRating(it.key, Number(e.target.value))}
                      style={{ background: "#111827", color: "white", borderRadius: 6, padding: "4px 6px" }}
                    >
                      <option value="" disabled>—</option>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    {typeof it.rating === "number" && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>({it.rating}/10)</span>
                    )}
                  </div>

                  <button
                    onClick={() => deleteItem(it.key)}
                    style={{ background: "#dc2626", color: "white", padding: "4px 8px", borderRadius: 6 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 16 }}>
        Tip: large videos may take a bit to upload depending on your internet.
      </p>
    </main>
  );
}



