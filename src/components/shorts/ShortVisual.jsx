import { motion } from 'framer-motion';
const spring = { type: 'spring', stiffness: 380, damping: 26 };
function Cell({ value, hot, label, i, accent }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        layout
        initial={{ scale: 0.4, opacity: 0, y: 12 }}
        animate={{
          scale: hot ? 1.12 : 1,
          opacity: 1,
          y: 0,
          boxShadow: hot ? `0 0 22px ${accent}` : '0 0 0 rgba(0,0,0,0)',
          borderColor: hot ? accent : 'rgba(255,255,255,0.18)',
        }}
        transition={{ ...spring, delay: i * 0.05 }}
        className="flex h-10 min-w-10 items-center justify-center rounded-lg border-2 bg-white/5 px-2 font-mono text-sm font-bold text-white"
      >
        {value === null || value === 'null' ? '·' : String(value)}
      </motion.div>
      <div className="h-5 text-xs font-bold" style={{ color: accent }}>
        {label ? (
          <motion.span initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
            ▲{label}
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}

function Row({ items, hot, labels, accent, arrows = false, wrapLabel }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-1.5">
      {items.map((v, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <Cell value={v} hot={hot.has(i)} label={labels[i] ?? labels[String(i)]} i={i} accent={accent} />
          {arrows && i < items.length - 1 ? <span className="mt-2 text-white/50">→</span> : null}
        </div>
      ))}
      {wrapLabel}
    </div>
  );
}

function StackViz({ items, hot, accent }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1">
      {items.map((v, i) => (
        <motion.div
          key={i}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, borderColor: hot.has(i) ? accent : 'rgba(255,255,255,0.18)' }}
          transition={{ ...spring, delay: i * 0.06 }}
          className="w-28 rounded-md border-2 bg-white/5 py-1.5 text-center font-mono text-sm font-bold text-white"
        >
          {String(v)}
          {i === items.length - 1 ? <span className="ml-2 text-xs" style={{ color: accent }}>top</span> : null}
        </motion.div>
      ))}
    </div>
  );
}

function HashMapViz({ items, hot, accent }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((raw, i) => {
        const [k, ...rest] = String(raw).split(':');
        return (
          <motion.div
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1, borderColor: hot.has(i) ? accent : 'rgba(255,255,255,0.15)' }}
            transition={{ ...spring, delay: i * 0.06 }}
            className="flex items-center justify-between rounded-md border-2 bg-white/5 px-2 py-1 font-mono text-xs text-white"
          >
            <span className="font-bold">{k}</span>
            <span className="text-white/60">{rest.join(':')}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function TreeViz({ items, hot, accent }) {
  const W = 280;
  const levelH = 52;
  const nodes = items
    .map((v, i) => {
      if (v === null || v === 'null' || v === '') return null;
      const depth = Math.floor(Math.log2(i + 1));
      const posInLevel = i + 1 - 2 ** depth;
      const slots = 2 ** depth;
      return { i, v, x: ((posInLevel + 0.5) / slots) * W, y: 22 + depth * levelH };
    })
    .filter(Boolean);
  const byIdx = Object.fromEntries(nodes.map((n) => [n.i, n]));
  const depthMax = nodes.reduce((m, n) => Math.max(m, n.y), 0);

  return (
    <svg viewBox={`0 0 ${W} ${depthMax + 26}`} className="w-full max-w-xs">
      {nodes.map((n) => {
        const p = byIdx[Math.floor((n.i - 1) / 2)];
        return n.i > 0 && p ? (
          <motion.line
            key={`e${n.i}`}
            x1={p.x} y1={p.y} x2={n.x} y2={n.y}
            stroke="rgba(255,255,255,0.3)" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: n.i * 0.05 }}
          />
        ) : null;
      })}
      {nodes.map((n) => (
        <motion.g key={n.i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: n.i * 0.06 }} style={{ originX: `${n.x}px`, originY: `${n.y}px` }}>
          <circle cx={n.x} cy={n.y} r="16" fill={hot.has(n.i) ? accent : '#161b22'} stroke={hot.has(n.i) ? accent : 'rgba(255,255,255,0.35)'} strokeWidth="2" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={hot.has(n.i) ? '#0d1117' : '#fff'} fontFamily="monospace">
            {String(n.v)}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

function GraphViz({ items, hot, accent }) {
  const edges = items.map((e) => String(e).split(/[-,>\s]+/).filter(Boolean)).filter((e) => e.length >= 2);
  const names = [...new Set(edges.flat())];
  const R = 95;
  const C = 120;
  const pos = Object.fromEntries(
    names.map((n, i) => {
      const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
      return [n, { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }];
    })
  );
  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px]">
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
          stroke={hot.has(i) ? accent : 'rgba(255,255,255,0.3)'} strokeWidth={hot.has(i) ? 4 : 2}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.07 }}
        />
      ))}
      {names.map((n, i) => (
        <motion.g key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: i * 0.05 }} style={{ originX: `${pos[n].x}px`, originY: `${pos[n].y}px` }}>
          <circle cx={pos[n].x} cy={pos[n].y} r="16" fill="#161b22" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
          <text x={pos[n].x} y={pos[n].y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="monospace">{n}</text>
        </motion.g>
      ))}
    </svg>
  );
}

