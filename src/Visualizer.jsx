import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Visualizer.css';
import { ALGOS, CUSTOM_EXAMPLE, KIND_COLOR, binary, fmt, normalize, ptrColor, randArr } from './visualizerSteps';
const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/';
const SCHEMA = {
  type: 'array', minItems: 1, title: 'Visualizer steps',
  items: {
    type: 'object', additionalProperties: false,
    properties: {
      type: { enum: ['array', 'compare', 'swap', 'done', 'info'], description: 'Optional. Picks the sound and timeline color.' },
      message: { type: 'string', description: 'What happens in this step.' },
      array: { type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 24, description: 'Values on the workbench. Inherited from the previous step if left out.' },
      active: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Indexes being compared or touched.' },
      sorted: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'Indexes locked in their final place.' },
      swap: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 2, maxItems: 2, description: 'The two indexes that trade places.' },
      pivot: { type: ['integer', 'null'], minimum: 0 }, low: { type: ['integer', 'null'], minimum: 0 }, high: { type: ['integer', 'null'], minimum: 0 },
      mid: { type: ['integer', 'null'], minimum: 0 }, found: { type: ['integer', 'null'], minimum: 0 },
      pointers: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 }, description: 'Named pointers like { "i": 0, "j": 3 }.' },
      vars: { type: 'object', additionalProperties: { type: ['number', 'string', 'boolean', 'null'] }, description: 'Plain values to track, like { "target": 42 }.' },
    },
  },
};

/* ---------- Monaco loader (CDN, loaded once) ---------- */
let monacoPromise = null;
function loadMonaco() {
  if (window.monaco && window.monaco.editor) return Promise.resolve(window.monaco);
  if (!monacoPromise) {
    monacoPromise = new Promise((resolve, reject) => {
      const boot = () => {
        const req = window.require;
        if (!req || !req.config) { reject(new Error('Monaco loader missing')); return; }
        window.MonacoEnvironment = {
          getWorkerUrl() {
            const src = `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}'};importScripts('${MONACO_BASE}vs/base/worker/workerMain.js');`;
            return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
          },
        };
        req.config({ paths: { vs: `${MONACO_BASE}vs` } });
        req(['vs/editor/editor.main'], () => {
          const monaco = window.monaco;
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true, allowComments: false,
            schemas: [{ uri: 'https://dsalifesimulator.com/schemas/visualizer-steps.json', fileMatch: ['*visualizer-steps.json'], schema: SCHEMA }],
          });
          monaco.editor.defineTheme('uv-workbench', {
            base: 'vs-dark', inherit: true,
            rules: [{ token: 'string.key.json', foreground: '7fdcff' }, { token: 'string.value.json', foreground: 'ffd27a' }, { token: 'number', foreground: 'c79bff' }],
            colors: { 'editor.background': '#0a0817', 'editor.lineHighlightBackground': '#14112b', 'editorLineNumber.foreground': '#4b4675', 'editorGutter.background': '#0a0817', 'editor.selectionBackground': '#2b2560', 'editorIndentGuide.background': '#1d1940' },
          });
          resolve(monaco);
        }, reject);
      };
      if (window.require && window.require.config) { boot(); return; }
      const s = document.createElement('script');
      s.src = `${MONACO_BASE}vs/loader.js`; s.async = true; s.onload = boot; s.onerror = () => reject(new Error('Could not load Monaco'));
      document.head.appendChild(s);
    });
    monacoPromise.catch(() => { monacoPromise = null; });
  }
  return Promise.race([monacoPromise, new Promise((_, rej) => setTimeout(() => rej(new Error('Monaco timed out')), 12000))]);
}

/* ---------- sound ---------- */
const Sfx = {
  on: false, ctx: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, d, type, vol, when = 0, to) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    fl.type = 'lowpass'; fl.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(fl); fl.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  },
  play(kind) {
    if (kind === 'compare') this.tone(880, 0.06, 'triangle', 0.05);
    else if (kind === 'swap') { this.tone(260, 0.09, 'sawtooth', 0.04, 0, 390); this.tone(520, 0.07, 'square', 0.02, 0.07); }
    else if (kind === 'done') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.06, i * 0.085));
    else this.tone(420, 0.04, 'sine', 0.025);
  },
};

