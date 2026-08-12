"use client";
import { useEffect, useRef } from "react";

// Renders a single AdSense ad unit. The adsbygoogle.js loader is already
// included in layout.jsx — this component only needs the <ins> element and
// the push() call. The ref guard prevents double-push in React Strict Mode.
export default function AdUnit({ slot, className = "" }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div className={`ad-unit${className ? ` ${className}` : ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-5557701409459816"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
