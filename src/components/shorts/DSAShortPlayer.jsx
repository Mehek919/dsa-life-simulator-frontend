import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ShortVisual from './ShortVisual';
import useProblemShort from '../../hooks/useProblemShort';
const THEMES = {
  trailer: { accent: '#ffb020', bg: 'from-[#1a1206] via-[#0d1117] to-[#000]' },
  sports: { accent: '#3fb950', bg: 'from-[#06210f] via-[#0d1117] to-[#000]' },
  nature: { accent: '#7ee787', bg: 'from-[#0b1f14] via-[#0d1117] to-[#06120b]' },
  cooking: { accent: '#ff7b72', bg: 'from-[#260b0b] via-[#0d1117] to-[#000]' },
  heist: { accent: '#d2a8ff', bg: 'from-[#180b26] via-[#0d1117] to-[#000]' },
  groupchat: { accent: '#58a6ff', bg: 'from-[#071a33] via-[#0d1117] to-[#000]' },
  conspiracy: { accent: '#39ff14', bg: 'from-[#0a1a05] via-[#0d1117] to-[#000]' },
  gym: { accent: '#ff5a1f', bg: 'from-[#2a0f04] via-[#0d1117] to-[#000]' },
  news: { accent: '#f85149', bg: 'from-[#2a0606] via-[#0d1117] to-[#000]' },
  anime: { accent: '#ff79c6', bg: 'from-[#2a0820] via-[#0d1117] to-[#000]' },
  detective: { accent: '#e3b341', bg: 'from-[#1c1608] via-[#0d1117] to-[#000]' },
  gamer: { accent: '#00e5ff', bg: 'from-[#03222a] via-[#0d1117] to-[#000]' },
};
const DEFAULT_THEME = THEMES.groupchat;
const kindBadge = {
  hook: 'SOLVED',
  analogy: 'THE VIBE',
  visual: 'WATCH THIS',
  insight: 'THE TRICK',
  punchline: 'REMEMBER',
};

