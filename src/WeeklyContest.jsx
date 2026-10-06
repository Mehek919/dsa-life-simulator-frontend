import React from 'react';
const weeklyContestStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap');

  .ct {
    --ink: #f2f0ea; --muted: #a9a6b8; --line: rgba(244, 183, 64, .22); --gold: #f4b740; --cyan: #35e0ff; --green: #39ff88;
    --mono: "JetBrains Mono", ui-monospace, "Cascadia Code", "Consolas", monospace;
    position: relative; min-height: 100vh; color: var(--ink); font-family: var(--mono); overflow-x: hidden; padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    background: radial-gradient(60% 50% at 75% 10%, rgba(53,224,255,.14), transparent 70%), radial-gradient(60% 50% at 15% 0%, rgba(244,183,64,.12), transparent 70%), #05060c;
  }
  .ct *, .ct *::before, .ct *::after { box-sizing: border-box; }
  .ct button, .ct a { font-family: var(--mono); color: inherit; }
  .ct :focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .ct-crt { position: fixed; inset: 0; z-index: 40; pointer-events: none; background: repeating-linear-gradient(to bottom, rgba(255,255,255,.02) 0 1px, transparent 1px 3px), radial-gradient(120% 90% at 50% 50%, transparent 65%, rgba(0,0,0,.55) 100%); }
  .ct-page { max-width: 1240px; margin: 0 auto; padding: calc(14px + env(safe-area-inset-top, 0px)) 20px 40px; }
  .ct-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0 12px; }
  .ct-btn { min-height: 44px; padding: 0 14px; border: 1px solid var(--line); background: rgba(14, 12, 18, .9); cursor: pointer; font-size: 14px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; }
  .ct-btn:hover { border-color: var(--gold); color: var(--gold); }
  .ct-path { font-size: 14px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ct-path b { color: var(--gold); } .ct-path i { color: var(--cyan); font-style: normal; }
  .ct-card { position: relative; border: 1px solid var(--line); background: rgba(12, 11, 18, .86); }
  .ct-card::before { content: ""; position: absolute; left: -1px; top: -1px; width: 14px; height: 14px; border-left: 2px solid var(--gold); border-top: 2px solid var(--gold); }
  .ct-kicker { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border: 1px solid rgba(244,183,64,.5); background: rgba(244,183,64,.1); color: var(--gold); font-size: 11px; font-weight: 800; letter-spacing: .1em; }
  .ct-kicker i { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 10px var(--gold); animation: ct-blink 1.2s steps(1) infinite; } @keyframes ct-blink { 50% { opacity: .25; } }
  .ct-kicker.live { border-color: rgba(57,255,136,.6); color: var(--green); background: rgba(57,255,136,.1); } .ct-kicker.live i { background: var(--green); box-shadow: 0 0 10px var(--green); }

  .ct-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); overflow: hidden; min-height: 520px; }
  .ct-hleft { padding: 26px; display: flex; flex-direction: column; justify-content: center; position: relative; z-index: 2; }
  .ct-hleft h1 { margin: 16px 0 0; font-size: clamp(34px, 4.8vw, 60px); line-height: 1; font-weight: 800; letter-spacing: -1.5px; }
  .ct-hleft h1 span { color: var(--gold); text-shadow: 0 0 24px rgba(244,183,64,.5); }
  .ct-hleft > p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #d8d4e2; max-width: 46ch; }
  .ct-clock { display: flex; align-items: flex-start; gap: 10px; margin-top: 22px; }
  .ct-unit { text-align: center; } .ct-digits { display: flex; gap: 4px; }
  .ct-dg { position: relative; width: 46px; height: 64px; overflow: hidden; display: grid; place-items: center; font-size: 42px; font-weight: 800; font-variant-numeric: tabular-nums; color: #fff;
    border: 1px solid rgba(53,224,255,.45); background: linear-gradient(180deg, rgba(53,224,255,.16), rgba(10,14,24,.9)); box-shadow: 0 0 18px rgba(53,224,255,.18), inset 0 0 14px rgba(53,224,255,.08); text-shadow: 0 0 14px rgba(53,224,255,.8); }
  .ct-dg::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(0,0,0,.45); }
  .ct-dg span { display: block; animation: ct-tick .45s cubic-bezier(.2,.9,.3,1.3); } @keyframes ct-tick { from { transform: translateY(-70%); opacity: 0; filter: blur(2px); } to { transform: none; opacity: 1; filter: none; } }
  .ct-unit.s .ct-dg { border-color: rgba(244,183,64,.6); background: linear-gradient(180deg, rgba(244,183,64,.18), rgba(18,12,6,.9)); text-shadow: 0 0 14px rgba(244,183,64,.9); animation: ct-spulse 1s ease-out infinite; }
  @keyframes ct-spulse { 0% { box-shadow: 0 0 34px rgba(244,183,64,.6); } 60%, 100% { box-shadow: 0 0 12px rgba(244,183,64,.2); } }
  .ct-unit small { display: block; margin-top: 6px; font-size: 10.5px; color: var(--muted); letter-spacing: .14em; }
  .ct-colon { font-size: 34px; font-weight: 800; color: var(--cyan); padding-top: 10px; animation: ct-blink 1s steps(1) infinite; }
  .ct-when { margin-top: 12px; font-size: 13px; color: #cfcbda; } .ct-when b { color: #fff; }
  .ct-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; position: relative; }
  .ct-primary { min-height: 56px; padding: 0 22px; border: 0; cursor: pointer; font-size: 16px; font-weight: 800; letter-spacing: .08em; color: #1a1000 !important;
    background: linear-gradient(100deg, #ffd36a, #f4b740 55%, #ff9a3d); box-shadow: 0 0 30px rgba(244,183,64,.45); animation: ct-glow 2s ease-in-out infinite; }
  @keyframes ct-glow { 50% { box-shadow: 0 0 46px rgba(244,183,64,.75); } }
  .ct-primary.done { background: linear-gradient(100deg, #1fbf6a, #39ff88); animation: none; }
  .ct-primary.live { background: linear-gradient(100deg, #00c2ff, #35e0ff 60%, #a6f6ff); color: #00141c !important; }
  .ct-primary:disabled { background: #2a2618; color: #a9a6b8 !important; animation: none; box-shadow: none; cursor: not-allowed; }
  .ct-secondary { min-height: 56px; padding: 0 18px; border: 1px solid rgba(53,224,255,.55); background: rgba(53,224,255,.08); cursor: pointer; font-size: 15px; font-weight: 800; color: #bdf6ff !important; }
  .ct-secondary:hover { background: rgba(53,224,255,.16); }
  .ct-hint { margin-top: 10px; font-size: 12px; color: var(--muted); }
  .ct-menu { position: absolute; left: 0; top: calc(100% + 8px); z-index: 20; width: min(360px, 100%); padding: 8px; border: 1px solid rgba(53,224,255,.5); background: #070b12; box-shadow: 0 20px 50px rgba(0,0,0,.6); }
  .ct-menu button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 8px 10px; border: 0; background: none; cursor: pointer; text-align: left; font-size: 14px; }
  .ct-menu button:hover, .ct-menu button:focus-visible { background: rgba(53,224,255,.1); }
  .ct-menu svg { width: 22px; height: 22px; flex: none; color: var(--cyan); } .ct-menu small { display: block; font-size: 11.5px; color: var(--muted); }
  .ct-menu .on { color: var(--green); font-weight: 800; margin-left: auto; font-size: 12px; }
  .ct-hright { position: relative; min-height: 420px; }
  .ct-gate { position: absolute; inset: 0; } .ct-gate canvas { display: block; width: 100%; height: 100%; }
  .ct-gatelabel { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); padding: 6px 12px; border: 1px solid rgba(53,224,255,.5); background: rgba(5,8,14,.8); font-size: 12px; font-weight: 800; letter-spacing: .14em; color: #bdf6ff; white-space: nowrap; }
  .ct-gatelabel.open { border-color: var(--green); color: var(--green); }

  .ct-bento { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
  .ct-b { padding: 18px; } .ct-b h2 { margin: 0 0 12px; font-size: 12px; letter-spacing: .12em; color: var(--muted); font-weight: 600; text-transform: uppercase; } .ct-b h2::before { content: "> "; color: var(--gold); }
  .ct-sched { grid-column: span 7; } .ct-rules { grid-column: span 5; } .ct-third { grid-column: span 4; } .ct-full { grid-column: 1 / -1; }
  .ct-big { font-size: 22px; font-weight: 800; } .ct-sub { margin-top: 6px; font-size: 13px; color: var(--muted); line-height: 1.55; } .ct-sub b { color: #fff; }
  .ct-dates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
  .ct-date { padding: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); } .ct-date.next { border-color: var(--gold); background: rgba(244,183,64,.1); box-shadow: 0 0 16px rgba(244,183,64,.18); }
  .ct-date small { display: block; font-size: 10.5px; color: var(--muted); letter-spacing: .08em; } .ct-date b { display: block; margin-top: 4px; font-size: 15px; } .ct-date span { font-size: 12px; color: #d8d4e2; }
  .ct-list { list-style: none; margin: 0; padding: 0; font-size: 13.5px; } .ct-list li { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed rgba(255,255,255,.1); line-height: 1.45; } .ct-list li::before { content: "▸"; color: var(--gold); }
  .ct-list b { color: #fff; }
  .ct-arena { background: radial-gradient(90% 90% at 90% 0%, rgba(255,45,85,.25), transparent 70%), rgba(12, 11, 18, .86); }
  .ct-go { margin-top: 14px; width: 100%; }
  .ct-steps { list-style: none; margin: 0; padding: 0; counter-reset: s; } .ct-steps li { counter-increment: s; display: grid; grid-template-columns: 30px 1fr; gap: 10px; padding: 8px 0; font-size: 13.5px; line-height: 1.45; }
  .ct-steps li::before { content: counter(s); display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid var(--cyan); color: var(--cyan); font-weight: 800; font-size: 12px; }
  .ct-past { display: grid; gap: 8px; }
  .ct-pastrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid rgba(255,255,255,.1); background: #0b0a12; cursor: pointer; text-align: left; width: 100%; }
  .ct-pastrow:hover { border-color: var(--gold); } .ct-pastrow b { display: block; font-size: 14px; } .ct-pastrow small { font-size: 12px; color: var(--muted); }
  .ct-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; } .ct-chips span { padding: 3px 10px; font-size: 12px; font-weight: 800; border: 1px solid currentColor; }
  .ct-toast { position: fixed; left: 50%; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 90; padding: 11px 16px; border: 1px solid var(--gold); background: #141006; color: #ffe2a6; font-size: 13px; max-width: calc(100% - 32px); }
  .ct-toast.error { border-color: #ff6b6b; background: #1a0808; color: #ffc4c4; }
  .ct-center { min-height: 70vh; display: grid; place-items: center; text-align: center; color: var(--muted); }

  @media (max-width: 980px) { .ct-hero { grid-template-columns: minmax(0, 1fr); } .ct-hright { order: -1; min-height: 340px; } .ct-sched, .ct-rules { grid-column: 1 / -1; } .ct-third { grid-column: span 6; } .ct-third:last-child { grid-column: 1 / -1; } }
  @media (max-width: 560px) {
    .ct-page { padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 40px; } .ct-hleft { padding: 18px 16px; }
    .ct-clock { gap: 3px; } .ct-digits { gap: 3px; } .ct-dg { width: 30px; height: 46px; font-size: 26px; } .ct-colon { font-size: 20px; padding-top: 8px; } .ct-unit small { letter-spacing: .08em; }
    .ct-third { grid-column: 1 / -1; } .ct-dates { grid-template-columns: repeat(2, 1fr); } .ct-primary, .ct-secondary { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .ct-kicker i, .ct-colon, .ct-primary, .ct-dg span, .ct-unit.s .ct-dg { animation: none !important; } }
`;

export default function WeeklyContest() {
  return (
    <>
      <style>{weeklyContestStyles}</style>

      <div className="ct">
        <div className="ct-crt" />

        <div className="ct-page">
          <header className="ct-top">
            <div className="ct-path">
              <b>route</b> / <i>contest</i> / weekly
            </div>
            <button className="ct-btn" type="button">
              Open leaderboard
            </button>
          </header>

          <section className="ct-card ct-hero">
            <div className="ct-hleft">
              <div className="ct-kicker live">
                <i /> LIVE
              </div>

              <h1>
                Weekly <span>Contest</span>
              </h1>

              <p>
                Sprint through a timed challenge, tune your tactics, and climb the board with a new set of elite problems every week.
              </p>

              <div className="ct-clock" aria-label="Time remaining">
                <div className="ct-unit">
                  <div className="ct-digits">
                    <div className="ct-dg"><span>0</span></div>
                    <div className="ct-dg"><span>2</span></div>
                  </div>
                  <small>days</small>
                </div>

                <div className="ct-colon">:</div>

                <div className="ct-unit">
                  <div className="ct-digits">
                    <div className="ct-dg"><span>1</span></div>
                    <div className="ct-dg"><span>1</span></div>
                  </div>
                  <small>hours</small>
                </div>

                <div className="ct-colon">:</div>

                <div className="ct-unit s">
                  <div className="ct-digits">
                    <div className="ct-dg"><span>4</span></div>
                    <div className="ct-dg"><span>8</span></div>
                  </div>
                  <small>mins</small>
                </div>

                <div className="ct-colon">:</div>

                <div className="ct-unit">
                  <div className="ct-digits">
                    <div className="ct-dg"><span>2</span></div>
                    <div className="ct-dg"><span>3</span></div>
                  </div>
                  <small>secs</small>
                </div>
              </div>

              <div className="ct-when">
                <b>Next round:</b> Saturday • 18:30 UTC
              </div>

              <div className="ct-actions">
                <button className="ct-primary live" type="button">
                  Register now
                </button>
                <button className="ct-secondary" type="button">
                  View rules
                </button>
              </div>

              <div className="ct-hint">No signup fee • 90 minute challenge</div>
            </div>

            <div className="ct-hright">
              <div className="ct-gate">
                <canvas aria-label="Contest gate" />
              </div>
              <div className="ct-gatelabel open">GATE OPEN</div>
            </div>
          </section>

          <section className="ct-bento">
            <article className="ct-card ct-b ct-sched">
              <h2>Schedule</h2>
              <div className="ct-big">Round 24 • Problemset: A2 / B7 / C9</div>
              <div className="ct-sub">
                Challenge starts <b>Saturday 18:30 UTC</b> and closes at <b>20:00 UTC</b>.
              </div>

              <div className="ct-dates">
                <div className="ct-date next">
                  <small>Start</small>
                  <b>Sat 18:30</b>
                  <span>UTC</span>
                </div>
                <div className="ct-date">
                  <small>Window</small>
                  <b>90 min</b>
                  <span>timed</span>
                </div>
                <div className="ct-date">
                  <small>Rating</small>
                  <b>+120</b>
                  <span>max</span>
                </div>
                <div className="ct-date">
                  <small>Prize</small>
                  <b>Tier 1</b>
                  <span>badge</span>
                </div>
              </div>
            </article>

            <article className="ct-card ct-b ct-rules">
              <h2>Rules</h2>
              <ul className="ct-list">
                <li><b>One submission</b> per problem during the live round.</li>
                <li><b>Code editor</b> remains active while timer is running.</li>
                <li><b>Penalty</b> of 5 minutes for each wrong submission.</li>
              </ul>

              <button className="ct-btn ct-go" type="button">
                Contest briefing
              </button>
            </article>

            <article className="ct-card ct-b ct-third ct-arena">
              <h2>Arena</h2>
              <div className="ct-big">Global rank</div>
              <div className="ct-sub">Top 12% advance to the elite ladder next week.</div>

              <div className="ct-chips">
                <span style={{ color: '#35e0ff' }}>Python</span>
                <span style={{ color: '#f4b740' }}>Graph</span>
                <span style={{ color: '#39ff88' }}>DP</span>
              </div>
            </article>

            <article className="ct-card ct-b ct-third">
              <h2>Flow</h2>
              <ol className="ct-steps">
                <li>Read the brief, identify the critical constraints, and map the edge cases.</li>
                <li>Code the first pass and validate against the provided sample tests.</li>
                <li>Optimize for speed and re-run the final checks before locking the answer.</li>
              </ol>
            </article>

            <article className="ct-card ct-b ct-third">
              <h2>Previous</h2>
              <div className="ct-past">
                <button className="ct-pastrow" type="button">
                  <span>
                    <b>Round 23</b>
                    <small>Heist Matrix</small>
                  </span>
                  <small>4.8★</small>
                </button>
                <button className="ct-pastrow" type="button">
                  <span>
                    <b>Round 22</b>
                    <small>Data Drift</small>
                  </span>
                  <small>4.6★</small>
                </button>
                <button className="ct-pastrow" type="button">
                  <span>
                    <b>Round 21</b>
                    <small>Signal Bloom</small>
                  </span>
                  <small>4.7★</small>
                </button>
              </div>
            </article>

            <article className="ct-card ct-b ct-full">
              <h2>Contest notes</h2>
              <div className="ct-sub">
                Expect a balanced mix of graph traversal, greedy logic, and constraint-heavy optimization. The final round favors clean implementations over brute-force scaling.
              </div>
            </article>
          </section>
        </div>
      </div>
    </>
  );
}

