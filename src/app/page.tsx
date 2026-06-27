"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import {
  Mail,
  Send,
  Settings,
  Users,
  FileText,
  Paperclip,
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Terminal,
  UploadCloud,
  Check,
  Sparkles,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  List,
  Heading1,
  Link,
  ChevronRight,
  Info
} from "lucide-react";

interface Recipient {
  id: string;
  email: string;
  status: "pending" | "sending" | "sent" | "failed";
  selected: boolean;
  error?: string;
  timestamp?: string;
  rowValues: Record<string, string>;
}

interface LogEntry {
  id: string;
  text: string;
  type: "info" | "success" | "error";
  time: string;
}

export default function Home() {
  // --- SMTP Settings State ---
  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.gmail.com",
    port: "587",
    secure: false,
    auth: {
      user: "",
      pass: "sybw ubsb fzin oxrs"
    },
    fromName: "",
    fromEmail: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [smtpError, setSmtpError] = useState("");

  // --- Recipients State ---
  const [recipientTab, setRecipientTab] = useState<"csv" | "paste">("csv");
  const [rawPasteEmails, setRawPasteEmails] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // --- Email Editor State ---
  const [subject, setSubject] = useState("Application for Undergraduate Research Internship");
  const [body, setBody] = useState("<p>Dear Professor,</p><p>I hope this email finds you well.</p><p>My name is <strong>Amish Rahman</strong>, and I am a third-year B.Tech student in Computer Science and Engineering at NMAM Institute of Technology, India.</p><p>I am writing to express my interest in joining your research group as an undergraduate research intern. I have a strong interest in Artificial Intelligence, Machine Learning, Deep Learning, Computer Vision, and Data Science, and I am eager to gain hands-on research experience under your guidance.</p><p>Over the past year, I have worked on several AI-driven projects, including an AI-powered FIFA World Cup Predictor, PitchIQ Analytics, and Startup Forge. Through these projects, I have developed practical experience with Python, Machine Learning, Deep Learning, FastAPI, React, SQL, and data analysis.</p><p>You can view my complete resume here: <a href=\"https://drive.google.com/file/d/1hmZUEMS8renxFDudXBc0P7NXegkqlmzN/view?usp=sharing\" target=\"_blank\" rel=\"noopener noreferrer\">Amish Rahman - Resume (Google Drive)</a>.</p><p>I would appreciate the opportunity to discuss any potential remote internship roles or projects with you. Thank you for your time and consideration.</p><p>Sincerely,<br/>Amish Rahman<br/>amishrahmanind@gmail.com</p>");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Attachments State ---
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);

  // --- Campaign Control State ---
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [delay, setDelay] = useState(3); // delay in seconds
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- Preview Modal State ---
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null);

  // Sync state reference to prevent closures in loops
  const stateRef = useRef({
    isSending,
    isPaused,
    recipients,
    currentIndex,
    smtpConfig,
    subject,
    body,
    uploadId,
    delay
  });

  useEffect(() => {
    stateRef.current = {
      isSending,
      isPaused,
      recipients,
      currentIndex,
      smtpConfig,
      subject,
      body,
      uploadId,
      delay
    };
  }, [isSending, isPaused, recipients, currentIndex, smtpConfig, subject, body, uploadId, delay]);

  // Load SMTP Settings from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("automailer_smtp");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setSmtpConfig(parsed);
      } catch (e) {
        console.error("Error loading SMTP config", e);
      }
    }
  }, []);

  // Save SMTP Settings to localStorage
  const handleSmtpChange = (field: string, value: any, isNestedAuth = false) => {
    let updated: any;
    if (isNestedAuth) {
      updated = {
        ...smtpConfig,
        auth: {
          ...smtpConfig.auth,
          [field]: value
        }
      };
    } else {
      updated = {
        ...smtpConfig,
        [field]: value
      };
    }
    setSmtpConfig(updated);
    localStorage.setItem("automailer_smtp", JSON.stringify(updated));
  };

  // Log logger
  const addLog = (text: string, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), text, type, time }, ...prev]);
  };

  // Test SMTP connection
  const testSmtpConnection = async () => {
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      setSmtpStatus("failed");
      setSmtpError("Please fill out all required SMTP fields.");
      addLog("SMTP connection test failed: Missing fields", "error");
      return;
    }

    setSmtpStatus("verifying");
    setSmtpError("");
    addLog(`Testing connection to SMTP server: ${smtpConfig.host}:${smtpConfig.port}...`, "info");

    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig)
      });
      const data = await response.json();
      if (data.success) {
        setSmtpStatus("verified");
        addLog("SMTP server authenticated and ready!", "success");
      } else {
        setSmtpStatus("failed");
        setSmtpError(data.error || "Connection failed");
        addLog(`SMTP connection error: ${data.error}`, "error");
      }
    } catch (err: any) {
      setSmtpStatus("failed");
      setSmtpError(err.message || "Network error verification");
      addLog(`SMTP connection failed: ${err.message}`, "error");
    }
  };

  // Handle Drag events for CSV upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSVFile(e.target.files[0]);
    }
  };

  // Parse CSV File
  const processCSVFile = (file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawHeaders = results.meta.fields || [];
        // Force lowercase search for an email header
        const emailKey = rawHeaders.find((h) => h.toLowerCase() === "email") || rawHeaders[0] || "";

        if (!emailKey) {
          addLog("CSV parsing warning: Could not verify email header.", "error");
        }

        const parsed = results.data
          .map((row: any, index: number) => {
            const emailVal = row[emailKey] || "";
            // Keep all keys mapping to rowValues
            return {
              id: `csv-${index}-${Date.now()}`,
              email: emailVal.trim(),
              status: "pending" as const,
              selected: true,
              rowValues: row
            };
          })
          .filter((r) => r.email !== "");

        setHeaders(rawHeaders);
        setRecipients(parsed);
        setCurrentIndex(0);
        setSentCount(0);
        setFailedCount(0);
        addLog(`Imported ${parsed.length} recipients from CSV. Column variables: ${rawHeaders.join(", ")}`, "success");
      },
      error: (err) => {
        addLog(`Failed to parse CSV: ${err.message}`, "error");
      }
    });
  };

  // Handle manual paste email input
  const processPasteEmails = () => {
    if (!rawPasteEmails.trim()) return;

    // split on newlines, commas, or semicolons
    const emails = rawPasteEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e !== "" && e.includes("@"));

    const parsed = emails.map((email, index) => ({
      id: `paste-${index}-${Date.now()}`,
      email,
      status: "pending" as const,
      selected: true,
      rowValues: { email, Email: email, Name: email.split("@")[0] }
    }));

    setHeaders(["email", "Name"]);
    setRecipients(parsed);
    setCurrentIndex(0);
    setSentCount(0);
    setFailedCount(0);
    addLog(`Imported ${parsed.length} manual recipients. Default tags: {{email}}, {{Name}}`, "success");
  };

  // Interpolation helper
  const interpolate = (template: string, values: Record<string, string>) => {
    let result = template;
    Object.entries(values).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*${key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*\\}\\}`, "gi");
      result = result.replace(regex, val || "");
    });
    return result;
  };

  // Selection toggle
  const toggleRecipientSelect = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = recipients.every((r) => r.selected);
    setRecipients((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const updateRecipientStatus = (id: string, status: Recipient["status"], error?: string) => {
    setRecipients((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              error,
              timestamp: new Date().toLocaleTimeString()
            }
          : r
      )
    );
  };

  // Filter recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const query = searchQuery.toLowerCase();
      const matchesEmail = r.email.toLowerCase().includes(query);
      const matchesMeta = Object.values(r.rowValues).some((v) =>
        String(v).toLowerCase().includes(query)
      );
      return matchesEmail || matchesMeta;
    });
  }, [recipients, searchQuery]);

  // Insert formatting commands into rich editor
  const handleEditorCommand = (command: string, value = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  // Insert placeholder helper at selection/cursor
  const insertPlaceholder = (tag: string) => {
    if (activeField === "subject") {
      const input = document.getElementById("subject-input") as HTMLInputElement;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = input.value;
        const inserted = `{{${tag}}}`;
        const newText = text.substring(0, start) + inserted + text.substring(end);
        setSubject(newText);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + inserted.length, start + inserted.length);
        }, 0);
      }
    } else {
      if (editorRef.current) {
        editorRef.current.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(`{{${tag}}}`);
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
          selection.removeAllRanges();
          selection.addRange(range);
          setBody(editorRef.current.innerHTML);
        } else {
          // Fallback appending
          const html = `{{${tag}}}`;
          editorRef.current.innerHTML += html;
          setBody(editorRef.current.innerHTML);
        }
      }
    }
  };

  // Handle attachment files
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      // Reset uploadId since we changed attachments
      setUploadId(null);
      addLog(`Added ${newFiles.length} file attachment(s).`, "info");
    }
  };

  const removeAttachment = (index: number) => {
    const removed = attachments[index];
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setUploadId(null);
    addLog(`Removed attachment: ${removed.name}`, "info");
  };

  // Start sending loop
  const startCampaign = async () => {
    if (recipients.length === 0) {
      alert("Please load a recipient list first.");
      return;
    }
    const selectedCount = recipients.filter((r) => r.selected).length;
    if (selectedCount === 0) {
      alert("No recipients are selected for sending.");
      return;
    }
    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      alert("Please configure SMTP settings and save them first.");
      return;
    }

    setIsSending(true);
    setIsPaused(false);

    // Sync ref immediately to prevent async state batching delay from aborting the loop
    stateRef.current.isSending = true;
    stateRef.current.isPaused = false;

    // Initial check of SMTP
    if (smtpStatus !== "verified") {
      addLog("Starting verification checklist...", "info");
    }

    let activeUploadId = uploadId;

    // Upload files if present
    if (attachments.length > 0 && !activeUploadId) {
      addLog("Uploading and preparing file attachments...", "info");
      const formData = new FormData();
      attachments.forEach((file) => formData.append("files", file));
      try {
        const uploadRes = await fetch("/api/upload-attachments", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          activeUploadId = uploadData.uploadId;
          setUploadId(activeUploadId);
          addLog("Attachments uploaded and parsed successfully.", "success");
        } else {
          throw new Error(uploadData.error || "Attachment parsing failure");
        }
      } catch (err: any) {
        addLog(`Campaign halted. Attachment failure: ${err.message}`, "error");
        setIsSending(false);
        return;
      }
    }

    addLog(`Campaign started: Sending to ${selectedCount} recipients with a ${delay}s delay...`, "info");

    let idx = currentIndex;
    
    while (idx < recipients.length) {
      // Check for pause/stop triggers
      if (!stateRef.current.isSending) {
        addLog("Campaign execution aborted.", "error");
        break;
      }
      if (stateRef.current.isPaused) {
        addLog("Campaign paused. You can resume when ready.", "info");
        break;
      }

      const rec = recipients[idx];

      if (rec.selected && (rec.status === "pending" || rec.status === "failed")) {
        updateRecipientStatus(rec.id, "sending");
        addLog(`Connecting and sending mail to: ${rec.email}`, "info");

        // Merge placeholders
        const customSubject = interpolate(subject, rec.rowValues);
        const customBody = interpolate(body, rec.rowValues);

        try {
          const sendResponse = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              smtpConfig,
              recipientEmail: rec.email,
              subject: customSubject,
              htmlContent: customBody,
              uploadId: activeUploadId
            })
          });

          const sendData = await sendResponse.json();

          if (sendData.success) {
            updateRecipientStatus(rec.id, "sent");
            setSentCount((c) => c + 1);
            addLog(`Email successfully sent to ${rec.email}`, "success");
          } else {
            updateRecipientStatus(rec.id, "failed", sendData.error);
            setFailedCount((c) => c + 1);
            addLog(`Failed sending to ${rec.email}: ${sendData.error}`, "error");
          }
        } catch (err: any) {
          updateRecipientStatus(rec.id, "failed", err.message);
          setFailedCount((c) => c + 1);
          addLog(`Network transmission error for ${rec.email}: ${err.message}`, "error");
        }

        // Apply delay if not the last item
        if (idx + 1 < recipients.length && stateRef.current.isSending && !stateRef.current.isPaused) {
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }
      }

      idx++;
      setCurrentIndex(idx);
    }

    if (idx >= recipients.length) {
      setIsSending(false);
      addLog("All pending mails in the campaign checklist have been processed!", "success");

      // Clean up server-side attachment cache
      if (activeUploadId) {
        fetch(`/api/upload-attachments?uploadId=${activeUploadId}`, { method: "DELETE" })
          .then(() => {
            setUploadId(null);
            addLog("Server-side attachment buffers cleared successfully.", "success");
          })
          .catch((e) => console.error("Error clearing memory buffers", e));
      }
    }
  };

  const pauseCampaign = () => {
    setIsPaused(true);
    addLog("Campaign paused. Waiting for current process loop to finish...", "info");
  };

  const resumeCampaign = () => {
    setIsPaused(false);
    // Restart sender loop
    setTimeout(() => {
      startCampaign();
    }, 100);
  };

  const stopCampaign = () => {
    setIsSending(false);
    setIsPaused(false);
    addLog("Campaign execution marked as stopped.", "error");
  };

  const resetCampaignStats = () => {
    if (confirm("Reset sending status of all recipients to 'Pending'?")) {
      setRecipients((prev) =>
        prev.map((r) => ({ ...r, status: "pending", error: undefined, timestamp: undefined }))
      );
      setCurrentIndex(0);
      setSentCount(0);
      setFailedCount(0);
      addLog("Campaign status reset. Ready to run.", "info");
    }
  };

  // Sync contentEditable on body change once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body;
    }
  }, []);

  // Compute overall progress
  const activeRecipients = recipients.filter((r) => r.selected);
  const totalCount = activeRecipients.length;
  const processedCount = activeRecipients.filter((r) => r.status === "sent" || r.status === "failed").length;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="card" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(18, 20, 32, 0.65) 100%)" }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: "2.5rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <Mail size={36} style={{ color: "var(--primary)" }} /> AutoMailer Pro
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Create and send personalized bulk email campaigns with dynamic placeholder templates.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {smtpStatus === "verified" ? (
            <span className="badge badge-sent" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <CheckCircle2 size={16} /> SMTP Ready
            </span>
          ) : smtpStatus === "failed" ? (
            <span className="badge badge-failed" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <XCircle size={16} /> SMTP Failed
            </span>
          ) : smtpStatus === "verifying" ? (
            <span className="badge badge-sending" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <RefreshCw size={16} className="editor-btn-spin" /> Verifying...
            </span>
          ) : (
            <span className="badge badge-pending" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <AlertCircle size={16} /> SMTP Offline
            </span>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid-cols-2">
        {/* Left Hand side configuration cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 1: SMTP Config */}
          <section className="card">
            <h2 className="card-title">
              <Settings size={20} style={{ color: "var(--primary)" }} /> SMTP Server Credentials
            </h2>

            <div className="grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Host Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => handleSmtpChange("host", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="587"
                  value={smtpConfig.port}
                  onChange={(e) => handleSmtpChange("port", e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <input
                type="checkbox"
                id="secure-checkbox"
                checked={smtpConfig.secure}
                onChange={(e) => handleSmtpChange("secure", e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="secure-checkbox" className="form-label" style={{ marginBottom: 0, cursor: "pointer" }}>
                Use SSL/TLS (Secure Connection port 465)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Username / Account Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="your.email@gmail.com"
                value={smtpConfig.auth.user}
                onChange={(e) => handleSmtpChange("user", e.target.value, true)}
              />
            </div>

            <div className="form-group" style={{ position: "relative" }}>
              <label className="form-label">SMTP Password / App Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter 16-character App Password"
                  value={smtpConfig.auth.pass}
                  onChange={(e) => handleSmtpChange("pass", e.target.value, true)}
                  style={{ paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border-color)", margin: "1.5rem 0" }} />

            <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>Default Sender Information</h3>

            <div className="grid-cols-2" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">Sender Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={smtpConfig.fromName}
                  onChange={(e) => handleSmtpChange("fromName", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sender Email (defaults to User)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="john@example.com"
                  value={smtpConfig.fromEmail}
                  onChange={(e) => handleSmtpChange("fromEmail", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={testSmtpConnection}>
                Verify Settings
              </button>
            </div>
            {smtpError && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(239,68,68,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.85rem", color: "var(--danger)", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{smtpError}</span>
              </div>
            )}
          </section>

          {/* Card 2: Recipients List */}
          <section className="card" style={{ flexGrow: 1 }}>
            <h2 className="card-title">
              <Users size={20} style={{ color: "var(--primary)" }} /> Recipient List Configuration
            </h2>

            <div className="tab-headers">
              <button
                type="button"
                className={`tab-btn ${recipientTab === "csv" ? "active" : ""}`}
                onClick={() => setRecipientTab("csv")}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                className={`tab-btn ${recipientTab === "paste" ? "active" : ""}`}
                onClick={() => setRecipientTab("paste")}
              >
                Copy & Paste List
              </button>
            </div>

            {recipientTab === "csv" ? (
              <div>
                <div
                  className={`drop-zone ${dragActive ? "active" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("csv-file-input")?.click()}
                >
                  <UploadCloud size={40} className="drop-zone-icon" />
                  <p style={{ fontWeight: 600 }}>Drag & drop your recipient CSV here</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Or click to browse files from your computer
                  </p>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>
                {fileName && (
                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FileText size={18} style={{ color: "var(--primary)" }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{fileName}</span>
                    </div>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => {
                        setFileName("");
                        setRecipients([]);
                        setHeaders([]);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Paste emails separated by commas, semicolons or lines</label>
                  <textarea
                    rows={6}
                    className="form-control"
                    placeholder="john.doe@example.com&#10;jane.smith@example.com, bob.jones@example.com"
                    value={rawPasteEmails}
                    onChange={(e) => setRawPasteEmails(e.target.value)}
                    style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.85rem" }}
                  />
                </div>
                <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={processPasteEmails}>
                  Parse & Load Emails
                </button>
              </div>
            )}

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "var(--text-secondary)", width: "100%", background: "rgba(99,102,241,0.05)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.1)" }}>
                <Info size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span>
                  First column is matched as the recipient email. All other column names (headers) will be exposed as template tags.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Hand Side: Content Editor & Campaign Control */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 3: Email Editor */}
          <section className="card">
            <h2 className="card-title">
              <FileText size={20} style={{ color: "var(--primary)" }} /> Email Template Designer
            </h2>

            {/* Exposed placeholders */}
            {headers.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <span className="form-label" style={{ display: "inline-block", marginRight: "0.5rem" }}>Available Variables:</span>
                <div style={{ display: "inline-block" }}>
                  {headers.map((hdr) => (
                    <button
                      key={hdr}
                      type="button"
                      className="placeholder-tag"
                      onClick={() => insertPlaceholder(hdr)}
                      title={`Insert {{${hdr}}} placeholder`}
                    >
                      {`{{${hdr}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Input */}
            <div className="form-group">
              <label className="form-label">Email Subject Line</label>
              <input
                id="subject-input"
                type="text"
                className="form-control"
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setActiveField("subject")}
              />
            </div>

            {/* Rich Text Body Editor */}
            <div className="form-group">
              <label className="form-label">Email Content Body (HTML)</label>
              <div className="editor-container" onClick={() => setActiveField("body")}>
                {/* Toolbar */}
                <div className="editor-toolbar">
                  <button type="button" className="editor-btn" onClick={() => handleEditorCommand("bold")} title="Bold">
                    <Bold size={16} />
                  </button>
                  <button type="button" className="editor-btn" onClick={() => handleEditorCommand("italic")} title="Italic">
                    <Italic size={16} />
                  </button>
                  <button type="button" className="editor-btn" onClick={() => handleEditorCommand("underline")} title="Underline">
                    <Underline size={16} />
                  </button>
                  <button type="button" className="editor-btn" onClick={() => handleEditorCommand("insertUnorderedList")} title="Bullet List">
                    <List size={16} />
                  </button>
                  <button type="button" className="editor-btn" onClick={() => {
                    const url = prompt("Enter link URL:");
                    if (url) handleEditorCommand("createLink", url);
                  }} title="Insert Link">
                    <Link size={16} />
                  </button>
                  <button type="button" className="editor-btn" onClick={() => handleEditorCommand("removeFormat")} title="Clear Formatting">
                    <RefreshCw size={14} />
                  </button>
                </div>
                {/* Editable Area */}
                <div
                  ref={editorRef}
                  className="editor-content"
                  contentEditable
                  onInput={(e) => setBody(e.currentTarget.innerHTML)}
                  style={{ minHeight: "220px" }}
                />
              </div>
            </div>

            {/* File Attachments */}
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>File Attachments</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {attachments.length} file(s) attached
                </span>
              </label>

              <div
                style={{ border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.75rem", background: "rgba(255,255,255,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => document.getElementById("attachment-input")?.click()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <Paperclip size={16} style={{ color: "var(--primary)" }} />
                  <span>Click to select attachments...</span>
                </div>
                <input
                  id="attachment-input"
                  type="file"
                  multiple
                  onChange={handleAttachmentChange}
                  style={{ display: "none" }}
                />
              </div>

              {attachments.length > 0 && (
                <div className="file-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-name">
                        <Paperclip size={14} style={{ color: "var(--text-secondary)" }} />
                        <span>{file.name}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button type="button" className="file-remove" onClick={() => removeAttachment(index)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Card 4: Campaign Delay & Stats Preview */}
          <section className="card">
            <h2 className="card-title">
              <Sparkles size={20} style={{ color: "var(--primary)" }} /> Campaign Settings
            </h2>

            <div className="grid-cols-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Send Delay (Seconds)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    className="form-control"
                    style={{ padding: 0, height: "8px", cursor: "pointer" }}
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 600, width: "3rem", textAlign: "right" }}>{delay}s</span>
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <span className="form-label" style={{ marginBottom: "0.5rem" }}>Status Overview</span>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
                  <div>Selected: <strong style={{ color: "white" }}>{totalCount}</strong></div>
                  <div>Sent: <strong style={{ color: "var(--success)" }}>{sentCount}</strong></div>
                  <div>Failed: <strong style={{ color: "var(--danger)" }}>{failedCount}</strong></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Campaign Control & Results Dashboard (Full Width) */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2 className="card-title">
          <Play size={20} style={{ color: "var(--primary)" }} /> Campaign Controller & Dashboard
        </h2>

        {/* Dashboard control buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {!isSending ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={startCampaign}
                disabled={recipients.length === 0}
              >
                <Play size={16} /> Start Campaign
              </button>
            ) : isPaused ? (
              <button type="button" className="btn btn-success" onClick={resumeCampaign}>
                <Play size={16} /> Resume Campaign
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={pauseCampaign}>
                <Pause size={16} /> Pause Campaign
              </button>
            )}

            <button
              type="button"
              className="btn btn-danger"
              onClick={stopCampaign}
              disabled={!isSending}
            >
              <Square size={16} /> Stop Campaign
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetCampaignStats}
              disabled={recipients.length === 0}
            >
              <RefreshCw size={16} /> Reset Status
            </button>
          </div>
        </div>

        {/* Campaign progress bar */}
        {totalCount > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              <span>Sending Progress: {processedCount} / {totalCount} emails processed</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {/* Two pane dashboard: Recipients log and Console logs */}
        <div className="grid-cols-2" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
          {/* Left Column: Recipient list status */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem" }}>Recipient Check Queue</h3>
              <div style={{ position: "relative", width: "200px" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search recipients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.25rem", paddingRight: "0.5rem", height: "34px", fontSize: "0.85rem" }}
                />
                <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: "300px", overflowY: "auto" }}>
              <table className="recipient-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={recipients.length > 0 && recipients.every((r) => r.selected)}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th>Email Address</th>
                    <th>Render Preview</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Logs / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No recipients loaded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((rec) => (
                      <tr key={rec.id} style={{ opacity: rec.selected ? 1 : 0.5 }}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={rec.selected}
                            onChange={() => toggleRecipientSelect(rec.id)}
                            style={{ cursor: "pointer" }}
                            disabled={isSending && !isPaused}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 500 }}>{rec.email}</span>
                            {rec.rowValues.Name && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                {rec.rowValues.Name} {rec.rowValues.Company ? `(${rec.rowValues.Company})` : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", height: "auto" }}
                            onClick={() => setPreviewRecipient(rec)}
                          >
                            <Eye size={12} /> Preview
                          </button>
                        </td>
                        <td>
                          {rec.status === "sent" ? (
                            <span className="badge badge-sent">
                              <CheckCircle2 size={12} /> Sent
                            </span>
                          ) : rec.status === "failed" ? (
                            <span className="badge badge-failed" title={rec.error}>
                              <XCircle size={12} /> Failed
                            </span>
                          ) : rec.status === "sending" ? (
                            <span className="badge badge-sending">
                              <RefreshCw size={12} className="editor-btn-spin" /> Sending...
                            </span>
                          ) : (
                            <span className="badge badge-pending">Pending</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {rec.error ? (
                            <span style={{ color: "var(--danger)" }} title={rec.error}>
                              {rec.error.substring(0, 20)}...
                            </span>
                          ) : (
                            rec.timestamp || "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Console output logs */}
          <div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Terminal size={18} style={{ color: "var(--primary)" }} /> Execution Console Logs
            </h3>
            <div className="log-console" style={{ height: "300px", maxHeight: "300px" }}>
              {logs.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", paddingTop: "5rem" }}>
                  Console idle. Waiting for campaign actions...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span className={`log-${log.type}`}>{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>


      {/* Render Preview Modal */}
      {previewRecipient && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="card" style={{ maxWidth: "600px", width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--primary-glow)", position: "relative" }}>
            <h3 className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Recipient Email Preview</span>
              <button
                type="button"
                className="file-remove"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setPreviewRecipient(null)}
              >
                ✕ Close
              </button>
            </h3>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", background: "var(--bg-tertiary)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <div><strong>To:</strong> {previewRecipient.email}</div>
              <div><strong>Original Variables:</strong> {JSON.stringify(previewRecipient.rowValues)}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject Preview</label>
              <div className="form-control" style={{ background: "var(--bg-tertiary)", color: "white", fontWeight: 600 }}>
                {interpolate(subject, previewRecipient.rowValues)}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Body Preview</label>
              <div
                className="form-control"
                style={{ background: "white", color: "#1e293b", minHeight: "200px", overflowY: "auto", overflowWrap: "break-word" }}
                dangerouslySetInnerHTML={{
                  __html: interpolate(body, previewRecipient.rowValues)
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="btn btn-primary" onClick={() => setPreviewRecipient(null)}>
                Done Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

