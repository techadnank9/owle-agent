"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "guest" | null>(null);

  async function handleGoogleLogin() {
    setLoading("google");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleGuest() {
    setLoading("guest");
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) window.location.href = "/accounts";
    else setLoading(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #0a0a0a;
          color: #f0ebe0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }

        .login-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
          animation: fadeUp 0.5s ease forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-logo {
          font-family: 'Instrument Serif', serif;
          font-size: 1.75rem;
          color: #f0ebe0;
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .login-logo span { color: #e8941a; }

        .login-card {
          width: 100%;
          background: #111111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.75rem;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
        }

        .login-heading {
          text-align: center;
        }
        .login-heading h1 {
          font-family: 'Instrument Serif', serif;
          font-size: 1.9rem;
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin-bottom: 0.5rem;
        }
        .login-heading h1 em { font-style: italic; color: #e8941a; }
        .login-heading p {
          font-size: 0.85rem;
          color: #6b6b6b;
          font-weight: 300;
          line-height: 1.5;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: #f0ebe0;
          color: #0a0a0a;
          border: none;
          border-radius: 7px;
          padding: 0.85rem 1.5rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
        }
        .google-btn:hover:not(:disabled) {
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(240,235,224,0.15);
        }
        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .guest-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: transparent;
          color: #6b6b6b;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 7px;
          padding: 0.75rem 1.5rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .guest-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.15); color: #f0ebe0; }
        .guest-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .google-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .login-terms {
          font-size: 0.73rem;
          color: #4a4a4a;
          text-align: center;
          line-height: 1.6;
        }
        .login-terms a { color: #6b6b6b; text-decoration: underline; }

        .back-link {
          font-size: 0.8rem;
          color: #4a4a4a;
          text-decoration: none;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .back-link:hover { color: #6b6b6b; }

        /* Glow */
        .login-card::before {
          content: '';
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 200px;
          background: radial-gradient(ellipse, rgba(232,148,26,0.08) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }
      `}</style>

      <div className="login-wrap">
        <a href="/" className="login-logo">Owle<span>.</span>AI</a>

        <div className="login-card" style={{position:"relative"}}>
          <div className="login-heading">
            <h1>Welcome <em>back.</em></h1>
            <p>Sign in to your Owle AI workspace to continue.</p>
          </div>

          <div className="divider" />

          <button
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={loading !== null}
          >
            <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",width:"100%"}}>
            <div className="divider" style={{flex:1}} />
            <span style={{fontSize:"0.72rem",color:"#3a3a3a",whiteSpace:"nowrap"}}>or</span>
            <div className="divider" style={{flex:1}} />
          </div>

          <button className="guest-btn" onClick={handleGuest} disabled={loading !== null}>
            {loading === "guest" ? "Entering…" : "Continue as Guest"}
          </button>

          <p className="login-terms">
            By signing in you agree to our terms of service.<br />
            Owle AI is invite-only during early access.
          </p>
        </div>

        <a href="/" className="back-link">← Back to home</a>
      </div>
    </>
  );
}
