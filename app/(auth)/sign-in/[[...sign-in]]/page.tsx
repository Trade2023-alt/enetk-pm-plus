import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Brand header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--maroon)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div className="text-left">
            <div
              className="text-lg font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              ENETK PM+
            </div>
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Industrial Scheduling
            </div>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Sign in to access your schedule
        </p>
      </div>

      <SignIn
        appearance={{
          variables: {
            colorPrimary:    "hsl(345, 65%, 38%)",
            colorBackground: "hsl(220, 12%, 21%)",
            colorNeutral:    "hsl(220, 10%, 70%)",
            borderRadius:    "8px",
            fontFamily:      "Inter, system-ui, sans-serif",
          },
          elements: {
            card:            "shadow-none border",
            formButtonPrimary: "bg-maroon hover:bg-maroon-light transition-colors",
          },
        }}
      />
    </div>
  );
}
