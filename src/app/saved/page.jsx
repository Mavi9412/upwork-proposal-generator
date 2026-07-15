"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SavedProposals() {
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "saved"

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/proposals");
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals);
      }
    } catch (error) {
      console.error("Failed to fetch proposals", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSave = async (id, currentStatus) => {
    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isSaved: !currentStatus })
      });
      if (res.ok) {
        setProposals(proposals.map(p => p.id === id ? { ...p, isSaved: !currentStatus } : p));
      }
    } catch (error) {
      console.error("Failed to toggle save status", error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this proposal?")) return;
    try {
      const res = await fetch(`/api/proposals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProposals(proposals.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete proposal", error);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert("Proposal copied to clipboard!");
  };

  const filteredProposals = filter === "saved" ? proposals.filter(p => p.isSaved) : proposals;

  return (
    <div className="layout-container animate-fade-in" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "2.5rem" }}><span className="gradient-text">History</span> & Saved</h1>
        <Link href="/" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.9rem" }}>Back to Generator</Link>
      </header>

      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <button 
          onClick={() => setFilter("all")}
          className={filter === "all" ? "btn-primary" : "btn-secondary"}
        >
          All History
        </button>
        <button 
          onClick={() => setFilter("saved")}
          className={filter === "saved" ? "btn-primary" : "btn-secondary"}
        >
          ⭐ Bookmarked
        </button>
      </div>

      {isLoading ? (
        <p>Loading history...</p>
      ) : filteredProposals.length === 0 ? (
        <div className="glass card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>No proposals found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {filteredProposals.map((proposal) => (
            <div key={proposal.id} className="glass card" style={{ position: "relative", padding: "2rem" }}>
              <div style={{ position: "absolute", top: "20px", right: "20px", display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => handleToggleSave(proposal.id, proposal.isSaved)}
                  style={{ 
                    background: proposal.isSaved ? "rgba(234, 179, 8, 0.1)" : "rgba(255,255,255,0.05)", 
                    color: proposal.isSaved ? "#eab308" : "var(--text-muted)", 
                    border: `1px solid ${proposal.isSaved ? "rgba(234, 179, 8, 0.3)" : "var(--surface-border)"}`, 
                    borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" 
                  }}
                >
                  {proposal.isSaved ? "⭐ Bookmarked" : "☆ Bookmark"}
                </button>
                <button 
                  onClick={() => handleCopy(proposal.editedContent || proposal.content)}
                  style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Copy
                </button>
                <button 
                  onClick={() => handleDelete(proposal.id)}
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Delete
                </button>
              </div>

              <div style={{ marginBottom: "1.5rem", paddingRight: "180px" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>Job Description Snippet</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {proposal.job?.rawText || "No job text available."}
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem", display: "inline-block" }}>
                  {new Date(proposal.createdAt).toLocaleDateString()} • {proposal.mode} Mode • {proposal.style || "No"} Style
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: "1.1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>Generated Proposal</h3>
                <div style={{ padding: "1.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "12px", whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: "1.6" }}>
                  {proposal.editedContent || proposal.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
