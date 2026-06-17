// src/Visualizer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_ARRAY = [42, 18, 73, 9, 56, 31, 88, 24, 67, 12];

const DEFAULT_CUSTOM_STEPS = JSON.stringify(
  [
    {
      type: 'array',
      message: 'Start custom algorithm',
      array: [5, 2, 9, 1],
      active: [],
      sorted: [],
    },
    {
      type: 'array',
      message: 'Compare 5 and 2',
      array: [5, 2, 9, 1],
      active: [0, 1],
      sorted: [],
    },
    {
      type: 'array',
      message: 'Swap 5 and 2',
      array: [2, 5, 9, 1],
      active: [0, 1],
      sorted: [],
    },
    {
      type: 'array',
      message: 'Algorithm completed',
      array: [1, 2, 5, 9],
      active: [],
      sorted: [0, 1, 2, 3],
    },
  ],
  null,
  2
);

const ALGORITHMS = {
  custom: {
    name: 'Custom Builder',
    icon: '🛠️',
    category: 'Any Algorithm',
    timeComplexity: 'User defined',
    spaceComplexity: 'User defined',
  },
  bubbleSort: {
    name: 'Bubble Sort',
    icon: '🫧',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
  },
  binarySearch: {
    name: 'Binary Search',
    icon: '🎯',
    category: 'Searching',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
  },
};

function makeStep(data) {
  return {
    type: data.type || 'array',
    message: data.message || '',
    array: data.array || [],
    active: data.active || [],
    sorted: data.sorted || [],
    pivot: data.pivot ?? null,
    low: data.low ?? null,
    high: data.high ?? null,
    graph: data.graph || null,
    matrix: data.matrix || null,
  };
}

function bubbleSortSteps(input) {
  const a = [...input];
  const steps = [];

  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      steps.push(makeStep({
        message: `Compare ${a[j]} and ${a[j + 1]}`,
        array: [...a],
        active: [j, j + 1],
      }));

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push(makeStep({
          message: 'Swap values',
          array: [...a],
          active: [j, j + 1],
        }));
      }
    }
  }

  steps.push(makeStep({
    message: 'Bubble Sort completed',
    array: [...a],
    sorted: a.map((_, i) => i),
  }));

  return steps;
}

function binarySearchSteps(input, target) {
  const a = [...input].sort((x, y) => x - y);
  const steps = [];
  let low = 0;
  let high = a.length - 1;

  steps.push(makeStep({
    message: 'Binary Search starts with sorted array',
    array: [...a],
  }));

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    steps.push(makeStep({
      message: `Check middle value ${a[mid]}`,
      array: [...a],
      active: [mid],
      low,
      high,
    }));

    if (a[mid] === Number(target)) {
      steps.push(makeStep({
        message: `Found ${target} at index ${mid}`,
        array: [...a],
        active: [mid],
        sorted: [mid],
      }));
      return steps;
    }

    if (a[mid] < Number(target)) low = mid + 1;
    else high = mid - 1;
  }

  steps.push(makeStep({
    message: `${target} not found`,
    array: [...a],
  }));

  return steps;
}

function randomArray() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 90) + 10);
}

