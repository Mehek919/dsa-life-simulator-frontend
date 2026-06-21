import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ── Judge0 config ──────────────────────────────────────────────────────────────
const JUDGE0_URL  = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY  = process.env.REACT_APP_JUDGE0_KEY || '';
const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';
// Judge0 language IDs — https://ce.judge0.com/languages/
// ── Language configs ───────────────────────────────────────────────────────────
const LANGUAGES = [
  // ── Most popular ──
  { id: 'python3',    label: 'Python 3',       judge0Id: 71,  ext: 'py'    },
  { id: 'python2',    label: 'Python 2',       judge0Id: 70,  ext: 'py'    },
  { id: 'javascript', label: 'JavaScript',     judge0Id: 63,  ext: 'js'    },
  { id: 'typescript', label: 'TypeScript',     judge0Id: 74,  ext: 'ts'    },
  { id: 'java',       label: 'Java',           judge0Id: 62,  ext: 'java'  },
  { id: 'cpp17',      label: 'C++ 17',         judge0Id: 54,  ext: 'cpp'   },
  { id: 'cpp14',      label: 'C++ 14',         judge0Id: 52,  ext: 'cpp'   },
  { id: 'c',          label: 'C',              judge0Id: 50,  ext: 'c'     },
  { id: 'csharp',     label: 'C#',             judge0Id: 51,  ext: 'cs'    },
  { id: 'go',         label: 'Go',             judge0Id: 60,  ext: 'go'    },
  { id: 'rust',       label: 'Rust',           judge0Id: 73,  ext: 'rs'    },
  { id: 'kotlin',     label: 'Kotlin',         judge0Id: 78,  ext: 'kt'    },
  { id: 'swift',      label: 'Swift',          judge0Id: 83,  ext: 'swift' },
  { id: 'ruby',       label: 'Ruby',           judge0Id: 72,  ext: 'rb'    },
  { id: 'php',        label: 'PHP',            judge0Id: 68,  ext: 'php'   },
  { id: 'scala',      label: 'Scala',          judge0Id: 81,  ext: 'scala' },
  { id: 'r',          label: 'R',              judge0Id: 80,  ext: 'r'     },
  { id: 'perl',       label: 'Perl',           judge0Id: 85,  ext: 'pl'    },
  { id: 'haskell',    label: 'Haskell',        judge0Id: 61,  ext: 'hs'    },
  { id: 'lua',        label: 'Lua',            judge0Id: 64,  ext: 'lua'   },
  { id: 'bash',       label: 'Bash',           judge0Id: 46,  ext: 'sh'    },
  { id: 'sql',        label: 'SQL',            judge0Id: 82,  ext: 'sql'   },
  { id: 'dart',       label: 'Dart',           judge0Id: 90,  ext: 'dart'  },
  { id: 'elixir',     label: 'Elixir',         judge0Id: 57,  ext: 'ex'    },
  { id: 'clojure',    label: 'Clojure',        judge0Id: 86,  ext: 'clj'   },
  { id: 'fsharp',     label: 'F#',             judge0Id: 87,  ext: 'fs'    },
  { id: 'erlang',     label: 'Erlang',         judge0Id: 58,  ext: 'erl'   },
  { id: 'ocaml',      label: 'OCaml',          judge0Id: 65,  ext: 'ml'    },
  { id: 'pascal',     label: 'Pascal',         judge0Id: 67,  ext: 'pas'   },
  { id: 'fortran',    label: 'Fortran',        judge0Id: 59,  ext: 'f90'   },
  { id: 'cobol',      label: 'COBOL',          judge0Id: 77,  ext: 'cob'   },
];
// ── Starter templates ─────────────────────────────────────────────────────────
const STARTER = {
  python3: `def solution(nums):
    # Write your solution here
    pass

print(solution([1, 2, 3]))
`,
  python2: `def solution(nums):
    # Write your solution here
    pass

print solution([1, 2, 3])
`,
  javascript: `function solution(nums) {
  // Write your solution here
}

console.log(solution([1, 2, 3]));
`,
  typescript: `function solution(nums: number[]): number {
  // Write your solution here
  return 0;
}

console.log(solution([1, 2, 3]));
`,
  java: `public class Main {
  public static void main(String[] args) {
    int[] nums = {1, 2, 3};
    System.out.println(solution(nums));
  }

  static int solution(int[] nums) {
    // Write your solution here
    return 0;
  }
}
`,
  cpp17: `#include <bits/stdc++.h>
using namespace std;

int solution(vector<int>& nums) {
  // Write your solution here
  return 0;
}

int main() {
  vector<int> nums = {1, 2, 3};
  cout << solution(nums) << endl;
  return 0;
}
`,
  cpp14: `#include <bits/stdc++.h>
using namespace std;

int solution(vector<int>& nums) {
  return 0;
}

int main() {
  vector<int> nums = {1, 2, 3};
  cout << solution(nums) << endl;
  return 0;
}
`,
  c: `#include <stdio.h>

int solution(int* nums, int n) {
  // Write your solution here
  return 0;
}

int main() {
  int nums[] = {1, 2, 3};
  printf("%d\\n", solution(nums, 3));
  return 0;
}
`,
  csharp: `using System;

class Solution {
  static void Main() {
    Console.WriteLine(Solve(new int[]{1, 2, 3}));
  }

  static int Solve(int[] nums) {
    // Write your solution here
    return 0;
  }
}
`,
  go: `package main

import "fmt"

func solution(nums []int) int {
  // Write your solution here
  return 0
}

func main() {
  fmt.Println(solution([]int{1, 2, 3}))
}
`,
  rust: `fn solution(nums: Vec<i32>) -> i32 {
  // Write your solution here
  0
}

fn main() {
  println!("{}", solution(vec![1, 2, 3]));
}
`,
  kotlin: `fun solution(nums: IntArray): Int {
  // Write your solution here
  return 0
}

fun main() {
  println(solution(intArrayOf(1, 2, 3)))
}
`,
  swift: `func solution(_ nums: [Int]) -> Int {
  // Write your solution here
  return 0
}

print(solution([1, 2, 3]))
`,
  ruby: `def solution(nums)
  # Write your solution here
end

puts solution([1, 2, 3])
`,
  php: `<?php
function solution($nums) {
  // Write your solution here
  return 0;
}

echo solution([1, 2, 3]);
?>
`,
  scala: `object Main extends App {
  def solution(nums: Array[Int]): Int = {
    // Write your solution here
    0
  }
  println(solution(Array(1, 2, 3)))
}
`,
  r: `solution <- function(nums) {
  # Write your solution here
  0
}

print(solution(c(1, 2, 3)))
`,
  perl: `sub solution {
  my @nums = @_;
  # Write your solution here
  return 0;
}

print solution(1, 2, 3);
`,
  haskell: `solution :: [Int] -> Int
solution nums = 0 -- Write your solution here

main :: IO ()
main = print (solution [1, 2, 3])
`,
  lua: `function solution(nums)
  -- Write your solution here
  return 0
end

print(solution({1, 2, 3}))
`,
  bash: `#!/bin/bash
# Write your solution here
echo "Hello World"
`,
  sql: `-- Write your SQL query here
SELECT 1 AS result;
`,
  dart: `int solution(List<int> nums) {
  // Write your solution here
  return 0;
}

void main() {
  print(solution([1, 2, 3]));
}
`,
  elixir: `defmodule Solution do
  def solve(nums) do
    # Write your solution here
    0
  end
end

IO.puts Solution.solve([1, 2, 3])
`,
  clojure: `(defn solution [nums]
  ;; Write your solution here
  0)

(println (solution [1 2 3]))
`,
  fsharp: `let solution (nums: int list) =
  // Write your solution here
  0

printfn "%d" (solution [1; 2; 3])
`,
  erlang: `-module(solution).
-export([main/0]).

solution(Nums) ->
  0. %% Write your solution here

main() ->
  io:format("~w~n", [solution([1,2,3])]).
`,
  ocaml: `let solution nums =
  (* Write your solution here *)
  0

let () = Printf.printf "%d\\n" (solution [1; 2; 3])
`,
  pascal: `program Solution;
begin
  { Write your solution here }
  writeln(0);
end.
`,
  fortran: `program solution
  implicit none
  ! Write your solution here
  print *, 0
end program solution
`,
  cobol: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. SOLUTION.
       PROCEDURE DIVISION.
           DISPLAY "Hello World"
           STOP RUN.
`,
};

// ── Syntax highlighting (simple token-based) ──────────────────────────────────
// ── Syntax highlighting removed — using plain textarea editor ─────────────────

// ── Judge0 execution ──────────────────────────────────────────────────────────
const JUDGE0_STATUS = {
  1:  'In Queue',
  2:  'Processing',
  3:  'Accepted',
  4:  'Wrong Answer',
  5:  'Time Limit Exceeded',
  6:  'Compilation Error',
  7:  'Runtime Error (SIGSEGV)',
  8:  'Runtime Error (SIGXFSZ)',
  9:  'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

function b64encode(str) {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}
function b64decode(str) {
  if (!str) return '';
  try { return decodeURIComponent(escape(atob(str))); } catch { return atob(str); }
}

async function submitToJudge0(code, langConfig, stdin = '') {
  if (!JUDGE0_KEY) throw new Error('REACT_APP_JUDGE0_KEY not set in .env');

  // Submit
  const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-RapidAPI-Key':  JUDGE0_KEY,
      'X-RapidAPI-Host': JUDGE0_HOST,
    },
    body: JSON.stringify({
      language_id:       langConfig.judge0Id,
      source_code:       b64encode(code),
      stdin:             b64encode(stdin),
      cpu_time_limit:    10,
      memory_limit:      256000,
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Judge0 submit error ${submitRes.status}: ${err}`);
  }

  const { token } = await submitRes.json();
  if (!token) throw new Error('No token returned from Judge0');

  // Poll for result (max 15s)
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const pollRes = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
      {
        headers: {
          'X-RapidAPI-Key':  JUDGE0_KEY,
          'X-RapidAPI-Host': JUDGE0_HOST,
        },
      }
    );

    if (!pollRes.ok) continue;
    const data = await pollRes.json();

    // Still processing
    if (data.status?.id <= 2) continue;

    return {
      statusId:      data.status?.id,
      statusDesc:    JUDGE0_STATUS[data.status?.id] || data.status?.description,
      stdout:        b64decode(data.stdout),
      stderr:        b64decode(data.stderr) || b64decode(data.compile_output),
      time:          data.time,
      memory:        data.memory,
      success:       data.status?.id === 3, // 3 = Accepted
    };
  }

  throw new Error('Execution timed out after 15s');
}

