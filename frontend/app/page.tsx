import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        :root {
          --bg: #080808;
          --bg2: #0f0f0f;
          --bg3: #141414;
          --border: rgba(255,255,255,0.07);
          --border2: rgba(255,255,255,0.12);
          --text: #ede8dc;
          --muted: #5a5a5a;
          --muted2: #888;
          --accent: #e07c1a;
          --accent2: #f0a040;
          --green: #3dba6f;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .land {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* grain */
        .land::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 9999;
        }

        /* ── NAV ── */
        .nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid var(--border);
          background: rgba(8,8,8,0.9);
          backdrop-filter: blur(20px);
        }
        .logo { font-family:'Instrument Serif',serif; font-size:1.3rem; color:var(--text); text-decoration:none; letter-spacing:-0.01em; }
        .logo b { color:var(--accent); font-style:italic; font-weight:400; }
        .nav-right { display:flex; align-items:center; gap:1.75rem; }
        .nav-link { font-size:0.82rem; color:var(--muted2); text-decoration:none; transition:color .15s; }
        .nav-link:hover { color:var(--text); }
        .nav-btn {
          font-size:0.82rem; font-weight:600; font-family:inherit;
          background:var(--accent); color:#080808;
          border:none; border-radius:5px; padding:0.5rem 1.1rem;
          cursor:pointer; text-decoration:none; transition:background .15s, transform .1s;
          letter-spacing:0.01em;
        }
        .nav-btn:hover { background:var(--accent2); transform:translateY(-1px); }

        /* ── HERO ── */
        .hero {
          max-width: 1080px; margin: 0 auto;
          padding: 6rem 2.5rem 5rem;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 5rem; align-items: center;
        }
        .hero-left {}
        .badge {
          display: inline-flex; align-items: center; gap: 0.45rem;
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--accent); border: 1px solid rgba(224,124,26,0.25);
          background: rgba(224,124,26,0.06);
          padding: 0.3rem 0.8rem; border-radius: 100px; margin-bottom: 1.75rem;
        }
        .badge-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); animation:blink 2s ease infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .hero-h1 {
          font-family: 'Instrument Serif', serif;
          font-size: 4rem; line-height: 1.06; letter-spacing: -0.035em;
          color: var(--text); margin-bottom: 1.5rem;
        }
        .hero-h1 em { font-style:italic; color:var(--accent); }
        .hero-h1 s { text-decoration: line-through; color: var(--muted); font-style:normal; }

        .hero-sub {
          font-size: 1rem; line-height: 1.7; color: var(--muted2);
          font-weight: 300; max-width: 430px; margin-bottom: 2.5rem;
        }

        .hero-actions { display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; }
        .btn-cta {
          font-family:inherit; font-size:0.9rem; font-weight:600;
          background:var(--accent); color:#080808;
          border:none; border-radius:5px; padding:0.8rem 1.75rem;
          cursor:pointer; text-decoration:none; transition:all .2s;
        }
        .btn-cta:hover { background:var(--accent2); transform:translateY(-2px); box-shadow:0 8px 28px rgba(224,124,26,0.22); }
        .btn-outline {
          font-family:inherit; font-size:0.87rem; font-weight:400;
          background:transparent; color:var(--muted2);
          border:1px solid var(--border2); border-radius:5px; padding:0.8rem 1.5rem;
          cursor:pointer; text-decoration:none; transition:all .2s;
        }
        .btn-outline:hover { color:var(--text); border-color:rgba(255,255,255,0.22); }

        /* ── HERO VISUAL ── */
        .hero-right { position:relative; }
        .hero-glow {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:380px; height:280px;
          background:radial-gradient(ellipse, rgba(224,124,26,0.1) 0%, transparent 70%);
          pointer-events:none;
        }

        .pipeline-card {
          background:var(--bg2); border:1px solid var(--border);
          border-radius:14px; overflow:hidden;
          box-shadow:0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03);
        }
        .pc-header {
          padding:0.75rem 1rem; border-bottom:1px solid var(--border);
          display:flex; align-items:center; gap:0.45rem;
        }
        .pc-dot { width:7px; height:7px; border-radius:50%; }
        .pc-label { font-size:0.68rem; color:var(--muted); margin-left:0.4rem; font-weight:500; letter-spacing:0.05em; }
        .pc-body { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }

        .lead-row {
          display:flex; align-items:center; gap:0.65rem;
          background:rgba(255,255,255,0.025); border:1px solid var(--border);
          border-radius:7px; padding:0.6rem 0.8rem;
          animation:rowIn .4s ease forwards; opacity:0;
        }
        .lead-row:nth-child(1){animation-delay:.15s}
        .lead-row:nth-child(2){animation-delay:.3s}
        .lead-row:nth-child(3){animation-delay:.45s}
        .lead-row:nth-child(4){animation-delay:.6s}
        @keyframes rowIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }

        .lead-status {
          font-size:0.62rem; font-weight:600; padding:0.18rem 0.5rem;
          border-radius:100px; letter-spacing:0.05em; text-transform:uppercase; white-space:nowrap;
        }
        .s-new { background:rgba(59,130,246,0.12); color:#60a5fa; }
        .s-sent { background:rgba(161,161,170,0.12); color:#a1a1aa; }
        .s-reply { background:rgba(224,124,26,0.14); color:var(--accent2); }
        .s-booked { background:rgba(61,186,111,0.14); color:var(--green); }

        .lead-name { font-size:0.78rem; font-weight:500; color:var(--text); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lead-score { font-size:0.68rem; color:var(--muted); white-space:nowrap; }

        .pc-steps {
          display:grid; grid-template-columns:repeat(4,1fr); gap:0.5rem; margin-top:0.25rem;
        }
        .pc-step {
          background:rgba(255,255,255,0.025); border:1px solid var(--border);
          border-radius:6px; padding:0.55rem 0.4rem; text-align:center;
        }
        .pc-step-val { font-size:1rem; font-weight:600; color:var(--accent); font-family:'Instrument Serif',serif; }
        .pc-step-lbl { font-size:0.58rem; color:var(--muted); margin-top:0.15rem; letter-spacing:0.04em; text-transform:uppercase; }

        /* ── LOGOS / SOCIAL PROOF ── */
        .proof {
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
          background:var(--bg2);
        }
        .proof-inner {
          max-width:1080px; margin:0 auto; padding:1.5rem 2.5rem;
          display:flex; align-items:center; gap:2rem; flex-wrap:wrap;
        }
        .proof-label { font-size:0.72rem; color:var(--muted); font-weight:500; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap; }
        .proof-divider { width:1px; height:20px; background:var(--border); }
        .proof-stats { display:flex; align-items:center; gap:2rem; flex-wrap:wrap; }
        .proof-stat { display:flex; flex-direction:column; }
        .proof-stat-val { font-size:1.1rem; font-weight:600; color:var(--text); font-family:'Instrument Serif',serif; }
        .proof-stat-val span { color:var(--accent); }
        .proof-stat-lbl { font-size:0.68rem; color:var(--muted); margin-top:0.1rem; }

        /* ── HOW IT WORKS ── */
        .section { max-width:1080px; margin:0 auto; padding:6rem 2.5rem; }
        .eyebrow { font-size:0.7rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--accent); margin-bottom:0.85rem; }
        .section-h2 { font-family:'Instrument Serif',serif; font-size:2.6rem; letter-spacing:-0.025em; line-height:1.1; color:var(--text); margin-bottom:0.85rem; }
        .section-h2 em { font-style:italic; color:var(--accent); }
        .section-sub { font-size:0.95rem; color:var(--muted2); line-height:1.7; max-width:480px; font-weight:300; }

        /* 3-step flow */
        .flow {
          margin-top:4rem;
          display:grid; grid-template-columns:repeat(3,1fr); gap:1px;
          background:var(--border); border:1px solid var(--border); border-radius:12px; overflow:hidden;
        }
        .flow-step { background:var(--bg); padding:2.25rem 2rem; position:relative; transition:background .2s; }
        .flow-step:hover { background:rgba(255,255,255,0.018); }
        .flow-num {
          font-family:'Instrument Serif',serif; font-size:3.5rem; line-height:1;
          color:rgba(224,124,26,0.15); letter-spacing:-0.04em; margin-bottom:1rem;
        }
        .flow-title { font-size:1rem; font-weight:600; color:var(--text); margin-bottom:0.6rem; }
        .flow-desc { font-size:0.83rem; color:var(--muted2); line-height:1.65; font-weight:300; }
        .flow-tag {
          display:inline-block; margin-top:1rem;
          font-size:0.63rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
          color:var(--accent); border:1px solid rgba(224,124,26,0.22); padding:0.2rem 0.5rem; border-radius:3px;
        }
        .flow-arrow {
          position:absolute; right:-12px; top:50%; transform:translateY(-50%);
          width:22px; height:22px; border-radius:50%;
          background:var(--bg3); border:1px solid var(--border2);
          display:flex; align-items:center; justify-content:center;
          font-size:0.7rem; color:var(--accent); z-index:2;
        }

        /* ── FEATURES ── */
        .features { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-top:4rem; }
        .feat {
          background:var(--bg2); border:1px solid var(--border);
          border-radius:10px; padding:1.75rem;
          transition:border-color .2s, transform .2s;
        }
        .feat:hover { border-color:rgba(224,124,26,0.28); transform:translateY(-2px); }
        .feat-icon { font-size:1.4rem; margin-bottom:0.9rem; }
        .feat-title { font-size:0.88rem; font-weight:600; color:var(--text); margin-bottom:0.45rem; }
        .feat-desc { font-size:0.8rem; color:var(--muted2); line-height:1.65; font-weight:300; }

        /* ── WORKFLOW STRIP ── */
        .workflow {
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
          background:var(--bg2);
        }
        .workflow-inner {
          max-width:1080px; margin:0 auto; padding:3.5rem 2.5rem;
          display:flex; align-items:center; gap:0; flex-wrap:nowrap; overflow-x:auto;
        }
        .wf-step { display:flex; flex-direction:column; align-items:center; gap:0.5rem; flex:1; min-width:120px; }
        .wf-icon {
          width:42px; height:42px; border-radius:10px;
          background:rgba(224,124,26,0.08); border:1px solid rgba(224,124,26,0.18);
          display:flex; align-items:center; justify-content:center; font-size:1.1rem;
        }
        .wf-label { font-size:0.72rem; font-weight:500; color:var(--muted2); text-align:center; line-height:1.4; }
        .wf-arrow { font-size:0.75rem; color:var(--muted); flex:0; padding:0 0.25rem; margin-bottom:1.5rem; }

        /* ── CTA ── */
        .cta-section { border-top:1px solid var(--border); }
        .cta-inner { max-width:1080px; margin:0 auto; padding:7rem 2.5rem; text-align:center; }
        .cta-h2 { font-family:'Instrument Serif',serif; font-size:3rem; letter-spacing:-0.03em; line-height:1.1; color:var(--text); margin-bottom:1.25rem; }
        .cta-h2 em { font-style:italic; color:var(--accent); }
        .cta-sub { font-size:0.95rem; color:var(--muted2); font-weight:300; margin-bottom:2.5rem; }
        .cta-btns { display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap; }

        /* ── FOOTER ── */
        .footer { border-top:1px solid var(--border); }
        .footer-inner { max-width:1080px; margin:0 auto; padding:1.75rem 2.5rem; display:flex; align-items:center; justify-content:space-between; }
        .footer-logo { font-family:'Instrument Serif',serif; font-size:1rem; color:var(--muted); text-decoration:none; }
        .footer-logo b { color:var(--accent); font-style:italic; font-weight:400; }
        .footer-copy { font-size:0.73rem; color:var(--muted); }

        @media(max-width:768px){
          .hero{grid-template-columns:1fr;padding:4rem 1.5rem 3rem;gap:3rem}
          .hero-h1{font-size:2.75rem}
          .nav{padding:1.1rem 1.5rem} .nav-right{gap:1rem}
          .nav-link{display:none}
          .proof-inner{padding:1.25rem 1.5rem}
          .section{padding:4rem 1.5rem}
          .flow{grid-template-columns:1fr} .flow-arrow{display:none}
          .features{grid-template-columns:1fr}
          .cta-h2{font-size:2.1rem} .cta-inner{padding:5rem 1.5rem}
          .workflow-inner{padding:2rem 1.5rem;gap:0}
          .section-h2{font-size:2rem}
        }
      `}</style>

      <div className="land">

        {/* NAV */}
        <nav className="nav">
          <a href="/" className="logo">Owle<b>.AI</b></a>
          <div className="nav-right">
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <Link href="/login" className="nav-btn">Get Started →</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-left">
            <div className="badge"><div className="badge-dot" />AI-Powered GTM for Healthcare</div>
            <h1 className="hero-h1">
              Find leads.<br />
              Send outreach.<br />
              <em>Close pilots.</em>
            </h1>
            <p className="hero-sub">
              Owle AI automates your entire GTM motion — from discovering high-fit SNFs to booking a meeting — so your team spends time closing, not prospecting.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-cta">Get Started Free</Link>
              <a href="#how-it-works" className="btn-outline">See how it works</a>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-glow" />
            <div className="pipeline-card">
              <div className="pc-header">
                <div className="pc-dot" style={{background:"#ff5f56"}} />
                <div className="pc-dot" style={{background:"#ffbd2e"}} />
                <div className="pc-dot" style={{background:"#27c93f"}} />
                <span className="pc-label">Live Pipeline · 4 active leads</span>
              </div>
              <div className="pc-body">
                <div className="lead-row">
                  <span className="lead-status s-booked">Meeting Booked</span>
                  <span className="lead-name">West Valley Post Acute</span>
                  <span className="lead-score">ICP 88</span>
                </div>
                <div className="lead-row">
                  <span className="lead-status s-reply">Replied</span>
                  <span className="lead-name">SF Health Care & Rehab</span>
                  <span className="lead-score">ICP 95</span>
                </div>
                <div className="lead-row">
                  <span className="lead-status s-sent">Outreach Sent</span>
                  <span className="lead-name">Sunrise Skilled Nursing</span>
                  <span className="lead-score">ICP 71</span>
                </div>
                <div className="lead-row">
                  <span className="lead-status s-new">Identified</span>
                  <span className="lead-name">Pine Creek Healthcare</span>
                  <span className="lead-score">ICP 79</span>
                </div>
                <div className="pc-steps">
                  <div className="pc-step"><div className="pc-step-val">9</div><div className="pc-step-lbl">AI Nodes</div></div>
                  <div className="pc-step"><div className="pc-step-val">2</div><div className="pc-step-lbl">Meetings</div></div>
                  <div className="pc-step"><div className="pc-step-val">94%</div><div className="pc-step-lbl">Accuracy</div></div>
                  <div className="pc-step"><div className="pc-step-val">0</div><div className="pc-step-lbl">Manual CRM</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF BAR */}
        <div className="proof">
          <div className="proof-inner">
            <span className="proof-label">Built for GTM teams</span>
            <div className="proof-divider" />
            <div className="proof-stats">
              {[
                ["9+","AI agent nodes in the pipeline"],
                ["100%","Human approved before anything sends"],
                ["<30s","Reply to classified and drafted"],
                ["0x","Manual CRM updates needed"],
              ].map(([v,l]) => (
                <div key={l} className="proof-stat">
                  <span className="proof-stat-val">{v}</span>
                  <span className="proof-stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WORKFLOW STRIP */}
        <div className="workflow">
          <div className="workflow-inner">
            {[
              {icon:"🔍", label:"Find Leads"},
              {icon:"→", label:"", arrow:true},
              {icon:"🎯", label:"Score & Qualify"},
              {icon:"→", label:"", arrow:true},
              {icon:"✍️", label:"Generate Outreach"},
              {icon:"→", label:"", arrow:true},
              {icon:"👤", label:"You Approve"},
              {icon:"→", label:"", arrow:true},
              {icon:"📩", label:"Send & Track"},
              {icon:"→", label:"", arrow:true},
              {icon:"💬", label:"Classify Replies"},
              {icon:"→", label:"", arrow:true},
              {icon:"📅", label:"Book Meeting"},
            ].map((s, i) =>
              s.arrow ? (
                <span key={i} className="wf-arrow">→</span>
              ) : (
                <div key={i} className="wf-step">
                  <div className="wf-icon">{s.icon}</div>
                  <span className="wf-label">{s.label}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="section" id="how-it-works">
          <div className="eyebrow">How it works</div>
          <h2 className="section-h2">Your full GTM motion,<br /><em>on autopilot.</em></h2>
          <p className="section-sub">Three phases. Nine AI nodes. From cold list to booked pilot — without a SDR team.</p>

          <div className="flow">
            <div className="flow-step">
              <div className="flow-num">01</div>
              <div className="flow-title">Find & Qualify Leads</div>
              <div className="flow-desc">Search skilled nursing facilities by location, score them against your ICP, and surface only the highest-fit accounts. Low-quality leads never make it to your inbox.</div>
              <span className="flow-tag">ICP Scoring · Stakeholder Mapping</span>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-step">
              <div className="flow-num">02</div>
              <div className="flow-title">Personalised Outreach at Scale</div>
              <div className="flow-desc">Claude drafts hyper-personalised emails referencing real facility data — bed count, location, contacts. You review and approve every message before it goes out.</div>
              <span className="flow-tag">Outreach Generator · HITL Review</span>
              <div className="flow-arrow">→</div>
            </div>
            <div className="flow-step">
              <div className="flow-num">03</div>
              <div className="flow-title">Replies Handled, Meetings Booked</div>
              <div className="flow-desc">Every reply is classified instantly, a response drafted, and meeting times extracted automatically. Google Calendar invites and Meet links are created without you lifting a finger.</div>
              <span className="flow-tag">Reply Classifier · Meeting Booker</span>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features" style={{paddingTop:0}}>
          <div className="eyebrow">Features</div>
          <h2 className="section-h2">Everything a GTM team<br /><em>actually needs.</em></h2>

          <div className="features">
            {[
              {icon:"🔍", title:"Lead Discovery", desc:"Search SNFs by city, state, and bed count. Import via CSV or paste email addresses — every account is enriched and scored automatically."},
              {icon:"🎯", title:"ICP Scoring", desc:"Every account gets an ICP score 0–100 and a priority rank. Only the right facilities get outreach — the rest are filtered out."},
              {icon:"✍️", title:"AI Copywriting", desc:"Personalised emails written by Claude using real account data. Not templates — context-aware copy that references the facility by name, type, and pain."},
              {icon:"👁️", title:"Human-in-the-Loop", desc:"Nothing sends without your approval. The pipeline pauses so you can review, edit, or reject every draft. Full control, zero micromanagement."},
              {icon:"💬", title:"Reply Intelligence", desc:"Replies classified into interested, not now, referral, and more — with confidence scores. Response drafts ready in seconds."},
              {icon:"📅", title:"Auto Meeting Booking", desc:"Proposed times extracted from replies. Google Calendar events created. Meet links generated and sent. No back-and-forth scheduling."},
            ].map(f => (
              <div key={f.title} className="feat">
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-h2">Stop prospecting.<br /><em>Start closing.</em></h2>
            <p className="cta-sub">Get your first leads identified and outreach drafted in minutes.</p>
            <div className="cta-btns">
              <Link href="/login" className="btn-cta">Get Started Free</Link>
              <a href="#how-it-works" className="btn-outline">See the pipeline</a>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <div className="footer-inner">
            <a href="/" className="footer-logo">Owle<b>.AI</b></a>
            <span className="footer-copy">© 2026 Owle AI. All rights reserved.</span>
          </div>
        </div>

      </div>
    </>
  );
}
