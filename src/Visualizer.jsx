// src/Visualizer.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALGORITHMS = {
  bubbleSort: {
    name: 'Bubble Sort',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
  },
  mergeSort: {
    name: 'Merge Sort',
    category: 'Sorting',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(n)',
  },
  binarySearch: {
    name: 'Binary Search',
    category: 'Searching',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
  },
};

export default function Visualizer() {
  const [array, setArray] = useState([]);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [algorithm, setAlgorithm] = useState('bubbleSort');
  const [comparing, setComparing] = useState([]);
  const [sorted, setSorted] = useState([]);

  // Generate random array
  const generateArray = () => {
    const arr = Array.from({ length: 12 },
      () => Math.floor(Math.random() * 90) + 10
    );
    setArray(arr);
    setSteps([]);
    setCurrentStep(0);
    setComparing([]);
    setSorted([]);
    setIsPlaying(false);
  };

  useEffect(() => { generateArray(); }, []);

  // Bubble Sort Step Generator
  const getBubbleSortSteps = (arr) => {
    const steps = [];
    const a = [...arr];
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        steps.push({ array: [...a], comparing: [j, j + 1], sorted: [] });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          steps.push({ array: [...a], comparing: [j, j + 1], sorted: [] });
        }
      }
    }
    steps.push({ array: [...a], comparing: [], sorted: [...Array(a.length).keys()] });
    return steps;
  };

  // Binary Search Step Generator
  const getBinarySearchSteps = (arr, target) => {
    const steps = [];
    const a = [...arr].sort((x, y) => x - y);
    let low = 0, high = a.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      steps.push({ array: a, comparing: [mid], low, high, found: false });
      if (a[mid] === target) {
        steps.push({ array: a, comparing: [mid], low, high, found: true });
        break;
      } else if (a[mid] < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return steps;
  };

  // Run selected algorithm
  const runAlgorithm = () => {
    let generatedSteps = [];
    if (algorithm === 'bubbleSort') generatedSteps = getBubbleSortSteps(array);
    if (algorithm === 'binarySearch') {
      const target = array[Math.floor(Math.random() * array.length)];
      generatedSteps = getBinarySearchSteps(array, target);
    }
    setSteps(generatedSteps);
    setCurrentStep(0);
    setIsPlaying(true);
  };

  // Auto-play steps
  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      const step = steps[currentStep];
      setArray(step.array);
      setComparing(step.comparing || []);
      setSorted(step.sorted || []);
      setCurrentStep((prev) => prev + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps, speed]);

  const getBarColor = (index) => {
    if (sorted.includes(index)) return '#10b981'; // green
    if (comparing.includes(index)) return '#f59e0b'; // yellow
    return '#06b6d4'; // cyan
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400">
          🔬 Algorithm Visualizer
        </h1>
        <p className="text-gray-400 mt-1">
          Watch algorithms come to life step by step
        </p>
      </div>

      {/* Algorithm Selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(ALGORITHMS).map(([key, algo]) => (
          <button
            key={key}
            onClick={() => { setAlgorithm(key); generateArray(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              algorithm === key
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {algo.name}
          </button>
        ))}
      </div>

      {/* Complexity Info */}
      <div className="flex gap-4 mb-6">
        <span className="bg-gray-800 px-3 py-1 rounded text-sm">
          ⏱ Time: <span className="text-yellow-400">
            {ALGORITHMS[algorithm].timeComplexity}
          </span>
        </span>
        <span className="bg-gray-800 px-3 py-1 rounded text-sm">
          💾 Space: <span className="text-purple-400">
            {ALGORITHMS[algorithm].spaceComplexity}
          </span>
        </span>
        <span className="bg-gray-800 px-3 py-1 rounded text-sm">
          📁 {ALGORITHMS[algorithm].category}
        </span>
      </div>

      {/* Visualization Area */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <div className="flex items-end justify-center gap-2 h-48">
          <AnimatePresence>
            {array.map((value, index) => (
              <motion.div
                key={index}
                layout
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  backgroundColor: getBarColor(index),
                }}
                transition={{ duration: 0.2 }}
                style={{ height: `${(value / 100) * 100}%` }}
                className="w-10 rounded-t-md flex flex-col justify-end items-center
                           pb-1 origin-bottom"
              >
                <span className="text-xs font-bold text-black">{value}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-center text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-cyan-400 rounded-sm inline-block"/>
            Default
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-400 rounded-sm inline-block"/>
            Comparing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>
            Sorted
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={runAlgorithm}
            disabled={isPlaying}
            className="px-5 py-2 bg-cyan-500 text-black font-bold rounded-lg
                       hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶ Run
          </button>
          <button
            onClick={() => setIsPlaying(false)}
            disabled={!isPlaying}
            className="px-5 py-2 bg-yellow-500 text-black font-bold rounded-lg
                       hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏸ Pause
          </button>
          <button
            onClick={() => {
              if (currentStep < steps.length - 1) {
                const step = steps[currentStep];
                setArray(step.array);
                setComparing(step.comparing || []);
                setSorted(step.sorted || []);
                setCurrentStep((prev) => prev + 1);
              }
            }}
            disabled={isPlaying || currentStep >= steps.length - 1}
            className="px-5 py-2 bg-purple-500 text-white font-bold rounded-lg
                       hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏭ Step
          </button>
          <button
            onClick={generateArray}
            className="px-5 py-2 bg-gray-700 text-white font-bold rounded-lg
                       hover:bg-gray-600"
          >
            🔄 Reset
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">🐢 Slow</span>
          <input
            type="range"
            min="100"
            max="1000"
            step="100"
            value={1100 - speed}
            onChange={(e) => setSpeed(1100 - Number(e.target.value))}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-gray-400 text-sm">⚡ Fast</span>
        </div>

        {/* Step Counter */}
        <div className="mt-3 text-center text-gray-400 text-sm">
          Step {currentStep} / {steps.length}
        </div>
      </div>
    </div>
  );
}
