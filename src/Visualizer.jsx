// src/Visualizer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const ALGORITHMS = {
  bubbleSort: {
    name: 'Bubble Sort',
    icon: '🫧',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
  },
  selectionSort: {
    name: 'Selection Sort',
    icon: '🎯',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
  },
  insertionSort: {
    name: 'Insertion Sort',
    icon: '🃏',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
  },
  mergeSort: {
    name: 'Merge Sort',
    icon: '🧬',
    category: 'Sorting',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(n)',
  },
  quickSort: {
    name: 'Quick Sort',
    icon: '⚡',
    category: 'Sorting',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(log n)',
  },
  linearSearch: {
    name: 'Linear Search',
    icon: '🔦',
    category: 'Searching',
    timeComplexity: 'O(n)',
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

const DEFAULT_ARRAY = [42, 18, 73, 9, 56, 31, 88, 24, 67, 12, 95, 39];

function randomArray() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10);
}

function finalSortedIndexes(length) {
  return Array.from({ length }, (_, i) => i);
}

function step({ type, message, array, active = [], sorted = [], pivot = null, low = null, high = null, found = false }) {
  return {
    type,
    message,
    array: [...array],
    active,
    sorted,
    pivot,
    low,
    high,
    found,
  };
}

function bubbleSortSteps(input) {
  const a = [...input];
  const steps = [];

  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      steps.push(step({
        type: 'compare',
        message: `Compare ${a[j]} and ${a[j + 1]}`,
        array: a,
        active: [j, j + 1],
        sorted: finalSortedIndexes(a.length).slice(a.length - i),
      }));

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push(step({
          type: 'swap',
          message: `Swap them because left value is bigger`,
          array: a,
          active: [j, j + 1],
          sorted: finalSortedIndexes(a.length).slice(a.length - i),
        }));
      }
    }
  }

  steps.push(step({
    type: 'done',
    message: 'Bubble Sort completed!',
    array: a,
    sorted: finalSortedIndexes(a.length),
  }));

  return steps;
}

function selectionSortSteps(input) {
  const a = [...input];
  const steps = [];

  for (let i = 0; i < a.length; i++) {
    let min = i;

    steps.push(step({
      type: 'select',
      message: `Start from index ${i}. Current minimum is ${a[min]}`,
      array: a,
      active: [i],
      sorted: finalSortedIndexes(i),
    }));

    for (let j = i + 1; j < a.length; j++) {
      steps.push(step({
        type: 'compare',
        message: `Compare ${a[j]} with current minimum ${a[min]}`,
        array: a,
        active: [min, j],
        sorted: finalSortedIndexes(i),
      }));

      if (a[j] < a[min]) {
        min = j;
        steps.push(step({
          type: 'minimum',
          message: `New minimum found: ${a[min]}`,
          array: a,
          active: [min],
          sorted: finalSortedIndexes(i),
        }));
      }
    }

    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      steps.push(step({
        type: 'swap',
        message: `Place ${a[i]} at sorted position ${i}`,
        array: a,
        active: [i, min],
        sorted: finalSortedIndexes(i + 1),
      }));
    }
  }

  steps.push(step({
    type: 'done',
    message: 'Selection Sort completed!',
    array: a,
    sorted: finalSortedIndexes(a.length),
  }));

  return steps;
}

function insertionSortSteps(input) {
  const a = [...input];
  const steps = [];

  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;

    steps.push(step({
      type: 'pick',
      message: `Pick ${key} and insert it into the sorted left side`,
      array: a,
      active: [i],
      sorted: finalSortedIndexes(i),
    }));

    while (j >= 0 && a[j] > key) {
      steps.push(step({
        type: 'shift',
        message: `Shift ${a[j]} to the right`,
        array: a,
        active: [j, j + 1],
        sorted: finalSortedIndexes(i),
      }));

      a[j + 1] = a[j];
      j--;

      steps.push(step({
        type: 'shifted',
        message: `Value shifted`,
        array: a,
        active: [j + 1],
        sorted: finalSortedIndexes(i),
      }));
    }

    a[j + 1] = key;

    steps.push(step({
      type: 'insert',
      message: `Insert ${key} at position ${j + 1}`,
      array: a,
      active: [j + 1],
      sorted: finalSortedIndexes(i + 1),
    }));
  }

  steps.push(step({
    type: 'done',
    message: 'Insertion Sort completed!',
    array: a,
    sorted: finalSortedIndexes(a.length),
  }));

  return steps;
}