/* ---------- validation ---------- */
function stepOffsets(text) {
  const out = []; let depth = 0, inStr = false, esc = false;
  for (let q = 0; q < text.length; q++) {
    const c = text[q];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '[' || c === '{') { if (depth === 1 && c === '{') out.push(q); depth++; }
    else if (c === ']' || c === '}') depth--;
  }
  return out;
}
function lineFromParseErr(m, text) {
  const a = m.match(/line (\d+)/); if (a) return +a[1];
  const b = m.match(/position (\d+)/); if (b) return text.slice(0, +b[1]).split('\n').length;
  return 1;
}
function check(text) {
  let raw = null;
  try { raw = JSON.parse(text); } catch (e) {
    return { ok: false, raw: null, problems: [{ msg: `JSON syntax: ${e.message.replace(/^JSON\.parse: /, '')}`, line: lineFromParseErr(e.message, text), syntax: true }] };
  }
  const { errors, steps } = normalize(raw);
  const offs = stepOffsets(text);
  const problems = errors.map((e) => ({ msg: e.msg, line: e.step >= 0 && offs[e.step] !== undefined ? text.slice(0, offs[e.step]).split('\n').length : 1 }));
  return { ok: !errors.length, raw, steps, problems };
}

const esc = (s) => String(s);
const listTxt = (v) => (Array.isArray(v) ? v.join(', ') : '');
const mapTxt = (v) => (v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}=${x}`).join(', ') : '');
const STATE_NAMES = { def: 'idle', range: 'in search range', active: 'active', pivot: 'pivot', done: 'locked', found: 'found' };

/* ---------- JSON editor ---------- */
function StepsEditor({ value, onChange, problems, onSchema, apiRef }) {
  const host = useRef(null);
  const ed = useRef(null);
  const model = useRef(null);
  const suppress = useRef(false);
  const [mode, setMode] = useState('loading');
  const cb = useRef({ onChange, onSchema });
  cb.current = { onChange, onSchema };
  const initial = useRef(value);

  useEffect(() => {
    let dead = false; const subs = [];
    loadMonaco().then((monaco) => {
      if (dead || !host.current) return;
      const uri = monaco.Uri.parse('file:///visualizer-steps.json');
      const old = monaco.editor.getModel(uri); if (old) old.dispose();
      model.current = monaco.editor.createModel(initial.current, 'json', uri);
      ed.current = monaco.editor.create(host.current, {
        model: model.current, theme: 'uv-workbench', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
        minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 2, padding: { top: 10 }, fixedOverflowWidgets: true,
      });
      subs.push(model.current.onDidChangeContent(() => { if (!suppress.current) cb.current.onChange(model.current.getValue()); }));
      subs.push(monaco.editor.onDidChangeMarkers((uris) => {
        if (!model.current || !uris.some((u) => u.toString() === model.current.uri.toString())) return;
        cb.current.onSchema(monaco.editor.getModelMarkers({ resource: model.current.uri }).filter((m) => m.owner !== 'steps').map((m) => ({ msg: m.message, line: m.startLineNumber })));
      }));
      setMode('monaco');
    }).catch(() => { if (!dead) setMode('fallback'); });
    return () => { dead = true; subs.forEach((s) => s.dispose()); if (ed.current) ed.current.dispose(); if (model.current) model.current.dispose(); ed.current = null; model.current = null; };
  }, []);

  useEffect(() => {
    if (mode === 'monaco' && model.current && model.current.getValue() !== value) {
      suppress.current = true; model.current.setValue(value); suppress.current = false;
    }
  }, [value, mode]);

  useEffect(() => {
    if (mode !== 'monaco' || !model.current) return;
    window.monaco.editor.setModelMarkers(model.current, 'steps', problems.filter((p) => !p.syntax && !p.schema).map((p) => ({
      startLineNumber: p.line, startColumn: 1, endLineNumber: p.line, endColumn: 200, message: p.msg, severity: window.monaco.MarkerSeverity.Error,
    })));
  }, [problems, mode]);

  const ta = useRef(null);
  apiRef.current = {
    reveal(line) {
      if (ed.current) { ed.current.revealLineInCenter(line); ed.current.setPosition({ lineNumber: line, column: 1 }); ed.current.focus(); return; }
      if (ta.current) { const pos = ta.current.value.split('\n').slice(0, line - 1).join('\n').length + 1; ta.current.focus(); ta.current.setSelectionRange(pos, pos); }
    },
  };

  if (mode === 'fallback') {
    return (
      <textarea
        ref={ta} className="fallback" spellCheck={false} aria-label="Steps JSON" value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); onChange(t.value); } }}
      />
    );
  }
  return <div className="monaco" ref={host}>{mode === 'loading' && <div className="mload">Loading editor…</div>}</div>;
}

/* ---------- page ---------- */
export default function Visualizer() {
  const [algo, setAlgo] = useState('bubble');
  const [text, setText] = useState('');
  const [raw, setRaw] = useState([]);
  const [steps, setSteps] = useState([]);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(450);
  const [sound, setSound] = useState(false);
  const [view, setView] = useState('json');
  const [sel, setSel] = useState(0);
  const [formRev, setFormRev] = useState(0);
  const [formErr, setFormErr] = useState('');
  const [problems, setProblems] = useState([]);
  const [schemaProblems, setSchemaProblems] = useState([]);
  const [target, setTarget] = useState('');
  const [noGl, setNoGl] = useState(false);

  const stageRef = useRef(null);
  const tipRef = useRef(null);
  const sceneRef = useRef(null);
  const editorApi = useRef({});
  const generatedRef = useRef('');
  const loadedTextRef = useRef('');
  const baseRef = useRef({});
  const jumpRef = useRef(true);
  const prevCurRef = useRef(0);
  const live = useRef({});
  live.current = { steps, cur, algo, playing };

  const A = ALGOS.find((a) => a.id === algo) || ALGOS[0];

  const loadSteps = useCallback((nextRaw, nextSteps, keepAt) => {
    setRaw(nextRaw); setSteps(nextSteps);
    const at = Math.max(0, Math.min(nextSteps.length - 1, keepAt || 0));
    jumpRef.current = true;
    setCur(at); setSel((s) => Math.min(s, nextSteps.length - 1));
    const sc = sceneRef.current;
    if (sc) sc.setMax(Math.max(...nextSteps.flatMap((s) => s.array.map((v) => Math.abs(v)))));
  }, []);

  const selectAlgo = useCallback((id, { play = false, arr, tgt } = {}) => {
    const def = ALGOS.find((a) => a.id === id);
    let nextRaw;
    if (def.gen) {
      const input = arr || baseRef.current[id] || randArr(id === 'binary' ? 12 : 10);
      baseRef.current[id] = input;
      nextRaw = id === 'binary' ? binary(input, tgt) : def.gen(input);
      if (id === 'binary') setTarget(String(nextRaw[0].vars.target));
    } else nextRaw = CUSTOM_EXAMPLE;
    const txt = fmt(nextRaw);
    generatedRef.current = txt; loadedTextRef.current = txt;
    setText(txt); setProblems([]);
    const { steps: ns } = normalize(nextRaw);
    setAlgo(id);
    loadSteps(nextRaw, ns, 0);
    setSel(0); setFormRev((r) => r + 1); setFormErr('');
    setPlaying(play);
    if (play) Sfx.ensure();
  }, [loadSteps]);

  // first load: bubble sort, parked on an interesting step so the bench is not empty
  useEffect(() => {
    selectAlgo('bubble');
    setTimeout(() => { jumpRef.current = true; setCur(5); }, 0);
  }, [selectAlgo]);

  // 3D scene (lazy, like the other scenes)
  useEffect(() => {
    let dead = false, sc = null;
    const onTip = (info) => {
      const tip = tipRef.current; if (!tip) return;
      if (!info) { tip.hidden = true; return; }
      const s = live.current.steps[live.current.cur];
      const here = s ? Object.entries(s.ptrs).filter(([, v]) => v === info.i).map(([k]) => k) : [];
      tip.innerHTML = `index <b>${info.i}</b> · value <b>${info.v}</b> · ${STATE_NAMES[info.st] || info.st}${here.length ? ` · ${here.join(', ')} here` : ''}`;
      tip.style.left = `${info.x}px`; tip.style.top = `${info.y}px`; tip.hidden = false;
    };
    import('./VisualizerScene').then((m) => {
      if (dead || !stageRef.current) return;
      sc = m.mountVisualizer(stageRef.current, { onTip });
      if (!sc.ok) { setNoGl(true); return; }
      sceneRef.current = sc;
      const { steps: st, cur: c } = live.current;
      if (st.length) { sc.setMax(Math.max(...st.flatMap((s) => s.array.map((v) => Math.abs(v))))); sc.setStep(st[c], { jump: true }); }
    }).catch(() => setNoGl(true));
    return () => { dead = true; if (sc) sc.destroy(); sceneRef.current = null; };
  }, []);

  // push the current step to the bench, play sounds, celebrate on completion
  useEffect(() => {
    const s = steps[cur]; if (!s) return;
    const prev = prevCurRef.current;
    const jump = jumpRef.current || Math.abs(cur - prev) > 1;
    jumpRef.current = false;
    const sc = sceneRef.current;
    if (sc) sc.setStep(s, { jump });
    if (!jump && cur !== prev) {
      Sfx.play(s.kind);
      if (cur === steps.length - 1 && s.kind === 'done' && sc) sc.celebrate();
    }
    prevCurRef.current = cur;
  }, [steps, cur]);

  // playback
  useEffect(() => {
    if (!playing) return undefined;
    if (cur >= steps.length - 1) { setPlaying(false); return undefined; }
    const h = setTimeout(() => setCur((c) => c + 1), speed);
    return () => clearTimeout(h);
  }, [playing, cur, speed, steps.length]);

  // editor typing → debounced validation → live update
  useEffect(() => {
    if (!text) return undefined;
    const h = setTimeout(() => {
      const r = check(text);
      setProblems(r.problems);
      if (r.ok && text !== loadedTextRef.current) {
        loadedTextRef.current = text;
        if (live.current.algo !== 'custom' && text !== generatedRef.current) setAlgo('custom');
        loadSteps(r.raw, r.steps, live.current.cur);
        setFormRev((v) => v + 1);
      }
    }, 280);
    return () => clearTimeout(h);
  }, [text, loadSteps]);

  const allProblems = useMemo(() => {
    const seen = new Set(problems.map((p) => `${p.line}|${p.msg}`));
    return problems.concat(schemaProblems.filter((p) => !seen.has(`${p.line}|${p.msg}`)).map((p) => ({ ...p, schema: true })));
  }, [problems, schemaProblems]);
  const valid = !allProblems.length;

  const startPlay = (fromStart) => {
    Sfx.ensure();
    if (fromStart || cur >= steps.length - 1) { jumpRef.current = true; setCur(0); }
    setPlaying(true);
  };
  const stepTo = (i) => { setPlaying(false); Sfx.ensure(); setCur(Math.max(0, Math.min(steps.length - 1, i))); };

  const run = () => {
    const r = check(text);
    setProblems(r.problems);
    if (!r.ok) return;
    loadedTextRef.current = text;
    loadSteps(r.raw, r.steps, 0);
    startPlay(true);
  };

  const toggleSound = () => {
    Sfx.on = !Sfx.on;
    if (Sfx.on) { Sfx.ensure(); Sfx.play('compare'); }
    setSound(Sfx.on);
  };

  // keyboard: ← → step, space play/pause
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || (e.target.closest && e.target.closest('.monaco'))) return;
      const { cur: c, playing: p } = live.current;
      if (e.key === 'ArrowRight') { e.preventDefault(); stepTo(c + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepTo(c - 1); }
      else if (e.key === ' ' && tag !== 'button') { e.preventDefault(); if (p) setPlaying(false); else startPlay(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------- timeline builder ---------- */
  const commitRaw = (r, nextSel, fromForm) => {
    const txt = fmt(r);
    generatedRef.current = txt; loadedTextRef.current = txt;
    setText(txt); setProblems([]);
    const { steps: ns } = normalize(r);
    if (algo !== 'custom') setAlgo('custom');
    setPlaying(false);
    loadSteps(r, ns, nextSel);
    setSel(nextSel);
    if (!fromForm) setFormRev((v) => v + 1);
  };
  const addStep = (after) => {
    const base = raw[after] || {};
    const s = { type: 'compare', message: 'New step', active: [] };
    if (base.pointers) s.pointers = { ...base.pointers };
    const r = raw.slice(); r.splice(after + 1, 0, s); commitRaw(r, after + 1);
  };
  const ensureFirstArray = (r) => { if (r[0] && !r[0].array) r[0] = { ...r[0], array: steps[0].array.slice() }; return r; };
  const dupStep = () => { const r = raw.slice(); r.splice(sel + 1, 0, JSON.parse(JSON.stringify(r[sel]))); commitRaw(r, sel + 1); };
  const delStep = () => { if (raw.length < 2) return; const r = raw.slice(); r.splice(sel, 1); commitRaw(ensureFirstArray(r), Math.max(0, sel - 1)); };
  const moveStep = (dir) => {
    const to = sel + dir; if (to < 0 || to >= raw.length) return;
    const r = raw.slice(); [r[to], r[sel]] = [r[sel], r[to]]; commitRaw(ensureFirstArray(r), to);
  };
  const dropStep = (from, to) => {
    if (from === to) return;
    const r = raw.slice(); const [m] = r.splice(from, 1); r.splice(to, 0, m); commitRaw(ensureFirstArray(r), to);
  };

  const formRef = useRef(null);
  const formTimer = useRef(0);
  const readForm = () => {
    const f = formRef.current; if (!f) return;
    const get = (n) => f.elements.namedItem(n);
    let bad = false;
    const mark = (n, isBad) => { get(n).classList.toggle('err', isBad); if (isBad) bad = true; };
    const nums = (n, int) => {
      const v = get(n).value.trim(); mark(n, false); if (!v) return undefined;
      const a = v.split(/[\s,]+/).filter(Boolean).map(Number);
      if (a.some((x) => !Number.isFinite(x) || (int && !Number.isInteger(x)))) { mark(n, true); return undefined; }
      return a;
    };
    const one = (n) => {
      const v = get(n).value.trim(); mark(n, false); if (v === '') return undefined;
      const x = Number(v); if (!Number.isInteger(x)) { mark(n, true); return undefined; } return x;
    };
    const map = (n, intOnly) => {
      const v = get(n).value.trim(); mark(n, false); if (!v) return undefined;
      const o = {};
      for (const part of v.split(',')) {
        const m = part.split('=');
        if (m.length !== 2 || !m[0].trim()) { mark(n, true); return undefined; }
        const k = m[0].trim(), x = m[1].trim(), num = Number(x);
        if (intOnly && !Number.isInteger(num)) { mark(n, true); return undefined; }
        o[k] = x !== '' && Number.isFinite(num) ? num : x;
      }
      return o;
    };
    const s = {};
    const ty = get('type').value; if (ty !== 'auto') s.type = ty;
    const msg = get('message').value.trim(); if (msg) s.message = msg;
    const arr = nums('array', false); if (arr) s.array = arr;
    const act = nums('active', true); if (act) s.active = act;
    const srt = nums('sorted', true); if (srt) s.sorted = srt;
    const sw = nums('swap', true); if (sw) s.swap = sw;
    ['pivot', 'low', 'high', 'mid', 'found'].forEach((k) => { const x = one(k); if (x !== undefined) s[k] = x; });
    const pt = map('pointers', true); if (pt) s.pointers = pt;
    const vr = map('vars', false); if (vr) s.vars = vr;
    if (bad) return;
    const r = raw.slice(); r[sel] = s;
    const { errors } = normalize(r);
    if (errors.length) { setFormErr((errors.find((e) => e.step === sel) || errors[0]).msg); return; }
    setFormErr('');
    commitRaw(r, sel, true);
  };
  const onFormInput = () => { clearTimeout(formTimer.current); formTimer.current = setTimeout(readForm, 220); };

  const openTimeline = () => {
    setView('timeline'); setSel(cur); setFormRev((v) => v + 1);
  };

  /* ---------- derived ---------- */
  const s = steps[cur];
  const prevStep = cur > 0 ? steps[cur - 1] : null;
  const varRows = useMemo(() => {
    const ptr = [], val = [];
    steps.forEach((st) => {
      Object.keys(st.ptrs).forEach((k) => { if (!ptr.includes(k)) ptr.push(k); });
      Object.keys(st.vars).forEach((k) => { if (!val.includes(k)) val.push(k); });
    });
    return { ptr, val };
  }, [steps]);
  const counts = useMemo(() => {
    let cmp = 0, swp = 0;
    for (let q = 0; q <= cur && q < steps.length; q++) { if (steps[q].kind === 'compare') cmp++; if (steps[q].kind === 'swap') swp++; }
    return { cmp, swp };
  }, [steps, cur]);
  const selRaw = raw[sel] || {};
  const selStep = steps[sel];

  return (
    <div className="uv">
      <div className="wrap">
        <header className="top">
          <div>
            <h1>Universal Algorithm Visualizer</h1>
            <p>Run a built-in algorithm or forge your own from JSON steps, then inspect every compare, swap and pointer move on the workbench.</p>
          </div>
          <button type="button" className="chip" aria-pressed={sound} onClick={toggleSound}>
            <span className="led" />{sound ? 'Sound on' : 'Sound off'}
          </button>
        </header>

        <nav className="algos" aria-label="Algorithms">
          {ALGOS.map((a) => (
            <button type="button" key={a.id} className="algo" aria-pressed={a.id === algo} onClick={() => selectAlgo(a.id, { play: true })}>
              <span className="gl">{a.gl}</span>
              <span><b>{a.name}</b><small>{a.sub}</small></span>
            </button>
          ))}
        </nav>

        <div className="main">
          <section className="card stagecard">
            <div className="stagehead">
              <div><h2>{A.name}</h2><p>{A.desc}</p></div>
              <div className="headright">
                {algo === 'binary' && (
                  <label className="target">
                    <span>Target</span>
                    <input
                      type="number" value={target}
                      onChange={(e) => {
                        setTarget(e.target.value);
                        const v = Number(e.target.value);
                        if (e.target.value !== '' && Number.isInteger(v)) selectAlgo('binary', { tgt: v });
                      }}
                    />
                  </label>
                )}
                <div className="badge">Step <b>{steps.length ? cur + 1 : 0}</b> / <b>{steps.length}</b></div>
              </div>
            </div>
            <div className="stage" ref={stageRef}>
              {noGl && <div className="nogl">The 3D workbench needs WebGL, which this browser has turned off. The controls, variables and builder still work.</div>}
              <div className="narr flash">
                <span className="k" style={{ color: s ? KIND_COLOR[s.kind] : undefined }}>{s ? s.kind : 'ready'}</span>
                <span className="m" key={cur}>{s ? (s.message || '(no message)') : 'Press Run to start.'}</span>
              </div>
              <div className="tip" ref={tipRef} hidden />
              <div className="hint">Drag to orbit · scroll to zoom · hover a node to inspect</div>
            </div>
            <div className="legend">
              <span><i style={{ background: '#5b6aa8' }} />Default</span>
              <span><i style={{ background: 'var(--gold)' }} />Active</span>
              <span><i style={{ background: 'var(--blue)' }} />Search range</span>
              <span><i style={{ background: 'var(--green)' }} />Done / found</span>
              <span><i style={{ background: 'var(--violet)' }} />Pivot</span>
            </div>
            <div className="scrub">
              <div className="ticks" aria-hidden="true">
                {steps.map((st, q) => (
                  <span key={q} title={`Step ${q + 1}: ${st.message}`} className={`${q <= cur ? 'on' : ''} ${q === cur ? 'at' : ''}`} style={{ background: KIND_COLOR[st.kind] }} onClick={() => stepTo(q)} />
                ))}
              </div>
              <input type="range" min="0" max={Math.max(0, steps.length - 1)} value={cur} aria-label="Step timeline" onChange={(e) => stepTo(+e.target.value)} />
            </div>
          </section>

          <aside className="side">
            <div className="card">
              <h3>Controls</h3>
              <div className="ctl">
                <button type="button" className="btn run" onClick={run}>▶ Run</button>
                <button type="button" className="btn play" disabled={!steps.length} onClick={() => (playing ? setPlaying(false) : startPlay(false))}>{playing ? '⏸ Pause' : '▶ Play'}</button>
                <button type="button" className="btn" disabled={cur <= 0} onClick={() => stepTo(cur - 1)}>⏮ Prev <span className="kbd">←</span></button>
                <button type="button" className="btn" disabled={cur >= steps.length - 1} onClick={() => stepTo(cur + 1)}>Next ⏭ <span className="kbd">→</span></button>
                <button type="button" className="btn reset" onClick={() => { setPlaying(false); jumpRef.current = true; setCur(0); }}>⏹ Reset</button>
                <button type="button" className="btn" disabled={!A.gen} title={A.gen ? 'Generate a fresh random input' : 'New array works with the built-in algorithms'} onClick={() => selectAlgo(algo, { play: true, arr: randArr(algo === 'binary' ? 12 : 10) })}>⟳ New array</button>
                <div className="speed">
                  <div className="row"><span>Slow</span><span>{speed} ms / step</span><span>Fast</span></div>
                  <input type="range" min="60" max="1200" step="10" value={1260 - speed} aria-label="Playback speed" onChange={(e) => setSpeed(1260 - Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Live variables</h3>
              <div className="vars">
                {!varRows.ptr.length && !varRows.val.length && (
                  <div className="empty">This algorithm has no named pointers or variables. Add &quot;pointers&quot; or &quot;vars&quot; to a step to track them here.</div>
                )}
                {s && varRows.ptr.map((k) => {
                  const v = s.ptrs[k], pv = prevStep ? prevStep.ptrs[k] : undefined, has = v !== undefined, n = s.array.length;
                  const changed = has && pv !== v && cur > 0;
                  return (
                    <div key={k} className={`var ptr${has ? '' : ' off'}${changed ? ' chg' : ''}`} style={{ '--c': ptrColor(k) }}>
                      <span className="vn">{esc(k)}</span>
                      <span className="vv" key={changed ? `c${cur}` : 'v'}>{has ? v : '-'}</span>
                      <span className="vp">{has && pv !== undefined && pv !== v ? `was ${pv}` : ''}</span>
                      <span className="vt">{has ? `→ a[${v}] = ${s.array[v]}` : 'not in use this step'}</span>
                      <div className="rail" style={{ '--seg': `${100 / Math.max(1, n - 1)}%` }}>
                        <span className="dot" style={{ left: `${has ? (n > 1 ? (v / (n - 1)) * 100 : 50) : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
                {s && varRows.val.map((k) => {
                  const v = s.vars[k], pv = prevStep ? prevStep.vars[k] : undefined, has = v !== undefined;
                  const changed = has && pv !== v && cur > 0;
                  return (
                    <div key={k} className={`var${has ? '' : ' off'}${changed ? ' chg' : ''}`} style={{ '--c': ptrColor(k) }}>
                      <span className="vn">{esc(k)}</span>
                      <span className="vv" key={changed ? `c${cur}` : 'v'}>{has ? String(v) : '-'}</span>
                      <span className="vp">{has && pv !== undefined && pv !== v ? `was ${pv}` : ''}</span>
                    </div>
                  );
                })}
              </div>
              <div className="counters">
                <div><b>{counts.cmp}</b><small>Compares</small></div>
                <div><b>{counts.swp}</b><small>Swaps</small></div>
                <div><b>{s ? s.array.length : 0}</b><small>Length</small></div>
              </div>
            </div>

            <div className="card">
              <h3>Complexity</h3>
              <div className="cx">
                <div><span>Time</span><b>{A.cx[0]}</b></div>
                <div><span>Space</span><b>{A.cx[1]}</b></div>
                <div><span>Category</span><b>{A.cx[2]}</b></div>
              </div>
            </div>
          </aside>
        </div>

        <section className="card builder">
          <div className="bhead">
            <h3>Algorithm builder</h3>
            <div className={`valid ${valid ? 'ok' : 'bad'}`}>
              {valid ? `✓ ${raw.length} steps · live` : `✕ ${allProblems.length} problem${allProblems.length > 1 ? 's' : ''}`}
            </div>
            <div className="seg" role="group" aria-label="Builder view">
              <button type="button" aria-pressed={view === 'json'} onClick={() => setView('json')}>JSON editor</button>
              <button type="button" aria-pressed={view === 'timeline'} onClick={openTimeline}>Timeline</button>
            </div>
          </div>
          <p className="bsub">
            {A.gen
              ? `These steps were generated by ${A.name}. Edit any of them and the workbench follows; your edits switch you to Custom Builder.`
              : 'Each step can set array, active, sorted, pivot, low, high, mid, swap, pointers, vars and message. Valid edits update the workbench as you type.'}
          </p>

          <div hidden={view !== 'json'}>
            <StepsEditor value={text} onChange={setText} problems={problems} onSchema={setSchemaProblems} apiRef={editorApi} />
            <div className="problems">
              {allProblems.slice(0, 6).map((p, q) => (
                <button type="button" key={q} onClick={() => editorApi.current.reveal && editorApi.current.reveal(p.line)}>Line {p.line}: {p.msg}</button>
              ))}
            </div>
          </div>

          {view === 'timeline' && (
            <div className="tlview">
              {!valid ? (
                <div className="empty">Fix the problems in the JSON editor first, then the timeline can read your steps.</div>
              ) : (
                <>
                  <div className="tlstrip">
                    {steps.map((st, q) => {
                      const mx = Math.max(...st.array.map(Math.abs), 1), act = new Set(st.active), srt = new Set(st.sorted);
                      return (
                        <button
                          type="button" key={q} draggable className={`tstep${q === cur ? ' playing' : ''}`} aria-current={q === sel} style={{ '--k': KIND_COLOR[st.kind] }}
                          onClick={() => { setSel(q); setFormRev((v) => v + 1); setFormErr(''); stepTo(q); }}
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(q)); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
                          onDragLeave={(e) => e.currentTarget.classList.remove('over')}
                          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); dropStep(+e.dataTransfer.getData('text/plain'), q); }}
                        >
                          <span className="tn"><i />#{q + 1} · {st.kind}</span>
                          <span className="tm">{st.message || '(no message)'}</span>
                          <span className="mini">
                            {st.array.map((v, i) => (
                              <span key={i} className={st.pivot === i ? 'p' : act.has(i) ? 'a' : srt.has(i) ? 's' : ''} style={{ height: `${Math.max(8, (Math.abs(v) / mx) * 100)}%` }} />
                            ))}
                          </span>
                        </button>
                      );
                    })}
                    <button type="button" className="tstep addcard" onClick={() => addStep(raw.length - 1)}>＋ New step</button>
                  </div>
                  <div className="tlbar">
                    <button type="button" className="btn" onClick={() => addStep(sel)}>＋ Add after</button>
                    <button type="button" className="btn" onClick={dupStep}>⧉ Duplicate</button>
                    <button type="button" className="btn" onClick={() => moveStep(-1)}>◀ Move</button>
                    <button type="button" className="btn" onClick={() => moveStep(1)}>Move ▶</button>
                    <span className="sp" />
                    <button type="button" className="btn del" onClick={delStep}>✕ Delete step</button>
                  </div>
                  <form className="tlform" ref={formRef} key={`${sel}-${formRev}`} onInput={onFormInput} onChange={onFormInput} onSubmit={(e) => e.preventDefault()}>
                    <div className="f w4">
                      <label htmlFor="uv-message">Message</label>
                      <input id="uv-message" name="message" defaultValue={selRaw.message || ''} placeholder="Compare a[0] and a[1]" autoComplete="off" />
                      {formErr && <small className="ferr">{formErr}</small>}
                    </div>
                    <div className="f">
                      <label htmlFor="uv-type">Type</label>
                      <select id="uv-type" name="type" defaultValue={selRaw.type || 'auto'}>
                        {['auto', 'compare', 'swap', 'done', 'info', 'array'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                      <small>auto picked: {selStep ? selStep.kind : '-'}</small>
                    </div>
                    <Field name="array" label="Array" cls="w2" value={listTxt(selRaw.array)} ph={`inherits ${selStep ? listTxt(selStep.array) : ''}`} help={selRaw.array ? '' : 'left empty, so it uses the previous array'} />
                    <Field name="swap" label="Swap" value={listTxt(selRaw.swap)} ph="0, 3" />
                    <Field name="active" label="Active" value={listTxt(selRaw.active)} ph="0, 1" />
                    <Field name="sorted" label="Sorted" value={listTxt(selRaw.sorted)} ph="7, 8, 9" />
                    <Field name="pivot" label="Pivot" value={selRaw.pivot} num />
                    <Field name="found" label="Found" value={selRaw.found} num />
                    <Field name="low" label="Low" value={selRaw.low} num />
                    <Field name="high" label="High" value={selRaw.high} num />
                    <Field name="mid" label="Mid" value={selRaw.mid} num />
                    <Field name="pointers" label="Pointers" cls="w2" value={mapTxt(selRaw.pointers)} ph="i=0, j=1" />
                    <Field name="vars" label="Vars" cls="w2" value={mapTxt(selRaw.vars)} ph="target=42" />
                  </form>
                </>
              )}
            </div>
          )}

          <details className="ref">
            <summary>Step format reference</summary>
            <div className="reft">
              <table>
                <tbody>
                  <tr><th>Field</th><th>Type</th><th>What it does</th></tr>
                  <tr><td><code>array</code></td><td>number[]</td><td>Values on the workbench. Later steps inherit the last array if left out.</td></tr>
                  <tr><td><code>active</code></td><td>index[]</td><td>Nodes being compared or touched. Two active nodes get an energy arc.</td></tr>
                  <tr><td><code>sorted</code></td><td>index[]</td><td>Nodes locked in their final place.</td></tr>
                  <tr><td><code>swap</code></td><td>[a, b]</td><td>Tells the workbench which two nodes trade places, so they arc across.</td></tr>
                  <tr><td><code>pivot, low, high, mid, found</code></td><td>index</td><td>Special markers. low and high also dim everything outside the search range.</td></tr>
                  <tr><td><code>pointers</code></td><td>{'{ name: index }'}</td><td>Any named pointer, shown as a floating marker and in Live variables.</td></tr>
                  <tr><td><code>vars</code></td><td>{'{ name: value }'}</td><td>Plain values to track, like target or max. i, j, k, left and right are treated as pointers.</td></tr>
                  <tr><td><code>type</code></td><td>compare · swap · done · info</td><td>Optional. Picks the sound and timeline color. Worked out for you when left out.</td></tr>
                </tbody>
              </table>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

function Field({ name, label, value, ph = '', help = '', cls = '', num = false }) {
  const id = `uv-${name}`;
  return (
    <div className={`f ${cls}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} defaultValue={value ?? ''} placeholder={ph} inputMode={num ? 'numeric' : undefined} autoComplete="off" />
      {help && <small>{help}</small>}
    </div>
  );
}
