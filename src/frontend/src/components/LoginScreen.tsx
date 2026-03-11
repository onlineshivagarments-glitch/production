import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Factory, Fingerprint, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await onLogin();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(var(--background))" }}
    >
      <div className="w-full" style={{ maxWidth: "360px" }}>
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "oklch(var(--primary))" }}
          >
            <Factory className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1
            className="font-heading font-bold text-center"
            style={{
              fontSize: "22px",
              letterSpacing: "-0.02em",
              color: "oklch(var(--foreground))",
            }}
          >
            Production Master Pro
          </h1>
          <p
            className="text-center mt-1"
            style={{
              fontSize: "13px",
              color: "oklch(var(--muted-foreground))",
            }}
          >
            Garment Factory Management
          </p>
        </div>

        <Card
          style={{
            border: "1px solid oklch(var(--border))",
            boxShadow: "0 4px 24px oklch(0.2 0.04 220 / 0.12)",
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full"
                style={{ background: "oklch(var(--primary) / 0.1)" }}
              >
                <Fingerprint
                  className="w-5 h-5"
                  style={{ color: "oklch(var(--primary))" }}
                />
              </div>
              <p
                className="font-semibold text-center"
                style={{
                  fontSize: "16px",
                  color: "oklch(var(--foreground))",
                }}
              >
                Internet Identity Login
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p
              className="text-center text-sm"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Sign in securely using Internet Identity — no username or password
              required.
            </p>

            <Button
              data-ocid="login.submit_button"
              type="button"
              className="w-full mt-1 gap-2"
              style={{ background: "oklch(var(--primary))" }}
              disabled={loading}
              onClick={handleLogin}
            >
              <Fingerprint className="w-4 h-4" />
              {loading ? "Connecting..." : "Login with Internet Identity"}
            </Button>

            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2"
              style={{
                background: "oklch(var(--muted))",
                border: "1px solid oklch(var(--border))",
              }}
            >
              <ShieldCheck
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "oklch(var(--primary))" }}
              />
              <p
                className="text-xs leading-relaxed"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                Internet Identity is ICP's secure, decentralized authentication
                system. No passwords stored — your identity is protected by your
                device.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
