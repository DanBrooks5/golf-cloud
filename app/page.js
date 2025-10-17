"use client";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [percent, setPercent] = useState(0);
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("newest");

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
      if (!file) {
        alert("Pick a video first.");
        return;
      }
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
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 PUT ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // ✅ Create thumbnail from first frame
      setStatus("Generating thumbnail...");
      const videoURL = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = videoURL;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.addEventListener("loadeddata", () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);

          fetch("/api/thumbnail", {
            method: "POST",
            body: JSON.stringify({ key: `videos/${file.name}`, dataUrl }),
          }).catch(console.error);

          resolve();
        });
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
    const res = await fetch("/api/delete", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    await refreshList();
  }

  async function saveMeta(key, changes) {
    const item = items.find((i) => i.key === key);
    const body = {
      key,
      rating: changes.rating ?? item.rating ?? null,
      tags: changes.tags ?? item.tags ?? [],
      notes: changes.notes ?? item.notes ?? "",
      favorite: changes.favorite ?? item.favorite ?? false,
    };
    const res = await fetch("/api/meta", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) alert(data?.error || "Failed to save metadata");
    else
      setItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, ...changes } : it))
      );
  }

  const filteredSorted = useMemo(() => {
    let list = [...items];
    if (minRating !== "") {
      const threshold = Number(minRating);
      list = list.filter(
        (it) =>
          (typeof it.rating === "number" ? it.rating : 0) >= threshold
      );
    }
    if (sortBy === "newest")
      list.sort(
        (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
      );
    else if (sortBy === "highest")
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else if (sortBy === "lowest")
      list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));
    return list;
  }, [items, minRating, sortBy]);

  useEffect(() => {
    refreshList();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Golf Cloud</h1>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input type="file" accept="video/*" onChange={onPick} />
        <button
          onClick={uploadFile}
          disabled={!file}
          style={{
            background: "#16a34a",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            opacity: file ? 1 : 0.5,
          }}
        >
          Upload Swing
        </button>
        <button
          onClick={refreshList}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
          }}
        >
          Refresh
        </button>
        {percent > 0 ? <span>{percent}%</span> : null}
      </div>

      {status ? <p>{status}</p> : null}
      {loadingList ? <p>Loading…</p> : null}

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          width: "100%",
          maxWidth: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Min rating</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            style={{
              background: "#111827",
              color: "white",
              borderRadius: 6,
              padding: "4px 6px",
            }}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: "#111827",
              color: "white",
              borderRadius: 6,
              padding: "4px 6px",
            }}
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 1000 }}>
        {filteredSorted.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No swings match your filter.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 12,
            }}
          >
            {filteredSorted.map((it) => (
              <div
                key={it.key}
                style={{
                  border: "1px solid #1f2937",
                  padding: 10,
                  borderRadius: 10,
                  background: "#0b0f16",
                }}
              >
                {it.thumbUrl ? (
                  <img
                    src={it.thumbUrl}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                    onClick={(e) =>
                      e.target.replaceWith(
                        Object.assign(document.createElement("video"), {
                          src: it.url,
                          controls: true,
                          style: e.target.style,
                        })
                      )
                    }
                  />
                ) : (
                  <video
                    src={it.url}
                    controls
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                )}

                {/* Favorite */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <small style={{ color: "#9ca3af" }}>
                    {new Date(it.lastModified).toLocaleString()}
                  </small>
                  <button
                    onClick={() => saveMeta(it.key, { favorite: !it.favorite })}
                    style={{
                      background: it.favorite ? "#facc15" : "#1f2937",
                      color: it.favorite ? "#000" : "white",
                      borderRadius: 6,
                      padding: "4px 8px",
                    }}
                  >
                    {it.favorite ? "★ Fav" : "☆ Fav"}
                  </button>
                </div>

                {/* Rating / Tags / Notes */}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {/* Rating */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ color: "#9ca3af", fontSize: 12 }}>
                      Rating
                    </label>
                    <select
                      value={it.rating ?? ""}
                      onChange={(e) =>
                        saveMeta(it.key, { rating: Number(e.target.value) })
                      }
                      style={{
                        background: "#111827",
                        color: "white",
                        borderRadius: 6,
                        padding: "4px 6px",
                      }}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    {typeof it.rating === "number" && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        ({it.rating}/10)
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ color: "#9ca3af", fontSize: 12 }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      value={it.tags.join(", ")}
                      placeholder="e.g. Driver, 7-Iron"
                      onChange={(e) =>
                        saveMeta(it.key, {
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      style={{
                        background: "#111827",
                        color: "white",
                        borderRadius: 6,
                        padding: "4px 6px",
                        flex: 1,
                      }}
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={{ color: "#9ca3af", fontSize: 12 }}>
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={it.notes}
                      placeholder="Add quick notes about this swing..."
                      onChange={(e) =>
                        saveMeta(it.key, { notes: e.target.value })
                      }
                      style={{
                        background: "#111827",
                        color: "white",
                        borderRadius: 6,
                        padding: "4px 6px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => deleteItem(it.key)}
                  style={{
                    marginTop: 8,
                    background: "#dc2626",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