export default function Visualizer() {
  const [algorithm, setAlgorithm] = useState('custom');
  const [baseArray, setBaseArray] = useState(DEFAULT_ARRAY);
  const [array, setArray] = useState(DEFAULT_ARRAY);
  const [target, setTarget] = useState(56);

  const [customInput, setCustomInput] = useState(DEFAULT_CUSTOM_STEPS);
  const [customError, setCustomError] = useState('');

  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(450);

  const current = steps[currentStep] || makeStep({
    message: 'Choose an algorithm or paste custom steps, then press Run.',
    array,
  });

  const selectedAlgo = ALGORITHMS[algorithm];

  const isSearchAlgorithm = algorithm === 'binarySearch';

  const buildSteps = () => {
    if (algorithm === 'bubbleSort') return bubbleSortSteps(baseArray);
    if (algorithm === 'binarySearch') return binarySearchSteps(baseArray, target);

    try {
      const parsed = JSON.parse(customInput);
      if (!Array.isArray(parsed)) {
        throw new Error('Custom steps must be an array.');
      }

      setCustomError('');
      return parsed.map(makeStep);
    } catch (err) {
      setCustomError(err.message);
      return [];
    }
  };

  const run = () => {
    const generated = buildSteps();
    if (!generated.length) return;

    setSteps(generated);
    setCurrentStep(0);
    setArray(generated[0].array || []);
    setIsPlaying(true);
  };

  const nextStep = () => {
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const next = currentStep + 1;
    setCurrentStep(next);
    setArray(steps[next].array || []);
  };

  const prevStep = () => {
    if (currentStep <= 0) return;

    const prev = currentStep - 1;
    setCurrentStep(prev);
    setArray(steps[prev].array || []);
  };

  const reset = () => {
    const arr = randomArray();
    setBaseArray(arr);
    setArray(arr);
    setTarget(arr[Math.floor(Math.random() * arr.length)]);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(nextStep, speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speed]);

  const getBarColor = (index) => {
    if (current.sorted?.includes(index)) return '#22c55e';
    if (current.pivot === index) return '#ec4899';
    if (current.active?.includes(index)) return '#facc15';
    if (
      current.low !== null &&
      current.high !== null &&
      index >= current.low &&
      index <= current.high
    ) {
      return '#38bdf8';
    }
    return '#334155';
  };

  const progress = useMemo(() => {
    if (!steps.length) return 0;
    return ((currentStep + 1) / steps.length) * 100;
  }, [steps.length, currentStep]);

  return (
    <div className="min-h-screen bg-[#070716] text-white p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400">
          🔬 Universal Algorithm Visualizer
        </h1>

        <p className="text-gray-400 text-sm mt-2 mb-6">
          Visualize built-in algorithms or create your own algorithm using custom JSON steps.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {Object.entries(ALGORITHMS).map(([key, algo]) => (
            <button
              key={key}
              onClick={() => {
                setAlgorithm(key);
                setSteps([]);
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className={`rounded-2xl p-4 text-left border transition-all ${
                algorithm === key
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-2">{algo.icon}</div>
              <div className="text-sm font-bold">{algo.name}</div>
              <div className="text-xs text-gray-500">{algo.category}</div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
            <div className="flex justify-between gap-4 flex-wrap mb-5">
              <div>
                <h2 className="text-xl font-bold text-cyan-300">
                  {selectedAlgo.icon} {selectedAlgo.name}
                </h2>
                <p className="text-xs text-gray-400 mt-1">{current.message}</p>
              </div>

              {isSearchAlgorithm && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>

            <div className="relative h-[340px] flex items-end justify-center gap-3 bg-black/30 rounded-2xl border border-white/10 p-5 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_45%)]" />

              <AnimatePresence mode="popLayout">
                {array.map((value, index) => (
                  <motion.div
                    key={`${index}-${value}`}
                    layout
                    initial={{ opacity: 0, y: 40 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      height: `${Math.max(35, (value / 100) * 260)}px`,
                      backgroundColor: getBarColor(index),
                      scale: current.active?.includes(index) ? 1.08 : 1,
                    }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="relative w-10 rounded-t-xl flex items-end justify-center pb-2 shadow-lg"
                  >
                    <span className="text-xs text-black font-black">{value}</span>
                    <span className="absolute -bottom-6 text-[10px] text-gray-500">{index}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8 text-xs text-gray-400">
              <span>⬛ Default</span>
              <span>🟨 Active</span>
              <span>🟦 Search Range</span>
              <span>🟩 Done / Found</span>
              <span>🟪 Pivot</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <h3 className="font-bold text-purple-300 mb-4">⚙️ Controls</h3>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={run} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl py-3">
                  ▶ Run
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!steps.length}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl py-3 disabled:opacity-40"
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>

                <button
                  onClick={prevStep}
                  disabled={isPlaying || currentStep <= 0}
                  className="bg-white/10 hover:bg-white/20 rounded-xl py-3 disabled:opacity-40"
                >
                  ⏮ Prev
                </button>

                <button
                  onClick={nextStep}
                  disabled={isPlaying || !steps.length}
                  className="bg-purple-500 hover:bg-purple-400 rounded-xl py-3 disabled:opacity-40"
                >
                  ⏭ Step
                </button>

                <button onClick={reset} className="col-span-2 bg-white/10 hover:bg-white/20 rounded-xl py-3">
                  🔄 New Array
                </button>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>🐢 Slow</span>
                  <span>{speed}ms</span>
                  <span>⚡ Fast</span>
                </div>

                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={1100 - speed}
                  onChange={(e) => setSpeed(1100 - Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{steps.length ? currentStep + 1 : 0}/{steps.length}</span>
                </div>

                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-cyan-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <h3 className="font-bold text-pink-300 mb-3">📊 Complexity</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between bg-black/30 rounded-xl px-4 py-3">
                  <span className="text-gray-400">Time</span>
                  <span className="text-yellow-300 font-bold">{selectedAlgo.timeComplexity}</span>
                </div>

                <div className="flex justify-between bg-black/30 rounded-xl px-4 py-3">
                  <span className="text-gray-400">Space</span>
                  <span className="text-purple-300 font-bold">{selectedAlgo.spaceComplexity}</span>
                </div>

                <div className="flex justify-between bg-black/30 rounded-xl px-4 py-3">
                  <span className="text-gray-400">Category</span>
                  <span className="text-cyan-300 font-bold">{selectedAlgo.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {algorithm === 'custom' && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-3xl p-5">
            <h3 className="font-bold text-emerald-300 mb-2">🛠️ Custom Algorithm Builder</h3>

            <p className="text-xs text-gray-400 mb-4">
              Paste any algorithm as visual steps. Each step can contain array, active, sorted, pivot, low, high and message.
            </p>

            {customError && (
              <div className="mb-3 text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-sm">
                {customError}
              </div>
            )}

            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              spellCheck={false}
              className="w-full min-h-[360px] bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-cyan-100 outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}
