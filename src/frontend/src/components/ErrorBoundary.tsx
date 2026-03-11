import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
            background: "#0f172a",
            color: "#f1f5f9",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "1rem",
              padding: "2.5rem 2rem",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: "#94a3b8",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              An unexpected error occurred. Your data is safe. Please reload the
              app to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.6rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