function mergeSortSteps(input) {
  const a = [...input];
  const steps = [];

  function merge(left, mid, right) {
    const temp = [];
    let i = left;
    let j = mid + 1;

    while (i <= mid && j <= right) {
      steps.push(step({
        type: 'compare',
        message: `Compare ${a[i]} and ${a[j]}`,
        array: a,
        active: [i, j],
      }));

      if (a[i] <= a[j]) temp.push(a[i++]);
      else temp.push(a[j++]);
    }

    while (i <= mid) temp.push(a[i++]);
    while (j <= right) temp.push(a[j++]);

    for (let k = left; k <= right; k++) {
      a[k] = temp[k - left];
      steps.push(step({
        type: 'merge',
        message: `Merge value ${a[k]} into position ${k}`,
        array: a,
        active: [k],
      }));
    }
  }

  function divide(left, right) {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);

    steps.push(step({
      type: 'divide',
      message: `Divide range ${left} to ${right}`,
      array: a,
      active: [left, right],
    }));

    divide(left, mid);
    divide(mid + 1, right);
    merge(left, mid, right);
  }

  divide(0, a.length - 1);

  steps.push(step({
    type: 'done',
    message: 'Merge Sort completed!',
    array: a,
    sorted: finalSortedIndexes(a.length),
  }));

  return steps;
}

function quickSortSteps(input) {
  const a = [...input];
  const steps = [];

  function partition(low, high) {
    const pivotValue = a[high];
    let i = low - 1;

    steps.push(step({
      type: 'pivot',
      message: `Choose ${pivotValue} as pivot`,
      array: a,
      pivot: high,
      low,
      high,
    }));

    for (let j = low; j < high; j++) {
      steps.push(step({
        type: 'compare',
        message: `Compare ${a[j]} with pivot ${pivotValue}`,
        array: a,
        active: [j],
        pivot: high,
        low,
        high,
      }));

      if (a[j] < pivotValue) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];

        steps.push(step({
          type: 'swap',
          message: `Move ${a[i]} to the left of pivot`,
          array: a,
          active: [i, j],
          pivot: high,
          low,
          high,
        }));
      }
    }

    [a[i + 1], a[high]] = [a[high], a[i + 1]];

    steps.push(step({
      type: 'place',
      message: `Place pivot ${a[i + 1]} in correct position`,
      array: a,
      active: [i + 1],
      pivot: i + 1,
      low,
      high,
    }));

    return i + 1;
  }

  function quickSort(low, high) {
    if (low < high) {
      const pi = partition(low, high);
      quickSort(low, pi - 1);
      quickSort(pi + 1, high);
    }
  }

  quickSort(0, a.length - 1);

  steps.push(step({
    type: 'done',
    message: 'Quick Sort completed!',
    array: a,
    sorted: finalSortedIndexes(a.length),
  }));

  return steps;
}

function linearSearchSteps(input, target) {
  const a = [...input];
  const steps = [];

  for (let i = 0; i < a.length; i++) {
    steps.push(step({
      type: 'search',
      message: `Check index ${i}: is ${a[i]} equal to ${target}?`,
      array: a,
      active: [i],
    }));

    if (a[i] === target) {
      steps.push(step({
        type: 'found',
        message: `Found ${target} at index ${i}`,
        array: a,
        active: [i],
        found: true,
      }));
      return steps;
    }
  }

  steps.push(step({
    type: 'not-found',
    message: `${target} was not found`,
    array: a,
  }));

  return steps;
}

function binarySearchSteps(input, target) {
  const a = [...input].sort((x, y) => x - y);
  const steps = [];
  let low = 0;
  let high = a.length - 1;

  steps.push(step({
    type: 'prepare',
    message: 'Binary Search needs a sorted array, so array is sorted first',
    array: a,
  }));

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    steps.push(step({
      type: 'search',
      message: `Check middle index ${mid}: ${a[mid]}`,
      array: a,
      active: [mid],
      low,
      high,
    }));

    if (a[mid] === target) {
      steps.push(step({
        type: 'found',
        message: `Found ${target} at index ${mid}`,
        array: a,
        active: [mid],
        low,
        high,
        found: true,
      }));
      return steps;
    }

    if (a[mid] < target) {
      steps.push(step({
        type: 'right',
        message: `${a[mid]} is smaller than ${target}, search right half`,
        array: a,
        active: [mid],
        low,
        high,
      }));
      low = mid + 1;
    } else {
      steps.push(step({
        type: 'left',
        message: `${a[mid]} is bigger than ${target}, search left half`,
        array: a,
        active: [mid],
        low,
        high,
      }));
      high = mid - 1;
    }
  }

  steps.push(step({
    type: 'not-found',
    message: `${target} was not found`,
    array: a,
  }));

  return steps;
}