function GridViz({ items, hot, accent }) {
  const rows = items.map((r) => String(r).trim().split(/\s+/));
  const cols = rows[0]?.length || 1;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {rows.flatMap((r, ri) =>
        r.map((v, ci) => {
          const idx = ri * cols + ci;
          const on = hot.has(idx);
          return (
            <motion.div
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1, backgroundColor: on ? accent : v === '1' || v === '#' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.05)' }}
              transition={{ ...spring, delay: idx * 0.02 }}
              className="flex h-8 w-8 items-center justify-center rounded font-mono text-xs font-bold text-white"
            >
              {v}
            </motion.div>
          );
        })
      )}
    </div>
  );
}

export default function ShortVisual({ visual, accent = '#58a6ff' }) {
  if (!visual || visual.type === 'none' || !visual.items?.length) return null;
  const items = visual.items.slice(0, 16);
  const hot = new Set(visual.highlight || []);
  const labels = visual.labels || {};

  let body;
  switch (visual.type) {
    case 'stack':
      body = <StackViz items={items} hot={hot} accent={accent} />;
      break;
    case 'queue':
      body = (
        <Row
          items={items} hot={hot} accent={accent}
          labels={{ 0: 'front', [items.length - 1]: 'back', ...labels }}
        />
      );
      break;
    case 'hashmap':
      body = <HashMapViz items={items} hot={hot} accent={accent} />;
      break;
    case 'linkedlist':
      body = <Row items={items} hot={hot} labels={labels} accent={accent} arrows wrapLabel={<span className="mt-2 text-white/50">∅</span>} />;
      break;
    case 'tree':
      body = <TreeViz items={items} hot={hot} accent={accent} />;
      break;
    case 'graph':
      body = <GraphViz items={items} hot={hot} accent={accent} />;
      break;
    case 'grid':
      body = <GridViz items={items} hot={hot} accent={accent} />;
      break;
    case 'window': {
      const idx = [...hot].sort((a, b) => a - b);
      const lo = idx[0];
      const hi = idx[idx.length - 1];
      body = (
        <div className="relative">
          <Row items={items} hot={hot} labels={labels} accent={accent} />
          {idx.length ? (
            <motion.div
              layout
              className="pointer-events-none absolute -top-1 h-12 rounded-xl border-2 border-dashed"
              style={{ borderColor: accent, left: `${(lo / items.length) * 100}%`, width: `${((hi - lo + 1) / items.length) * 100}%` }}
              transition={spring}
            />
          ) : null}
        </div>
      );
      break;
    }
    default:
      body = <Row items={items} hot={hot} labels={labels} accent={accent} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-auto flex w-full justify-center rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur"
    >
      {body}
    </motion.div>
  );
}