async function runTestCases(code, langConfig, testCases) {
  const results = [];
  for (const tc of testCases) {
    const start = Date.now();
    try {
      const data    = await submitToJudge0(code, langConfig, tc.input);
      const output  = (data.stdout || '').trim();
      const elapsed = Date.now() - start;
      const passed  = output === tc.expected.trim();
      results.push({
        ...tc, output,
        stderr:    data.stderr,
        elapsed,
        passed,
        statusDesc: data.statusDesc,
        time:       data.time,
        memory:     data.memory,
        error:      null,
      });
    } catch (err) {
      results.push({ ...tc, output: '', stderr: '', elapsed: Date.now() - start,
        passed: false, error: err.message });
    }
  }
  return results;
}

// ── Simple textarea-based editor with line numbers ────────────────────────────
function CodeEditorPane({ code, onChange, language }) {
  const textareaRef = useRef(null);
  const lineNumRef  = useRef(null);
  const lines = code.split('\n');

  const handleKeyDown = (e) => {
    const ta  = e.target;
    const val = ta.value;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;

    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const newVal = val.slice(0, start) + '  ' + val.slice(end);
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }

    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const newVal = val.slice(0, start) + e.key + pairs[e.key] + val.slice(end);
      onChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1; }, 0);
    }

    // Enter → auto-indent
    if (e.key === 'Enter') {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.slice(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)[1];
      const extraIndent = /[{([:]$/.test(currentLine.trim()) ? '  ' : '';
      e.preventDefault();
      const newVal = val.slice(0, start) + '\n' + indent + extraIndent + val.slice(end);
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extraIndent.length;
      }, 0);
    }
  };

  const syncScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div style={{
      display:    'flex',
      flex:       1,
      overflow:   'hidden',
      fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
      fontSize:   14,
      lineHeight: '1.6',
      background: '#0d1117',
    }}>
      {/* Line numbers */}
      <div
        ref={lineNumRef}
        style={{
          padding:      '16px 12px',
          background:   '#060910',
          borderRight:  '1px solid #1e2a3a',
          color:        '#3a4a5a',
          textAlign:    'right',
          userSelect:   'none',
          overflowY:    'hidden',
          minWidth:     '48px',
          flexShrink:   0,
        }}
      >
        {lines.map((_, i) => (
          <div key={i} style={{ lineHeight: '1.6' }}>{i + 1}</div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          flex:       1,
          padding:    '16px',
          background: 'transparent',
          color:      '#e8e8e8',
          border:     'none',
          outline:    'none',
          resize:     'none',
          fontFamily: 'inherit',
          fontSize:   'inherit',
          lineHeight: 'inherit',
          caretColor: '#22d3ee',
          overflowY:  'auto',
          whiteSpace: 'pre',
          overflowX:  'auto',
        }}
      />
    </div>
  );
}