export default function Visualizer() {
  const [array, setArray] = useState(DEFAULT_ARRAY);
  const [baseArray, setBaseArray] = useState(DEFAULT_ARRAY);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(450);
  const [algorithm, setAlgorithm] = useState('bubbleSort');
  const [target, setTarget] = useState(56);

  const current = steps[currentStep] || {
    array,
    active: [],
    sorted: [],
    message: 'Choose an algorithm and press Run.',
  };

  const selectedAlgo = ALGORITHMS[algorithm];

  const isSearchAlgorithm = useMemo(
    () => ['linearSearch', 'binarySearch'].includes(algorithm),
    [algorithm]
  );

  const generateArray = () => {
    const arr = randomArray();
    setArray(arr);
    setBaseArray(arr);
    setTarget(arr[Math.floor(Math.random() * arr.length)]);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const resetToBase = () => {
    setArray(baseArray);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const buildSteps = () => {
    if (algorithm === 'bubbleSort') return bubbleSortSteps(baseArray);
    if (algorithm === 'selectionSort') return selectionSortSteps(baseArray);
    if (algorithm === 'insertionSort') return insertionSortSteps(baseArray);
    if (algorithm === 'mergeSort') return mergeSortSteps(baseArray);
    if (algorithm === 'quickSort') return quickSortSteps(baseArray);
    if (algorithm === 'linearSearch') return linearSearchSteps(baseArray, Number(target));
    if (algorithm === 'binarySearch') return binarySearchSteps(baseArray, Number(target));
    return [];
  };

  const runAlgorithm = () => {
    const generated = buildSteps();
    setSteps(generated);
    setCurrentStep(0);
    setArray(generated[0]?.array || baseArray);
    setIsPlaying(true);
  };

  const applyStep = (index) => {
    const s = steps[index];
    if (!s) return;
    setArray(s.array);
    setCurrentStep(index);
  };

  const nextStep = () => {
    if (!steps.length) {
      const generated = buildSteps();
      setSteps(generated);
      setArray(generated[0]?.array || baseArray);
      setCurrentStep(0);
      return;
    }

    if (currentStep < steps.length - 1) {
      applyStep(currentStep + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) applyStep(currentStep - 1);
  };

  useEffect(() => {
    if (!isPlaying) return;

    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      nextStep();
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length, speed]);

  const getBarColor = (index) => {
    if (current.found && current.active?.includes(index)) return '#22c55e';
    if (current.sorted?.includes(index)) return '#10b981';
    if (current.pivot === index) return '#ec4899';
    if (current.active?.includes(index)) return '#facc15';
    if (current.low !== null && current.high !== null && index >= current.low && index <= current.high) return '#38bdf8';
    return '#334155';
  };

  return (
    <div className="min-h-screen bg-[#070716] text-white p-4 md:p-8 font-mono overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-7">
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400">
            🔬 Algorithm Visualizer
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Visualize sorting and searching algorithms step-by-step with cinematic animations.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          {Object.entries(ALGORITHMS).map(([key, algo]) => (
            <button
              key={key}
              onClick={() => {
                setAlgorithm(key);
                resetToBase();
              }}
              className={`rounded-2xl p-4 text-left border transition-all ${
                algorithm === key
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-2">{algo.icon}</div>
              <div className="text-sm font-bold text-white">{algo.name}</div>
              <div className="text-[10px] text-gray-500 mt-1">{algo.category}</div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-7 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold text-cyan-300">
                  {selectedAlgo.icon} {selectedAlgo.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {current.message}
                </p>
              </div>

              {isSearchAlgorithm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Target</span>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>

            <div className="relative h-[320px] md:h-[390px] flex items-end justify-center gap-2 md:gap-3 px-2 pt-10 bg-black/30 rounded-2xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_45%)] pointer-events-none" />

              <AnimatePresence mode="popLayout">
                {array.map((value, index) => (
                  <motion.div
                    key={`${index}-${value}`}
                    layout
                    initial={{ opacity: 0, y: 60, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: current.active?.includes(index) || current.pivot === index ? 1.08 : 1,
                      backgroundColor: getBarColor(index),
                      height: `${Math.max(32, (value / 100) * 270)}px`,
                    }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="relative w-8 md:w-11 rounded-t-xl flex items-end justify-center pb-2 shadow-lg"
                    style={{
                      boxShadow:
                        current.active?.includes(index) || current.pivot === index
                          ? '0 0 28px rgba(250,204,21,0.45)'
                          : '0 0 14px rgba(34,211,238,0.12)',
                    }}
                  >
                    <span className="text-[10px] md:text-xs font-black text-black">
                      {value}
                    </span>

                    <span className="absolute -bottom-6 text-[10px] text-gray-500">
                      {index}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-7 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-600" /> Default
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-400" /> Active / Compare
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-pink-500" /> Pivot
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-cyan-400" /> Search Range
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Done / Found
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <h3 className="font-bold text-purple-300 mb-4">⚙️ Controls</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={runAlgorithm}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl py-3 transition-all"
                >
                  ▶ Run
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!steps.length}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl py-3 transition-all disabled:opacity-40"
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>

                <button
                  onClick={prevStep}
                  disabled={isPlaying || currentStep <= 0}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl py-3 transition-all disabled:opacity-40"
                >
                  ⏮ Prev
                </button>

                <button
                  onClick={nextStep}
                  disabled={isPlaying}
                  className="bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl py-3 transition-all disabled:opacity-40"
                >
                  ⏭ Step
                </button>

                <button
                  onClick={generateArray}
                  className="col-span-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl py-3 transition-all"
                >
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
                    animate={{
                      width: steps.length
                        ? `${((currentStep + 1) / steps.length) * 100}%`
                        : '0%',
                    }}
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

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <h3 className="font-bold text-emerald-300 mb-3">🧠 Step Message</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {current.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
