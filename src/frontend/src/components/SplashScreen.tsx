import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // After 2.2s, start fade-out; after fade (0.6s), call onDone
    const fadeTimer = setTimeout(() => setVisible(false), 2200);
    const doneTimer = setTimeout(() => onDone(), 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      data-ocid="splash.panel"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease-out",
      }}
    >
      {/* Subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Logo mark — thin circle accent */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            width: "48px",
            height: "3px",
            background:
              "linear-gradient(90deg, transparent, #e8c060, transparent)",
            borderRadius: "2px",
          }}
        />

        {/* Brand name */}
        <h1
          style={{
            fontFamily: "'Cabinet Grotesk', 'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(64px, 20vw, 108px)",
            fontWeight: 900,
            letterSpacing: "0.12em",
            color: "#f5f0e8",
            lineHeight: 1,
            margin: 0,
            textShadow:
              "0 0 60px rgba(232, 192, 96, 0.25), 0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          SG-9
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'General Sans', 'Outfit', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.35em",
            color: "rgba(232, 192, 96, 0.75)",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Production Master Pro
        </p>

        {/* Bottom accent line */}
        <div
          style={{
            width: "48px",
            height: "3px",
            background:
              "linear-gradient(90deg, transparent, #e8c060, transparent)",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Loading dots */}
      <div
        style={{
          position: "absolute",
          bottom: "48px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "rgba(232, 192, 96, 0.6)",
              animation: `splash-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