// ── Output panel ──────────────────────────────────────────────────────────────
function OutputPanel({ result, testResults, activeTab, onTabChange }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      background:    '#060910',
    }}>
      {/* Tabs */}
      <div style={{
        display:    'flex',
        borderBottom: '1px solid #1e2a3a',
        flexShrink: 0,
      }}>
        {['output', 'tests'].map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding:     '10px 20px',
              background:  'transparent',
              border:      'none',
              borderBottom: activeTab === tab ? '2px solid #22d3ee' : '2px solid transparent',
              color:       activeTab === tab ? '#22d3ee' : '#555',
              cursor:      'pointer',
              fontSize:    13,
              fontWeight:  600,
              textTransform: 'capitalize',
              transition:  'all 0.2s',
            }}
          >
            {tab === 'tests' && testResults
              ? `Tests (${testResults.filter(t => t.passed).length}/${testResults.length})`
              : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'output' && (
          <div>
            {!result ? (
              <div style={{ color: '#3a4a5a', fontSize: 13 }}>
                Run your code to see output here.
              </div>
            ) : (
              <>
                {/* Status */}
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          8,
                  marginBottom: 12,
                  flexWrap:     'wrap',
                }}>
                  <span style={{
                    background:   result.success ? '#00c89622' : '#ff4d4d22',
                    border:       `1px solid ${result.success ? '#00c89644' : '#ff4d4d44'}`,
                    color:        result.success ? '#00c896' : '#ff4d4d',
                    borderRadius: 20,
                    padding:      '2px 12px',
                    fontSize:     12,
                    fontWeight:   700,
                  }}>
                    {result.success ? '✓ Accepted' : `✗ ${result.statusDesc || 'Error'}`}
                  </span>
                  {result.time && (
                    <span style={{ color: '#555', fontSize: 11 }}>
                      ⏱ {result.time}s
                    </span>
                  )}
                  {result.memory && (
                    <span style={{ color: '#555', fontSize: 11 }}>
                      💾 {(result.memory / 1024).toFixed(1)} MB
                    </span>
                  )}
                  <span style={{ color: '#333', fontSize: 11 }}>
                    {result.elapsed}ms round-trip
                  </span>
                </div>

                {/* stdout */}
                {result.stdout && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Output
                    </div>
                    <pre style={{
                      background:   '#0d1117',
                      border:       '1px solid #1e2a3a',
                      borderRadius: 8,
                      padding:      '12px',
                      color:        '#e8e8e8',
                      fontSize:     13,
                      fontFamily:   'monospace',
                      margin:       0,
                      whiteSpace:   'pre-wrap',
                      wordBreak:    'break-word',
                    }}>
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {/* stderr */}
                {result.stderr && (
                  <div>
                    <div style={{ color: '#ff4d4d', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Error
                    </div>
                    <pre style={{
                      background:   '#ff4d4d11',
                      border:       '1px solid #ff4d4d33',
                      borderRadius: 8,
                      padding:      '12px',
                      color:        '#ff6b6b',
                      fontSize:     13,
                      fontFamily:   'monospace',
                      margin:       0,
                      whiteSpace:   'pre-wrap',
                      wordBreak:    'break-word',
                    }}>
                      {result.stderr}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!testResults || testResults.length === 0 ? (
              <div style={{ color: '#3a4a5a', fontSize: 13 }}>
                Run tests to see results here.
              </div>
            ) : (
              testResults.map((tc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background:   tc.passed ? '#00c89608' : '#ff4d4d08',
                    border:       `1px solid ${tc.passed ? '#00c89633' : '#ff4d4d33'}`,
                    borderRadius: 10,
                    padding:      '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      color:      tc.passed ? '#00c896' : '#ff4d4d',
                      fontSize:   13, fontWeight: 700,
                    }}>
                      {tc.passed ? '✓' : '✗'} Test {i + 1}
                      {tc.label ? ` — ${tc.label}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {tc.time   && <span style={{ color: '#555', fontSize: 11 }}>⏱ {tc.time}s</span>}
                      {tc.memory && <span style={{ color: '#555', fontSize: 11 }}>💾 {(tc.memory/1024).toFixed(1)}MB</span>}
                      {!tc.passed && tc.statusDesc && (
                        <span style={{ color: '#ff6b6b', fontSize: 11 }}>{tc.statusDesc}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Input',    value: tc.input    },
                      { label: 'Expected', value: tc.expected },
                      { label: 'Output',   value: tc.output || tc.stderr || '(no output)' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                          {label}
                        </div>
                        <pre style={{
                          background:   '#0d1117',
                          border:       '1px solid #1e2a3a',
                          borderRadius: 6,
                          padding:      '6px 10px',
                          color:        '#c8c8c8',
                          fontSize:     12,
                          fontFamily:   'monospace',
                          margin:       0,
                          whiteSpace:   'pre-wrap',
                          wordBreak:    'break-word',
                        }}>
                          {value}
                        </pre>
                      </div>
                    ))}
                  </div>

                  {tc.error && (
                    <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>
                      ⚠ {tc.error}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CodeEditor component ─────────────────────────────────────────────────
export default function CodeEditor({
  problem,          // { title, difficulty, description, examples, constraints, testCases, hints }
  onSubmit,         // async (code, langId, results) => { passed, total, xp, credits }
  user,
  defaultLanguage = 'python3',
}) {
  const [langId,      setLangId]      = useState(defaultLanguage);
  const [code,        setCode]        = useState(STARTER[defaultLanguage]);
  const [stdin,       setStdin]       = useState('');
  const [running,     setRunning]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [activeOut,   setActiveOut]   = useState('output');
  const [toast,       setToast]       = useState(null);
  const MAX_ATTEMPTS = 3;
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [leftW,       setLeftW]       = useState(40); // % width of problem panel
  const [splitV,      setSplitV]      = useState(60); // % height of editor
  const draggingH = useRef(false);
  const draggingV = useRef(false);

  const langConfig = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];
  const testCases  = problem?.testCases || [];
  const hints      = problem?.hints     || [];
  const currentAttempt = Math.min(attemptsUsed + 1, MAX_ATTEMPTS);
  const visibleHints =
  currentAttempt === 1
    ? hints.slice(0, 1)
    : hints.slice(0, 2);
  const solutionUnlocked =
  currentAttempt >= 3 || attemptsUsed >= 3 || isSolved;
  const canSubmit =
  attemptsUsed < MAX_ATTEMPTS && !isSolved;
// ── Reset submit-gated state when switching problems ────────────────────────
  useEffect(() => {
    setAttemptsUsed(0);
    setIsSolved(false);
    setShowSolution(false);
    setShowHint(false);
    setResult(null);
    setTestResults(null);
  }, [problem?.id]);

  // ── Language change ──────────────────────────────────────────────────────
  const handleLangChange = (id) => {
    setLangId(id);
    setCode(STARTER[id] || '');
    setResult(null);
    setTestResults(null);
  };

  // ── Run code ─────────────────────────────────────────────────────────────
  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const start = Date.now();
    try {
      const data    = await submitToJudge0(code, langConfig, stdin);
      const elapsed = Date.now() - start;
      setResult({
        success:    data.success,
        stdout:     data.stdout,
        stderr:     data.stderr,
        elapsed,
        statusDesc: data.statusDesc,
        time:       data.time,
        memory:     data.memory,
      });
      setActiveOut('output');
    } catch (err) {
      setResult({ success: false, stdout: '', stderr: err.message, elapsed: Date.now() - start });
      setActiveOut('output');
    } finally {
      setRunning(false);
    }
  };

  // ── Run tests ─────────────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!testCases.length) {
      showToast('No test cases defined for this problem.', 'warn');
      return;
    }
    setRunning(true);
    setTestResults(null);
    setActiveOut('tests');
    try {
      const results = await runTestCases(code, langConfig, testCases);
      setTestResults(results);
      const passed = results.filter(r => r.passed).length;
      showToast(
        passed === results.length
          ? `✓ All ${results.length} tests passed!`
          : `${passed}/${results.length} tests passed`,
        passed === results.length ? 'success' : 'error'
      );
    } catch (err) {
      showToast('Test runner failed: ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
  if (!onSubmit) return;
  if (!canSubmit) {
    setShowSolution(true);
    showToast("Maximum 3 attempts used. Solution is unlocked.", "warn");
    return;
  }

  setSubmitting(true);
  try {
     const results = testCases.length
      ? await runTestCases(code, langConfig, testCases)
      : [];

     setTestResults(results);
     setActiveOut("tests");

     const res = await onSubmit(code, langId, results);
     const passed = !!res?.passed;
     const nextAttemptsUsed = attemptsUsed + 1;

     setAttemptsUsed(nextAttemptsUsed);

     if (passed) {
      setIsSolved(true);
      showToast(
        `🎉 Accepted! +${res.xp || 0} XP +${res.credits || 0} Credits`,
        "success"
      );
      return;
     }

     if (nextAttemptsUsed >= MAX_ATTEMPTS) {
      setShowSolution(true);
      showToast("❌ 3 attempts used. Solution unlocked.", "warn");
      return;
     }

     showToast(
      `✗ Wrong Answer — Attempt ${nextAttemptsUsed}/${MAX_ATTEMPTS}. ${
        nextAttemptsUsed === 1
        ? "Hint 1 unlocked."
        : "Hint 2 unlocked."
       }`,
      "error"
     );
    } catch (err) {
    showToast("Submission failed: " + err.message, "error");
     } finally {
    setSubmitting(false);
     }
    };

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Drag to resize panels ─────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (draggingH.current) {
        const pct = (clientX / window.innerWidth) * 100;
        setLeftW(Math.min(65, Math.max(25, pct)));
      }
      if (draggingV.current) {
        const container = document.getElementById('right-panel');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pct  = ((clientY - rect.top) / rect.height) * 100;
        setSplitV(Math.min(80, Math.max(20, pct)));
      }
    };
    const onUp = () => { draggingH.current = false; draggingV.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);

  const diffColor = {
    Easy:   '#00c896', Medium: '#f5c542', Hard: '#ff4d4d',
    easy:   '#00c896', medium: '#f5c542', hard: '#ff4d4d',
  }[problem?.difficulty] || '#888';

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      background: '#0a0a14',
      fontFamily: 'Arial, sans-serif',
      overflow:   'hidden',
      color:      '#e8e8e8',
      position:   'relative',
    }}>

      {/* ── Left panel: Problem ── */}
      <div style={{
        width:         `${leftW}%`,
        flexShrink:    0,
        display:       'flex',
        flexDirection: 'column',
        borderRight:   '1px solid #1e2a3a',
        overflow:      'hidden',
      }}>
        {/* Problem header */}
        <div style={{
          padding:      '16px 20px',
          borderBottom: '1px solid #1e2a3a',
          background:   '#0d1117',
          flexShrink:   0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#e8e8e8' }}>
              {problem?.title || 'Untitled Problem'}
            </h2>
            <span style={{
              background:   diffColor + '22',
              border:       `1px solid ${diffColor}44`,
              color:        diffColor,
              borderRadius: 20,
              padding:      '2px 10px',
              fontSize:     11,
              fontWeight:   700,
            }}>
              {problem?.difficulty || 'Medium'}
            </span>
          </div>

          {/* Tags */}
          {problem?.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {problem.tags.map(tag => (
                <span key={tag} style={{
                  background:   '#1e2a3a',
                  borderRadius: 20,
                  padding:      '2px 8px',
                  fontSize:     10,
                  color:        '#666',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Problem body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Description */}
          <p style={{ color: '#c8c8c8', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
            {problem?.description || 'No description provided.'}
          </p>

          {/* Examples */}
          {problem?.examples?.map((ex, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Example {i + 1}
              </div>
              <div style={{
                background:   '#0d1117',
                border:       '1px solid #1e2a3a',
                borderRadius: 10,
                padding:      '12px 14px',
                fontSize:     13,
                fontFamily:   'monospace',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#555' }}>Input: </span>
                  <span style={{ color: '#c3e88d' }}>{ex.input}</span>
                </div>
                <div style={{ marginBottom: ex.explanation ? 4 : 0 }}>
                  <span style={{ color: '#555' }}>Output: </span>
                  <span style={{ color: '#89ddff' }}>{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div style={{ color: '#666', marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
                    {ex.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Constraints */}
          {problem?.constraints?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Constraints
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#777', fontSize: 13, lineHeight: 1.8 }}>
                {problem.constraints.map((c, i) => (
                  <li key={i} style={{ fontFamily: 'monospace' }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
            </div>
        </div>

      {/* ── Horizontal drag handle ── */}
      <div
        onMouseDown={() => { draggingH.current = true; }}
        style={{
          width:      '5px',
          flexShrink: 0,
          cursor:     'col-resize',
          background: '#1e2a3a',
          transition: 'background 0.2s',
          zIndex:     10,
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#22d3ee44'}
        onMouseLeave={e => e.currentTarget.style.background = '#1e2a3a'}
      />

      {/* ── Right panel: Editor + Output ── */}
      <div
        id="right-panel"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Toolbar */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 16px',
          borderBottom:   '1px solid #1e2a3a',
          background:     '#0d1117',
          flexShrink:     0,
          gap:            10,
          flexWrap:       'wrap',
        }}>
          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={langId}
              onChange={e => handleLangChange(e.target.value)}
              style={{
                background:   '#060910',
                border:       '1px solid #1e2a3a',
                borderRadius: 8,
                color:        '#e8e8e8',
                fontSize:     13,
                padding:      '6px 10px',
                cursor:       'pointer',
                outline:      'none',
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>

            <span style={{ color: '#333', fontSize: 11 }}>
              v{langConfig.version}
            </span>
          </div>
          <div
            style={{
              color: "#22d3ee",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Attempt {currentAttempt}/3
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRun}
              disabled={running || submitting}
              style={{
                background:   '#1e2a3a',
                border:       '1px solid #22d3ee33',
                borderRadius: 8,
                color:        '#22d3ee',
                cursor:       running ? 'not-allowed' : 'pointer',
                fontSize:     13,
                fontWeight:   600,
                padding:      '7px 16px',
                opacity:      running || submitting ? 0.6 : 1,
                transition:   'all 0.2s',
              }}
            >
              {running ? '⏳ Running...' : '▶ Run'}
            </button>

            <button
              onClick={handleTest}
              disabled={running || submitting}
              style={{
                background:   '#1e2a3a',
                border:       '1px solid #a855f733',
                borderRadius: 8,
                color:        '#a855f7',
                cursor:       running ? 'not-allowed' : 'pointer',
                fontSize:     13,
                fontWeight:   600,
                padding:      '7px 16px',
                opacity:      running || submitting ? 0.6 : 1,
                transition:   'all 0.2s',
              }}
            >
              🧪 Test
            </button>
            {hints.length > 0 && (
              <button
                onClick={() => setShowHint(true)}
                style={{
                  background: "#f59e0b22",
                  border: "1px solid #f59e0b66",
                  borderRadius: 8,
                  color: "#fbbf24",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "7px 16px",
                }}
              >
                💡 Hints ({visibleHints.length}/2)
              </button>
            )}
            <button
           onClick={() => {
            if (solutionUnlocked) setShowSolution(true);
            else showToast("Solution unlocks on Attempt #3.", "warn");
             }}
            disabled={!solutionUnlocked}
            style={{
              background: solutionUnlocked ? "#a855f722" : "#1e2a3a",
              border: solutionUnlocked ? "1px solid #a855f766" : "1px solid #2a3645",
              borderRadius: 8,
              color: solutionUnlocked ? "#c084fc" : "#555",
              cursor: solutionUnlocked ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 700,
              padding: "7px 16px",
           }}
           >
           {solutionUnlocked ? "📖 Solution" : "🔒 Solution"}
          </button>

          {onSubmit && (
           <button
            onClick={handleSubmit}
            disabled={running || submitting || !canSubmit}
            style={{
              background:
                submitting || !canSubmit
                ? "#1e2a3a"
                : "linear-gradient(135deg,#00c896,#1a73e8)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: running || submitting || !canSubmit ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              padding: "7px 20px",
              opacity: running || submitting || !canSubmit ? 0.7 : 1,
              transition: "all 0.2s",
              boxShadow: submitting || !canSubmit ? "none" : "0 0 16px #00c89633",
            }}
            >
            {submitting ? "⏳ Submitting..." : `🚀 Submit A${currentAttempt}`}
          </button>
          )}
          </div>
        </div>
        {/* Editor */}
        <div style={{ height: `${splitV}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CodeEditorPane
            code={code}
            onChange={setCode}
            language={langId}
          />

          {/* stdin */}
          <div style={{
            borderTop:  '1px solid #1e2a3a',
            padding:    '8px 16px',
            flexShrink: 0,
            background: '#060910',
          }}>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              stdin (custom input)
            </div>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              rows={2}
              placeholder="Optional custom input..."
              style={{
                width:        '100%',
                boxSizing:    'border-box',
                background:   '#0d1117',
                border:       '1px solid #1e2a3a',
                borderRadius: 6,
                color:        '#888',
                fontSize:     12,
                fontFamily:   'monospace',
                padding:      '6px 10px',
                outline:      'none',
                resize:       'none',
              }}
            />
          </div>
        </div>

        {/* Vertical drag handle */}
        <div
          onMouseDown={() => { draggingV.current = true; }}
          style={{
            height:     '5px',
            flexShrink: 0,
            cursor:     'row-resize',
            background: '#1e2a3a',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#22d3ee44'}
          onMouseLeave={e => e.currentTarget.style.background = '#1e2a3a'}
        />

        {/* Output */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <OutputPanel
            result={result}
            testResults={testResults}
            activeTab={activeOut}
            onTabChange={setActiveOut}
          />
        </div>
        </div>
       {showSolution && (
        <div style={{
         position: 'fixed',
         inset: 0,
         background: 'rgba(0,0,0,0.78)',
         zIndex: 9999,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         padding: 24,
        }}>
          <div style={{
                background: '#0d1117',
                border: '1px solid #a855f766',
                borderRadius: 18,
                padding: 24,
                maxWidth: 760,
                width: '100%',
                maxHeight: '85vh',
                overflow: 'auto',
                color: '#e8e8e8',
                boxShadow: '0 0 40px #a855f733',
                }}>
                  <button onClick={() => setShowSolution(false)}
                   style={{
                    float: 'right',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                   fontSize: 24,
                   cursor: 'pointer',
                  }}
                >
                 ✕
                </button>

                <h2 style={{ color: '#c084fc', marginTop: 0 }}>
                 📖 {problem?.solution?.title || 'Solution Explanation'}
                </h2>

                <p style={{ color: '#ccc', lineHeight: 1.8 }}>
                 {problem?.solution?.explanation ||
                 problem?.solution?.idea ||
                 'This problem tried to look scary, but relax. It is just a normal DSA pattern wearing a dramatic hoodie.'}
                </p>

                <h3 style={{ color: '#22d3ee' }}>Approach</h3>
                 <ul style={{ lineHeight: 1.8 }}>
                 {(problem?.solution?.approach || [
                  'Understand the input and output.',
                  'Identify the correct DSA pattern.',
                  'Apply the logic step by step.',
                  'Return the answer like a calm engineer, not like production is burning.',
                  ]).map((step, i) => (
                   <li key={i}>{step}</li>
                   ))}
                 </ul>

                <h3 style={{ color: '#00c896' }}>Code</h3>
                  <pre style={{
                   background: '#05070c',
                   border: '1px solid #1e2a3a',
                   borderRadius: 12,
                   padding: 16,
                   color: '#f8f8f2',
                   overflow: 'auto',
                   fontSize: 13,
                   lineHeight: 1.6,
                  }}>
                 {problem?.solution?.code?.python3 ||
                 problem?.solution?.code?.javascript ||
                 problem?.solutionCode ||
                 `def solution(nums):
                  # The problem is pretending to be hard.
                  # Apply the pattern and move on with confidence.
                  return nums`}
                 </pre>

                <h3 style={{ color: '#f59e0b' }}>Complexity</h3>
                <p style={{ lineHeight: 1.7 }}>
                 Time: {problem?.solution?.complexity?.time || problem?.timeComplexity || 'O(n)'}<br />
                 Space: {problem?.solution?.complexity?.space || problem?.spaceComplexity || 'O(n)'}
                </p>
                </div>
              </div>
            )}
            {showHint && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid #f59e0b55",
                  borderRadius: 18,
                  padding: 24,
                  maxWidth: 700,
                  width: "100%",
                  color: "#fff",
                }}
              >
                <button
                  onClick={() => setShowHint(false)}
                  style={{
                    float: "right",
                    background: "transparent",
                    border: "none",
                    color: "#888",
                    fontSize: 24,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>

                <h2 style={{ color: "#fbbf24" }}>
                  💡 Hints
                </h2>

                {visibleHints.map((hint, index) => (
                  <div
                    key={index}
                    style={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <strong>Hint {index + 1}</strong>
                    <p>{hint}</p>
                  </div>
                ))}
                </div>
                </div>
                )}
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: 30 }}
            style={{
              position:     'fixed',
              bottom:       24,
              left:         '50%',
              transform:    'translateX(-50%)',
              zIndex:       999,
              background:   toast.type === 'success' ? '#00c89622'
                          : toast.type === 'error'   ? '#ff4d4d22'
                          :                            '#1e2a3a',
              border:       `1px solid ${
                            toast.type === 'success' ? '#00c89644'
                          : toast.type === 'error'   ? '#ff4d4d44'
                          :                            '#ffffff22'}`,
              borderRadius: 30,
              padding:      '10px 24px',
              color:        toast.type === 'success' ? '#00c896'
                          : toast.type === 'error'   ? '#ff6b6b'
                          :                            '#e8e8e8',
              fontSize:     13,
              fontWeight:   600,
              boxShadow:    '0 4px 20px #00000066',
              whiteSpace:   'nowrap',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
