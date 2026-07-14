"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Onboarding() {
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "manual"
  const [profileText, setProfileText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // null | "success" | "error"
  const [uploadMessage, setUploadMessage] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profile", { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.profiles) {
            setSavedProfiles(data.profiles);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profiles", error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    fetchProfiles();
  }, []);

  const handleDeleteProfile = async (id) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    try {
      const res = await fetch(`/api/profile?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedProfiles(savedProfiles.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete profile", error);
    }
  };

  const handleEditClick = (profile) => {
    setEditingProfileId(profile.id);
    setEditProfileName(profile.name);
  };

  const handleSaveProfileName = async (id) => {
    if (!editProfileName.trim()) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editProfileName })
      });
      if (res.ok) {
        setSavedProfiles(savedProfiles.map(p => p.id === id ? { ...p, name: editProfileName } : p));
        setEditingProfileId(null);
      }
    } catch (error) {
      console.error("Failed to update profile name", error);
    }
  };

  // --- Manual Text Submit ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!profileText.trim() || !profileName.trim()) {
      alert("Profile Name aur text dono zaroori hain.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: profileText, name: profileName }),
      });

      if (res.ok) {
        setProfileText("");
        setProfileName("");
        alert("Profile saved successfully!");
        // Refresh profiles
        const refresh = await fetch("/api/profile", { cache: 'no-store' });
        const data = await refresh.json();
        if (data.profiles) setSavedProfiles(data.profiles);
      } else {
        alert("Failed to save profile. Check console for details.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CV File Upload ---
  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "text/plain"];
    const isAllowed = allowed.includes(file.type) || file.name.endsWith(".pdf") || file.name.endsWith(".txt");
    if (!isAllowed) {
      setUploadStatus("error");
      setUploadMessage("❌ Sirf PDF ya TXT file upload karein.");
      return;
    }
    setUploadedFile(file);
    setUploadStatus(null);
    setUploadMessage("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleCVUpload = async () => {
    if (!uploadedFile || !profileName.trim()) {
      alert("Profile Name aur CV dono zaroori hain.");
      return;
    }

    setIsSubmitting(true);
    setUploadStatus(null);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("cv", uploadedFile);
      if (profileName) formData.append("profileName", profileName);

      const res = await fetch("/api/cv-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus("success");
        setUploadMessage("✅ CV successfully upload ho gaya! Profile ban rahi hai...");
        setProfileName("");
        setUploadedFile(null);
        // Refresh profiles
        const refresh = await fetch("/api/profile", { cache: 'no-store' });
        const data = await refresh.json();
        if (data.profiles) setSavedProfiles(data.profiles);
      } else {
        setUploadStatus("error");
        setUploadMessage("❌ " + (data.error || "Upload failed. Dobara try karein."));
      }
    } catch (error) {
      console.error(error);
      setUploadStatus("error");
      setUploadMessage("❌ Network error. Dobara try karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout-container animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", minHeight: "100vh" }}>
      <div className="glass card" style={{ maxWidth: "650px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>
            Welcome, let&apos;s build your <span className="gradient-text">Profile</span>
          </h1>
          <Link href="/" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.9rem" }}>
            Back to Generator
          </Link>
        </div>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          Naye profile ka naam rakhein aur CV upload karein ya manually details likhein.
        </p>

        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Profile Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Frontend Developer, Content Writer"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex",
          gap: "0",
          marginBottom: "2rem",
          background: "rgba(15,15,25,0.5)",
          borderRadius: "12px",
          padding: "4px",
          border: "1px solid var(--surface-border)"
        }}>
          <button
            onClick={() => setActiveTab("upload")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
              transition: "all 0.2s ease",
              background: activeTab === "upload" ? "linear-gradient(135deg, #4f46e5, #8b5cf6)" : "transparent",
              color: activeTab === "upload" ? "#fff" : "var(--text-muted)",
            }}
          >
            📄 CV Upload
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
              transition: "all 0.2s ease",
              background: activeTab === "manual" ? "linear-gradient(135deg, #4f46e5, #8b5cf6)" : "transparent",
              color: activeTab === "manual" ? "#fff" : "var(--text-muted)",
            }}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {/* CV UPLOAD TAB */}
        {activeTab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#6366f1" : uploadedFile ? "#10b981" : "var(--surface-border)"}`,
                borderRadius: "16px",
                padding: "3rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                background: dragOver
                  ? "rgba(99,102,241,0.08)"
                  : uploadedFile
                  ? "rgba(16,185,129,0.05)"
                  : "rgba(15,15,25,0.3)",
                transform: dragOver ? "scale(1.01)" : "scale(1)",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                style={{ display: "none" }}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              {uploadedFile ? (
                <>
                  <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
                  <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--success)" }}>
                    {uploadedFile.name}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
                    {(uploadedFile.size / 1024).toFixed(1)} KB • Click to change
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📂</div>
                  <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                    Yahan CV drag & drop karein
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    ya click karein file choose karne ke liye
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.75rem" }}>
                    Supported: PDF, TXT
                  </p>
                </>
              )}
            </div>

            {/* Status Message */}
            {uploadMessage && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: uploadStatus === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${uploadStatus === "success" ? "#10b981" : "#ef4444"}`,
                color: uploadStatus === "success" ? "#10b981" : "#ef4444",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}>
                {uploadMessage}
              </div>
            )}

            {/* Upload Button */}
            <button
              className="btn-primary"
              onClick={handleCVUpload}
              disabled={!uploadedFile || isSubmitting}
            >
              {isSubmitting ? "CV Upload ho rahi hai... ⏳" : "CV Upload karein & Profile Banao"}
            </button>
          </div>
        )}

        {/* MANUAL TAB */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
              Apni skills, experience, best projects, aur achievements apne alfaaz mein likhein. Formatting ki fikr mat karein, main khud structure kar lunga.
            </p>
            <textarea
              className="input-field"
              rows={10}
              placeholder="Misal: Mujhe 5 saal ka React aur Node.js ka tajurba hai. Mera behtareen project ek e-commerce platform tha jis ne sales 30% barha diya..."
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              disabled={isSubmitting}
            />
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Profile structure ho rahi hai... ⏳" : "Profile Save karein"}
            </button>
          </form>
        )}
      </div>

      {/* SAVED PROFILES DISPLAY */}
      {savedProfiles.length > 0 && (
        <div style={{ maxWidth: "650px", width: "100%", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Mojooda <span className="gradient-text">Profiles</span>
          </h2>
          <input
            type="text"
            className="input-field"
            placeholder="Search profiles by name..."
            value={profileSearchQuery}
            onChange={(e) => setProfileSearchQuery(e.target.value)}
          />
          {savedProfiles
            .filter((p) => p.name.toLowerCase().includes(profileSearchQuery.toLowerCase()))
            .map((profile) => (
            <div key={profile.id} className="glass card" style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "20px", right: "20px", display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => handleEditClick(profile)}
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Edit Name
                </button>
                <button 
                  onClick={() => handleDeleteProfile(profile.id)}
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                >
                  Delete
                </button>
              </div>
              
              {editingProfileId === profile.id ? (
                <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ flex: 1, padding: "8px" }} 
                    value={editProfileName} 
                    onChange={(e) => setEditProfileName(e.target.value)} 
                  />
                  <button onClick={() => handleSaveProfileName(profile.id)} className="btn-primary" style={{ padding: "8px 16px", minWidth: "auto" }}>Save</button>
                  <button onClick={() => setEditingProfileId(null)} className="btn-secondary" style={{ padding: "8px 16px" }}>Cancel</button>
                </div>
              ) : (
                <h3 style={{ marginBottom: "1.5rem", fontSize: "1.3rem" }}>{profile.name}</h3>
              )}
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div>
                  <h4 style={{ fontSize: "1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>🛠 Skills</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {JSON.parse(profile.skills || "[]").map((skill, i) => (
                      <span key={i} style={{ background: "rgba(99,102,241,0.1)", color: "#c4b5fd", padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", border: "1px solid rgba(99,102,241,0.2)" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: "1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>💼 Experience</h4>
                  <ul style={{ color: "var(--foreground)", fontSize: "0.95rem", paddingLeft: "1.2rem", margin: 0 }}>
                    {JSON.parse(profile.experience || "[]").map((exp, i) => (
                      <li key={i} style={{ marginBottom: "0.3rem" }}>{exp}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: "1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>🚀 Projects</h4>
                  <ul style={{ color: "var(--foreground)", fontSize: "0.95rem", paddingLeft: "1.2rem", margin: 0 }}>
                    {JSON.parse(profile.projects || "[]").map((proj, i) => (
                      <li key={i} style={{ marginBottom: "0.3rem" }}>{proj}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: "1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>⚙️ Tools</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {JSON.parse(profile.tools || "[]").map((tool, i) => (
                      <span key={i} style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid var(--surface-border)" }}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                
                {profile.rawText && (
                  <div style={{ marginTop: "1rem" }}>
                    <details>
                      <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem" }}>Raw Text Dekhein</summary>
                      <div style={{ marginTop: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)", maxHeight: "200px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                        {profile.rawText}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