export default function DSAShortPlayer({ problemId, apiBase, getToken, onClose, onNext, narrate = false }) {
  const { short, status, retry, markWatched } = useProblemShort({ problemId, apiBase, getToken });

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 within current scene
  const [ended, setEnded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(narrate);
  const [canSkip, setCanSkip] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const holdTimer = useRef(null);
  const heldRef = useRef(false);
  const elapsedRef = useRef(0);

  const scenes = short?.scenes || [];
  const scene = scenes[idx];
  const theme = THEMES[short?.style] || DEFAULT_THEME;

  const goTo = useCallback(
    (n) => {
      if (!scenes.length) return;
      if (n >= scenes.length) {
        setEnded(true);
        markWatched();
        return;
      }
      elapsedRef.current = 0;
      setProgress(0);
      setIdx(Math.max(0, n));
    },
    [scenes.length, markWatched]
  );

  // Playback clock
  useEffect(() => {
    if (status !== 'ready' || ended || paused || !scene) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      elapsedRef.current += now - last;
      last = now;
      const p = Math.min(1, elapsedRef.current / scene.durationMs);
      setProgress(p);
      if (p >= 1) goTo(idx + 1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, ended, paused, scene, idx, goTo]);

  // Skip button appears after 3s so it does not feel forced
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Optional narration through the browser voice (free, no audio files)
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return undefined;
    synth.cancel();
    if (voiceOn && scene && !ended && !paused) {
      const u = new SpeechSynthesisUtterance([scene.text, scene.sub].filter(Boolean).join('. '));
      u.rate = 1.08;
      u.pitch = 1.05;
      synth.speak(u);
    }
    return () => synth.cancel();
  }, [voiceOn, scene, ended, paused]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'ArrowRight') goTo(idx + 1);
      else if (e.key === 'ArrowLeft') goTo(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, idx, onClose]);

  const onPointerDown = () => {
    heldRef.current = false;
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, 220);
  };

  const onPointerUp = (e) => {
    clearTimeout(holdTimer.current);
    if (heldRef.current) {
      setPaused(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    goTo(x < rect.width / 3 ? idx - 1 : idx + 1);
  };

  const replay = () => {
    setEnded(false);
    elapsedRef.current = 0;
    setProgress(0);
    setIdx(0);
  };

  const share = async () => {
    const text = `I just learned ${short.pattern} on DSA Life Simulator: "${short.memeLine}"`;
    const url = 'https://dsalifesimulator.com';
    try {
      if (navigator.share) await navigator.share({ title: short.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareMsg('Copied!');
        setTimeout(() => setShareMsg(''), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="DSA Short"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b ${theme.bg} sm:h-[min(860px,94dvh)] sm:max-w-[420px] sm:rounded-3xl sm:border sm:border-white/10`}      >
        {/* Top bar: progress segments + controls */}
        <div className="z-20 px-3 pt-3">
          <div className="flex gap-1">
            {(scenes.length ? scenes : [0, 1, 2, 3, 4, 5]).map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: theme.accent,
                    width: ended || i < idx ? '100%' : i === idx ? `${progress * 100}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/70">
            <span className="font-semibold tracking-wide">
              DSA SHORTS {short ? <span style={{ color: theme.accent }}>· {short.styleName}</span> : null}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                className="rounded-full bg-white/10 px-2 py-1 hover:bg-white/20"
                aria-label={voiceOn ? 'Mute narration' : 'Turn on narration'}
              >
                {voiceOn ? '🔊' : '🔇'}
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="rounded-full bg-white/10 px-2 py-1 hover:bg-white/20"
                aria-label={paused ? 'Play' : 'Pause'}
              >
                {paused ? '▶' : '❚❚'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/10 px-2 py-1 hover:bg-white/20"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Stage */}
        <div
          className="relative z-10 flex flex-1 select-none flex-col items-center justify-center px-6 text-center"
          onPointerDown={status === 'ready' && !ended ? onPointerDown : undefined}
          onPointerUp={status === 'ready' && !ended ? onPointerUp : undefined}
          onPointerLeave={() => clearTimeout(holdTimer.current)}
        >
          {status === 'loading' || status === 'idle' ? <Loading accent={theme.accent} /> : null}

          {status === 'error' ? (
            <div className="space-y-4 text-white">
              <div className="text-5xl">📼</div>
              <p className="text-lg font-bold">This short is still in the editing room.</p>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={retry} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
                  Try again
                </button>
                <button type="button" onClick={onNext || onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-black" style={{ background: theme.accent }}>
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {status === 'ready' && !ended && scene ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id || idx}
                className="flex w-full flex-col items-center gap-5"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              >
                <motion.span
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: -3 }}
                  className="rounded-md px-2 py-0.5 text-[11px] font-black tracking-widest text-black"
                  style={{ background: theme.accent }}
                >
                  {kindBadge[scene.kind] || 'WATCH THIS'}
                </motion.span>

                {scene.emoji ? (
                  <motion.div
                    className="text-6xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1], rotate: [0, 12, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    {scene.emoji}
                  </motion.div>
                ) : null}

                <h2 className="text-balance text-2xl font-black leading-tight text-white drop-shadow sm:text-[28px]">
                  <Words text={scene.text} accent={theme.accent} />
                </h2>

                {scene.visual ? <ShortVisual visual={scene.visual} accent={theme.accent} /> : null}

                {scene.sub ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-sm text-base text-white/75"
                  >
                    {scene.sub}
                  </motion.p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          ) : null}

          {status === 'ready' && ended ? (
            <EndCard short={short} theme={theme} onReplay={replay} onShare={share} shareMsg={shareMsg} onNext={onNext} onClose={onClose} />
          ) : null}

          {paused && !ended && status === 'ready' ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white">Paused</span>
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        {status === 'ready' && !ended ? (
          <div className="z-20 flex items-center justify-between px-4 pb-5 text-xs text-white/60">
            <span className="truncate pr-2">🎬 {short.title}</span>
            {canSkip ? (
              <button
                type="button"
                onClick={() => goTo(scenes.length)}
                className="shrink-0 rounded-full border border-white/20 px-3 py-1 font-semibold text-white/80 hover:bg-white/10"
              >
                Skip ⏭
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

/** Pops each word in, and glows anything wrapped in *asterisks*. */
function Words({ text, accent }) {
  const words = String(text).split(' ');
  return words.map((w, i) => {
    const hot = /^\*.*\*[.,!?]?$/.test(w);
    const clean = w.replace(/\*/g, '');
    return (
      <motion.span
        key={i}
        className="inline-block"
        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: i * 0.06, duration: 0.25 }}
        style={hot ? { color: accent } : undefined}
      >
        {clean}
        {i < words.length - 1 ? ' ' : ''}
      </motion.span>
    );
  });
}

function Loading({ accent }) {
  const lines = ['Rolling the cameras', 'Bribing the pointers', 'Teaching the array to act', 'Adding meme energy'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 1100);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="flex flex-col items-center gap-4 text-white">
      <motion.div
        className="h-14 w-14 rounded-full border-4 border-white/15"
        style={{ borderTopColor: accent }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      />
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-white/70">
          {lines[i]}...
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function EndCard({ short, theme, onReplay, onShare, shareMsg, onNext, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-full max-w-sm flex-col items-center gap-5 text-white"
    >
      <motion.div className="text-6xl" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.8 }}>
        🧠
      </motion.div>
      <div>
        <p className="text-xs font-bold tracking-widest text-white/50">PATTERN UNLOCKED</p>
        <h3 className="mt-1 text-3xl font-black" style={{ color: theme.accent }}>
          {short.pattern}
        </h3>
      </div>

      <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-4 text-lg font-semibold italic leading-snug">
        “{short.memeLine}”
      </blockquote>

      <div className="flex gap-2 text-sm">
        <span className="rounded-full bg-white/10 px-3 py-1 font-mono">⏱ {short.complexity?.time}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 font-mono">💾 {short.complexity?.space}</span>
      </div>

      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        <button type="button" onClick={onReplay} className="rounded-xl bg-white/10 py-3 text-sm font-semibold hover:bg-white/20">
          ↺ Replay
        </button>
        <button type="button" onClick={onShare} className="rounded-xl bg-white/10 py-3 text-sm font-semibold hover:bg-white/20">
          {shareMsg || '↗ Share'}
        </button>
        <button
          type="button"
          onClick={onNext || onClose}
          className="col-span-2 rounded-xl py-3.5 text-base font-black text-black"
          style={{ background: theme.accent }}
        >
          Next problem →
        </button>
      </div>
    </motion.div>
  );
}
