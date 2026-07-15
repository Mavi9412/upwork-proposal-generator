"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [jobText, setJobText] = useState("");
  const [mode, setMode] = useState("Honest");
  const [style, setStyle] = useState("");
  const [isShort, setIsShort] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profile", { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.profiles && data.profiles.length > 0) {
            setProfiles(data.profiles);
            setSelectedProfileId(data.profiles[0].id);
            setSearchQuery(data.profiles[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profiles", err);
      }
    }
    fetchProfiles();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!jobText.trim()) return;

    setIsGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: jobText, mode, style, isShort, noProfile, profileId: selectedProfileId }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.proposal);
      } else {
        alert("Generation failed. Check console.");
      }
    } catch (error) {
      console.error(error);
      alert("Couldn't reach the server. Make sure the app/dev server is running, then try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/generate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: result.id, editedContent: result.content }),
      });
      if (res.ok) {
        alert("Edits saved! The AI will learn from this for future proposals.");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
  };

  const escapeHtml = (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const handleDownloadWord = () => {
    if (!result) return;
    const html = `<html><body><pre style="font-family:Arial, sans-serif; white-space:pre-wrap;">${escapeHtml(result.content)}</pre></body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proposal.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html><body><pre style="font-family:Arial, sans-serif; white-space:pre-wrap; font-size:14px;">${escapeHtml(result.content)}</pre></body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleToggleBookmark = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: result.id, isSaved: !result.isSaved }),
      });
      if (res.ok) {
        setResult({ ...result, isSaved: !result.isSaved });
      }
    } catch (error) {
      console.error("Failed to bookmark", error);
    }
  };

  return (
    <div className="layout-container animate-fade-in" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "2.5rem" }}><span className="gradient-text">Proposal</span> Generator</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/saved" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.9rem" }}>History & Saved</Link>
          <Link href="/onboarding" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.9rem" }}>Manage Profiles</Link>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        <div className="glass card">
          <h2 style={{ marginBottom: "1rem" }}>Paste Job Post</h2>
          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {profiles.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={noProfile} onChange={(e) => setNoProfile(e.target.checked)} />
                Generate without a profile
              </label>
            )}

            {profiles.length > 0 && !noProfile && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
                <label style={{ fontWeight: 600 }}>Select Profile:</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Search and select a profile..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setSearchQuery("");
                    setIsDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => {
                    setIsDropdownOpen(false);
                    setSearchQuery((q) => {
                      if (q) return q;
                      const selected = profiles.find((p) => p.id === selectedProfileId);
                      return selected ? selected.name : q;
                    });
                  }, 200)}
                />
                
                {isDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: "200px",
                    overflowY: "auto",
                    background: "#12121a", // Solid dark background to prevent transparency mix
                    border: "1px solid var(--surface-border)",
                    borderRadius: "8px",
                    zIndex: 20, // Increased z-index just in case
                    marginTop: "4px",
                    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.8)" // Stronger shadow for depth
                  }}>
                    {profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                      <div 
                        key={p.id} 
                        onMouseDown={() => {
                          setSelectedProfileId(p.id);
                          setSearchQuery(p.name);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: "10px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--surface-border)",
                          background: selectedProfileId === p.id ? "rgba(99,102,241,0.2)" : "transparent",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedProfileId === p.id ? "rgba(99,102,241,0.2)" : "transparent"}
                      >
                        {p.name}
                      </div>
                    ))}
                    {profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div style={{ padding: "10px 16px", color: "var(--text-muted)" }}>
                        No profiles found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <textarea
              className="input-field"
              rows={8}
              placeholder="Paste the Upwork job description here. Include any screening questions at the end."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              disabled={isGenerating}
            />
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Mode:</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="radio" value="Honest" checked={mode === "Honest"} onChange={(e) => setMode(e.target.value)} />
                Honest (Strictly Profile)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="radio" value="Confident" checked={mode === "Confident"} onChange={(e) => setMode(e.target.value)} />
                Confident (Persuasive & Embellished)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginLeft: "1rem" }}>
                <input type="checkbox" checked={isShort} onChange={(e) => setIsShort(e.target.checked)} />
                Short
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Style (optional):</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={style === "Direct"} onChange={(e) => setStyle(e.target.checked ? "Direct" : "")} />
                Direct (one-off jobs)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={style === "Hook"} onChange={(e) => setStyle(e.target.checked ? "Hook" : "")} />
                Hook (long-term / relationship)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={style === "Concise"} onChange={(e) => setStyle(e.target.checked ? "Concise" : "")} />
                Concise (~100 words)
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={isGenerating}>
              {isGenerating ? "Analyzing & Generating..." : "Generate Proposal"}
            </button>
          </form>
        </div>

        {result && (
          <div className="glass card animate-fade-in">
            <h2 style={{ marginBottom: "1rem" }}>Generated Proposal (Edit & Review)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <textarea
                  className="input-field"
                  rows={16}
                  value={result.content}
                  onChange={(e) => setResult({...result, content: e.target.value})}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                  <button 
                    className="btn-secondary" 
                    onClick={handleToggleBookmark}
                    style={{ 
                      borderColor: result.isSaved ? "#eab308" : "",
                      color: result.isSaved ? "#eab308" : ""
                    }}
                  >
                    {result.isSaved ? "⭐ Bookmarked" : "☆ Bookmark"}
                  </button>
                  <button className="btn-secondary" onClick={handleSaveEdit}>
                    Save Final Version
                  </button>
                  <button className="btn-secondary" onClick={handleCopy}>
                    Copy
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadWord}>
                    Download Word
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadPDF}>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
