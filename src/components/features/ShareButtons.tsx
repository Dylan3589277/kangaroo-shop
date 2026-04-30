"use client";
import { useState } from "react";

interface Props { url: string; title: string; locale: string; }

export function ShareButtons({ url, title, locale }: Props) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);
  const labels = {
    ja: { copy: "リンクをコピー", copied: "コピーしました!" },
    zh: { copy: "复制链接", copied: "已复制!" },
    en: { copy: "Copy Link", copied: "Copied!" },
  };
  const t = labels[locale as keyof typeof labels] || labels.en;
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const btnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd",
    background: "#fff", cursor: "pointer", fontSize: "13px",
    textDecoration: "none", color: "#333", marginRight: 8, marginBottom: 8,
  };
  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-lg)", marginBottom: 12 }}>
        {locale === "ja" ? "シェア" : locale === "zh" ? "分享" : "Share"}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <a href={`https://line.me/R/msg/text/?${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener" style={btnStyle}>💬 LINE</a>
        <a href={`https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener" style={btnStyle}>𝕏 X</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener" style={btnStyle}>📘 FB</a>
        <a href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener" style={btnStyle}>📲 WhatsApp</a>
        <button onClick={handleCopy} style={btnStyle}>{copied ? "✅ " + t.copied : "🔗 " + t.copy}</button>
      </div>
    </div>
  );
}
