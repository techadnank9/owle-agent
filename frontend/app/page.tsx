import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #0a0a0a;
          --bg2: #111111;
          --border: rgba(255,255,255,0.08);
          --text: #f0ebe0;
          --muted: #6b6b6b;
          --accent: #e8941a;
          --accent2: #f5b553;
        }

        .landing * { box-sizing: border-box; margin: 0; padding: 0; }
        .landing { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }

        /* Noise texture overlay */
        .landing::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }

        .landing > * { position: relative; z-index: 1; }

        /* Nav */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          backdrop-filter: blur(16px);
          background: rgba(10,10,10,0.85);
          z-index: 100;
        }
        .nav-logo {
          font-family: 'Instrument Serif', serif;
          font-size: 1.35rem;
          color: var(--text);
          text-decoration: none;
          letter-spacing: -0.01em;
        }
        .nav-logo span { color: var(--accent); }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-links a { font-size: 0.85rem; color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 400; letter-spacing: 0.01em; }
        .nav-links a:hover { color: var(--text); }
        .nav-cta {
          background: var(--accent);
          color: #0a0a0a;
          padding: 0.5rem 1.25rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .nav-cta:hover { background: var(--accent2); transform: translateY(-1px); }

        /* Hero */
        .hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 7rem 3rem 5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 1.5rem;
          border: 1px solid rgba(232,148,26,0.3);
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
        }
        .hero-eyebrow::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: 3.75rem;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 1.5rem;
        }
        .hero-title em {
          font-style: italic;
          color: var(--accent);
        }
        .hero-sub {
          font-size: 1.05rem;
          line-height: 1.65;
          color: var(--muted);
          font-weight: 300;
          margin-bottom: 2.5rem;
          max-width: 420px;
        }
        .hero-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .btn-primary {
          background: var(--accent);
          color: #0a0a0a;
          padding: 0.75rem 1.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover { background: var(--accent2); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,148,26,0.25); }
        .btn-ghost {
          color: var(--muted);
          font-size: 0.9rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: color 0.2s;
          font-weight: 400;
        }
        .btn-ghost:hover { color: var(--text); }
        .btn-ghost::after { content: '→'; transition: transform 0.2s; }
        .btn-ghost:hover::after { transform: translateX(4px); }

        /* Hero visual */
        .hero-visual {
          position: relative;
        }
        .dashboard-mockup {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .mockup-header {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .mockup-dot { width: 8px; height: 8px; border-radius: 50%; }
        .mockup-title { font-size: 0.7rem; color: var(--muted); margin-left: 0.5rem; font-weight: 500; letter-spacing: 0.04em; }
        .mockup-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .mockup-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.65rem 0.85rem;
          animation: slideIn 0.4s ease forwards;
          opacity: 0;
        }
        .mockup-row:nth-child(1) { animation-delay: 0.2s; }
        .mockup-row:nth-child(2) { animation-delay: 0.4s; }
        .mockup-row:nth-child(3) { animation-delay: 0.6s; }
        .mockup-row:nth-child(4) { animation-delay: 0.8s; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mockup-badge {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 100px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .badge-green { background: rgba(34,197,94,0.15); color: #4ade80; }
        .badge-amber { background: rgba(232,148,26,0.15); color: var(--accent2); }
        .badge-blue { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .mockup-name { font-size: 0.78rem; font-weight: 500; color: var(--text); flex: 1; }
        .mockup-score { font-size: 0.7rem; color: var(--muted); }
        .mockup-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.6rem;
          margin-top: 0.4rem;
        }
        .stat-mini {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.65rem;
          text-align: center;
        }
        .stat-mini-val { font-size: 1.1rem; font-weight: 600; color: var(--accent); font-family: 'Instrument Serif', serif; }
        .stat-mini-lbl { font-size: 0.62rem; color: var(--muted); margin-top: 0.2rem; letter-spacing: 0.04em; text-transform: uppercase; }

        /* Glow behind mockup */
        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(232,148,26,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        /* Stats bar */
        .stats-bar {
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--bg2);
        }
        .stats-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 3rem;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        .stat-item { text-align: center; }
        .stat-value {
          font-family: 'Instrument Serif', serif;
          font-size: 2.5rem;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .stat-value span { color: var(--accent); }
        .stat-label { font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; font-weight: 400; letter-spacing: 0.02em; }

        /* Pipeline section */
        .section { max-width: 1100px; margin: 0 auto; padding: 6rem 3rem; }
        .section-eyebrow {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 1rem;
        }
        .section-title {
          font-family: 'Instrument Serif', serif;
          font-size: 2.75rem;
          letter-spacing: -0.025em;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 1rem;
        }
        .section-title em { font-style: italic; color: var(--accent); }
        .section-sub { font-size: 1rem; color: var(--muted); line-height: 1.65; max-width: 520px; font-weight: 300; }

        .pipeline {
          margin-top: 4rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .pipeline-step {
          background: var(--bg);
          padding: 2rem;
          position: relative;
          transition: background 0.2s;
        }
        .pipeline-step:hover { background: rgba(255,255,255,0.02); }
        .step-num {
          font-family: 'Instrument Serif', serif;
          font-size: 2.5rem;
          color: rgba(232,148,26,0.2);
          line-height: 1;
          margin-bottom: 0.75rem;
          letter-spacing: -0.04em;
        }
        .step-title { font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 0.5rem; }
        .step-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.6; font-weight: 300; }
        .step-tag {
          display: inline-block;
          margin-top: 0.75rem;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
          border: 1px solid rgba(232,148,26,0.25);
          padding: 0.2rem 0.5rem;
          border-radius: 3px;
        }

        /* Features */
        .features-grid {
          margin-top: 4rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .feature-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 2rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .feature-card:hover { border-color: rgba(232,148,26,0.3); transform: translateY(-2px); }
        .feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(232,148,26,0.1);
          border: 1px solid rgba(232,148,26,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }
        .feature-title { font-size: 0.95rem; font-weight: 600; color: var(--text); margin-bottom: 0.5rem; }
        .feature-desc { font-size: 0.83rem; color: var(--muted); line-height: 1.65; font-weight: 300; }

        /* CTA section */
        .cta-section {
          border-top: 1px solid var(--border);
          background: var(--bg2);
        }
        .cta-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 7rem 3rem;
          text-align: center;
        }
        .cta-title {
          font-family: 'Instrument Serif', serif;
          font-size: 3.25rem;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 1.25rem;
          line-height: 1.1;
        }
        .cta-title em { font-style: italic; color: var(--accent); }
        .cta-sub { font-size: 1rem; color: var(--muted); font-weight: 300; margin-bottom: 2.5rem; }
        .cta-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }

        /* Footer */
        .footer {
          border-top: 1px solid var(--border);
          padding: 2rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1100px;
          margin: 0 auto;
        }
        .footer-logo {
          font-family: 'Instrument Serif', serif;
          font-size: 1rem;
          color: var(--muted);
          text-decoration: none;
        }
        .footer-logo span { color: var(--accent); }
        .footer-copy { font-size: 0.75rem; color: var(--muted); }

        @media (max-width: 768px) {
          .hero { grid-template-columns: 1fr; padding: 4rem 1.5rem 3rem; gap: 2.5rem; }
          .hero-title { font-size: 2.5rem; }
          .nav { padding: 1.25rem 1.5rem; }
          .nav-links { display: none; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); padding: 2rem 1.5rem; }
          .section { padding: 4rem 1.5rem; }
          .pipeline { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr; }
          .section-title { font-size: 2rem; }
          .cta-title { font-size: 2.25rem; }
          .cta-inner { padding: 5rem 1.5rem; }
        }
      `}</style>

      <div className="landing">
        {/* Nav */}
        <nav className="nav">
          <a href="/" className="nav-logo">Owle<span>.</span>AI</a>
          <div className="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <Link href="/login" className="nav-cta">Get Started →</Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div>
            <div className="hero-eyebrow">Healthcare GTM Agent</div>
            <h1 className="hero-title">
              Close more pilots.<br />
              <em>Without the grind.</em>
            </h1>
            <p className="hero-sub">
              Owle AI identifies high-fit SNFs, drafts personalised outreach, classifies replies, and books meetings — fully automated with human review at every step.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-primary">Get Started</Link>
              <a href="#how-it-works" className="btn-ghost">See how it works</a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-glow" />
            <div className="dashboard-mockup">
              <div className="mockup-header">
                <div className="mockup-dot" style={{background:"#ff5f56"}} />
                <div className="mockup-dot" style={{background:"#ffbd2e"}} />
                <div className="mockup-dot" style={{background:"#27c93f"}} />
                <span className="mockup-title">Reply Inbox · 4 new</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-row">
                  <span className="mockup-badge badge-green">Interested</span>
                  <span className="mockup-name">West Valley Post Acute</span>
                  <span className="mockup-score">ICP 88</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-badge badge-green">Interested</span>
                  <span className="mockup-name">SF Health Care & Rehab</span>
                  <span className="mockup-score">ICP 95</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-badge badge-amber">Not now</span>
                  <span className="mockup-name">Sunrise Skilled Nursing</span>
                  <span className="mockup-score">ICP 71</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-badge badge-blue">Referral</span>
                  <span className="mockup-name">Pine Creek Healthcare</span>
                  <span className="mockup-score">ICP 79</span>
                </div>
                <div className="mockup-stats">
                  <div className="stat-mini">
                    <div className="stat-mini-val">9</div>
                    <div className="stat-mini-lbl">AI Nodes</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-val">2</div>
                    <div className="stat-mini-lbl">Meetings</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-val">94%</div>
                    <div className="stat-mini-lbl">Accuracy</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stats-inner">
            <div className="stat-item">
              <div className="stat-value">9<span>+</span></div>
              <div className="stat-label">AI agent nodes</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">100<span>%</span></div>
              <div className="stat-label">Human approved before send</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">30<span>s</span></div>
              <div className="stat-label">From reply to classified</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">0<span>x</span></div>
              <div className="stat-label">Manual CRM updates</div>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <section className="section" id="how-it-works">
          <div className="section-eyebrow">Pipeline</div>
          <h2 className="section-title">From cold account<br />to <em>booked meeting.</em></h2>
          <p className="section-sub">Nine specialised AI nodes handle every step of your outreach pipeline — you stay in control with human-in-the-loop review.</p>

          <div className="pipeline">
            {[
              { num: "01", title: "ICP & Priority Scoring", desc: "Claude scores every account against your ideal customer profile and ranks by priority.", tag: "Account Selector" },
              { num: "02", title: "Stakeholder Mapping", desc: "Identifies decision-makers — Administrator, DON, CFO — and the right channel to reach each.", tag: "Stakeholder Mapper" },
              { num: "03", title: "Strategy Decider", desc: "Picks the best outreach angle and value proposition based on facility data.", tag: "Strategy Decider" },
              { num: "04", title: "Personalised Outreach", desc: "Drafts bespoke email and LinkedIn messages using account-specific facts.", tag: "Outreach Generator" },
              { num: "05", title: "HITL Review", desc: "Pipeline pauses. You approve or reject every draft before anything is sent.", tag: "Approval Queue" },
              { num: "06", title: "Reply Classification", desc: "Incoming replies are classified instantly — interested, referral, not now, and more.", tag: "Reply Classifier" },
              { num: "07", title: "Auto-Response Drafts", desc: "Suggested replies written for every inbound message, ready to send in one click.", tag: "Response Generator" },
              { num: "08", title: "Meeting Booking", desc: "Detects proposed times, creates Google Calendar events, sends Meet links automatically.", tag: "Meeting Booker" },
              { num: "09", title: "Learning Updater", desc: "Each run improves the next — patterns across accounts sharpen future strategy.", tag: "Learning Updater" },
            ].map(s => (
              <div key={s.num} className="pipeline-step">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
                <span className="step-tag">{s.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="section" id="features" style={{paddingTop: 0}}>
          <div className="section-eyebrow">Built for GTM</div>
          <h2 className="section-title">Everything you need.<br /><em>Nothing you don&apos;t.</em></h2>

          <div className="features-grid">
            {[
              { icon: "🎯", title: "ICP-first targeting", desc: "Every account is scored against your exact ideal customer profile before a single message is written. Low-fit accounts are filtered out automatically." },
              { icon: "✍️", title: "Hyper-personalised copy", desc: "Outreach references real facts — bed count, facility type, location, contact role. Not templates. Not merge fields. Actual reasoning." },
              { icon: "👤", title: "Human in the loop", desc: "Nothing leaves the system without your approval. The pipeline pauses at every send step so you stay in full control of your brand voice." },
              { icon: "📩", title: "Automatic reply handling", desc: "Replies are classified, drafted responses are generated, and meetings are booked — all without you lifting a finger after the initial send." },
              { icon: "📅", title: "Google Calendar + Meet", desc: "Meeting times are extracted from reply text, calendar events are created, and Google Meet links are sent to prospects automatically." },
              { icon: "📊", title: "Live analytics", desc: "Track reply rates, classification breakdown, meetings booked, and pipeline velocity — all in real time from the Analytics dashboard." },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">Your pipeline.<br /><em>On autopilot.</em></h2>
            <p className="cta-sub">Start reaching the right facilities with the right message — today.</p>
            <div className="cta-actions">
              <Link href="/login" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{borderTop: "1px solid var(--border)"}}>
          <div className="footer">
            <a href="/" className="footer-logo">Owle<span>.</span>AI</a>
            <span className="footer-copy">© 2026 Owle AI. All rights reserved.</span>
          </div>
        </div>
      </div>
    </>
  );
}
