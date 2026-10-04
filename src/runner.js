export const RESULT_MARKER = '@@EVO_RESULT@@';
export const DRIVER_LANGS = new Set(['python3', 'javascript', 'java', 'cpp17', 'cpp14']);
const SUPPORTED_TYPES = new Set([
  'int', 'long', 'double', 'boolean', 'string',
  'int[]', 'long[]', 'double[]', 'boolean[]', 'string[]',
  'int[][]', 'double[][]', 'string[][]',
]);
// ── Parsing helpers ───────────────────────────────────────────────────────────
function splitTopLevel(str, sep = ',') {
  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') { i++; cur += str[i] ?? ''; }
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    if (ch === ']' || ch === '}' || ch === ')') depth--;
    if (ch === sep && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Returns a valid JSON string for the value, or null if it cannot be read as JSON.
function toJson(v) {
  const s = String(v).trim();
  if (!s) return null;
  try { JSON.parse(s); return s; } catch (e) { /* try fixing python style literals */ }
  const fixed = s
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/'([^'\\]*)'/g, (_, x) => JSON.stringify(x));
  try { JSON.parse(fixed); return fixed; } catch (e) { return null; }
}

const NAMED = /^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/;

// Accepts "nums = [1,2], target = 9", one value per line, or "[1,2], 9".
function parseInputValues(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const pieces = lines.flatMap((l) => splitTopLevel(l));
  const named = pieces.map((p) => p.match(NAMED));
  if (pieces.length > 0 && named.every(Boolean)) {
    const values = named.map((m) => toJson(m[2]));
    if (values.some((v) => v === null)) return null;
    return { names: named.map((m) => m[1]), values };
  }
  const raw = lines.length > 1 ? lines : splitTopLevel(t);
  const values = raw.map(toJson);
  if (values.some((v) => v === null)) return null;
  return { names: null, values };
}

// ── Type inference ────────────────────────────────────────────────────────────
function inferType(parsed, raw) {
  const kinds = new Set();
  let depth = 0;
  const walk = (v, d) => {
    if (Array.isArray(v)) { depth = Math.max(depth, d + 1); v.forEach((x) => walk(x, d + 1)); return; }
    if (v === null) kinds.add('int');
    else if (typeof v === 'string') kinds.add('string');
    else if (typeof v === 'boolean') kinds.add('boolean');
    else if (typeof v === 'number') {
      kinds.add(Number.isInteger(v) ? (Math.abs(v) > 2147483647 ? 'long' : 'int') : 'double');
    } else kinds.add('object');
  };
  walk(parsed, 0);
  if (kinds.has('object')) return { type: null, weak: false };
  const weak = Array.isArray(parsed) && kinds.size === 0; // empty array: element type is a guess
  const stripped = raw.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const hasFloat = /\d\.\d|\d[eE][+-]?\d/.test(stripped);
  let leaf = 'int';
  if (kinds.has('string')) leaf = 'string';
  else if (kinds.has('boolean')) leaf = 'boolean';
  else if (kinds.has('double') || hasFloat) leaf = 'double';
  else if (kinds.has('long')) leaf = 'long';
  const type = leaf + '[]'.repeat(depth);
  return { type: SUPPORTED_TYPES.has(type) ? type : null, weak };
}

function signatureFrom(inputText, outputText) {
  if (inputText == null || outputText == null) return null;
  const parsed = parseInputValues(inputText);
  if (!parsed || parsed.values.length === 0) return null;
  let weak = false;
  const params = [];
  for (let i = 0; i < parsed.values.length; i++) {
    const raw = parsed.values[i];
    const { type, weak: w } = inferType(JSON.parse(raw), raw);
    if (!type) return null;
    weak = weak || w;
    params.push({ name: parsed.names ? parsed.names[i] : `arg${i + 1}`, type });
  }
  const outJson = toJson(String(outputText));
  let returns = 'string';
  if (outJson !== null) {
    const r = inferType(JSON.parse(outJson), outJson);
    if (!r.type) return null;
    returns = r.type;
    weak = weak || r.weak;
  }
  return { sig: { name: 'solution', params, returns }, weak };
}

// Explicit control: put `signature: { name, params: [{ name, type }], returns }` on a problem
// (types: int, long, double, boolean, string, and [] / [][] of those) to skip inference.
export function getSignature(problem) {
  if (!problem) return null;
  const ex = problem.signature;
  if (ex && Array.isArray(ex.params) && ex.params.length > 0 && SUPPORTED_TYPES.has(ex.returns)
      && ex.params.every((p) => p && p.name && SUPPORTED_TYPES.has(p.type))) {
    return { name: ex.name || 'solution', params: ex.params, returns: ex.returns };
  }
  const candidates = [
    ...(problem.examples || []).slice(0, 5).map((e) => [e?.input, e?.output]),
    ...(problem.testCases || []).slice(0, 5).map((t) => [t?.input, t?.expected]),
  ];
  let weakFallback = null;
  for (const [i, o] of candidates) {
    const r = signatureFrom(i, o);
    if (!r) continue;
    if (!r.weak) return r.sig;
    if (!weakFallback) weakFallback = r.sig;
  }
  return weakFallback;
}

// Turns any supported input text into one JSON value per line, in parameter order.
export function canonicalInput(text, sig) {
  const parsed = parseInputValues(text);
  if (!parsed) return null;
  let values = parsed.values;
  if (parsed.names && parsed.names.length === sig.params.length) {
    const map = {};
    parsed.names.forEach((n, i) => { map[n] = parsed.values[i]; });
    if (sig.params.every((p) => p.name in map)) values = sig.params.map((p) => map[p.name]);
  }
  if (values.length !== sig.params.length) return null;
  return values.join('\n') + '\n';
}

export function inputHint(sig) {
  return sig.params.map((p) => `${p.name} = ...`).join(', ');
}

// ── Output handling ───────────────────────────────────────────────────────────
export function splitResult(stdout) {
  const s = stdout || '';
  const i = s.lastIndexOf(RESULT_MARKER);
  if (i === -1) return { userOut: s, returned: null };
  return {
    userOut: s.slice(0, i).replace(/\s+$/, ''),
    returned: s.slice(i + RESULT_MARKER.length).trim(),
  };
}

function deepEq(x, y) {
  if (typeof x === 'number' && typeof y === 'number') {
    return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
  }
  if (Array.isArray(x) && Array.isArray(y)) {
    return x.length === y.length && x.every((v, i) => deepEq(v, y[i]));
  }
  return x === y;
}

// Tolerates spacing, True/true, 3 vs 3.0, quoted vs unquoted strings.
export function sameOutput(expected, actual) {
  const a = String(expected ?? '').trim();
  const b = String(actual ?? '').trim();
  if (a === b) return true;
  const ja = toJson(a);
  const jb = toJson(b);
  if (ja !== null && jb !== null) {
    try { return deepEq(JSON.parse(ja), JSON.parse(jb)); } catch (e) { /* fall through */ }
  }
  const strip = (x) => x.replace(/^"([\s\S]*)"$/, '$1');
  return strip(a) === strip(b);
}

// ── Type names per language ───────────────────────────────────────────────────
const baseOf  = (t) => t.replace(/\[\]/g, '');
const depthOf = (t) => (t.match(/\[\]/g) || []).length;

function pyType(t) {
  let s = { int: 'int', long: 'int', double: 'float', boolean: 'bool', string: 'str' }[baseOf(t)];
  for (let i = 0; i < depthOf(t); i++) s = `List[${s}]`;
  return s;
}
function jsType(t) {
  return { int: 'number', long: 'number', double: 'number', boolean: 'boolean', string: 'string' }[baseOf(t)]
    + '[]'.repeat(depthOf(t));
}
function javaType(t) {
  return { int: 'int', long: 'long', double: 'double', boolean: 'boolean', string: 'String' }[baseOf(t)]
    + '[]'.repeat(depthOf(t));
}
function cppType(t, std = false) {
  const pre = std ? 'std::' : '';
  let s = { int: 'int', long: 'long long', double: 'double', boolean: 'bool', string: `${pre}string` }[baseOf(t)];
  for (let i = 0; i < depthOf(t); i++) s = `${pre}vector<${s}>`;
  return s;
}

// ── Starter code (what the user sees) ─────────────────────────────────────────
export function makeStarter(langId, sig, legacyStarters) {
  if (!sig || !DRIVER_LANGS.has(langId)) return (legacyStarters && legacyStarters[langId]) || '';
  const { name, params, returns } = sig;

  if (langId === 'python3') {
    const args = params.map((p) => `${p.name}: ${pyType(p.type)}`).join(', ');
    return `from typing import List\n\ndef ${name}(${args}) -> ${pyType(returns)}:\n    # Write your solution here\n    pass\n`;
  }

  if (langId === 'javascript') {
    const doc = [
      '/**',
      ...params.map((p) => ` * @param {${jsType(p.type)}} ${p.name}`),
      ` * @return {${jsType(returns)}}`,
      ' */',
    ].join('\n');
    return `${doc}\nfunction ${name}(${params.map((p) => p.name).join(', ')}) {\n    // Write your solution here\n}\n`;
  }

  if (langId === 'java') {
    const args = params.map((p) => `${javaType(p.type)} ${p.name}`).join(', ');
    const ret = { int: 'return 0;', long: 'return 0;', double: 'return 0.0;', boolean: 'return false;' }[returns] || 'return null;';
    return `import java.util.*;\n\nclass Solution {\n    public ${javaType(returns)} ${name}(${args}) {\n        // Write your solution here\n        ${ret}\n    }\n}\n`;
  }

  // cpp17 / cpp14
  const args = params
    .map((p) => (depthOf(p.type) > 0 ? `${cppType(p.type)}& ${p.name}` : `${cppType(p.type)} ${p.name}`))
    .join(', ');
  const ret = { int: 'return 0;', long: 'return 0;', double: 'return 0.0;', boolean: 'return false;', string: 'return "";' }[returns] || 'return {};';
  return `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppType(returns)} ${name}(${args}) {\n        // Write your solution here\n        ${ret}\n    }\n};\n`;
}

// ── Hidden drivers (appended before running, never shown) ─────────────────────
function pyDriver(sig) {
  return String.raw`
# ---- hidden driver (not shown to the user) ----
import sys as __evo_sys, json as __evo_json
__evo_lines = [l.strip() for l in __evo_sys.stdin.read().split('\n') if l.strip()]
__evo_args = [__evo_json.loads(l) for l in __evo_lines]
__evo_res = ${sig.name}(*__evo_args)
__evo_sys.stdout.write('\n${RESULT_MARKER}' + __evo_json.dumps(__evo_res, separators=(',', ':')))
`;
}

function jsDriver(sig) {
  return String.raw`
// ---- hidden driver (not shown to the user) ----
const __evoLines = require('fs').readFileSync(0, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const __evoArgs = __evoLines.map((l) => JSON.parse(l));
const __evoRes = ${sig.name}(...__evoArgs);
process.stdout.write('\n${RESULT_MARKER}' + JSON.stringify(__evoRes === undefined ? null : __evoRes));
`;
}

const JAVA_EVO_IO = String.raw`
class EvoIO {
  static String s;
  static int p;
  static Object parse(String text) { s = text; p = 0; return val(); }
  static void ws() { while (p < s.length() && Character.isWhitespace(s.charAt(p))) p++; }
  static Object val() {
    ws();
    char c = s.charAt(p);
    if (c == '[') {
      p++;
      java.util.List<Object> list = new java.util.ArrayList<Object>();
      ws();
      if (s.charAt(p) == ']') { p++; return list; }
      while (true) {
        list.add(val());
        ws();
        char d = s.charAt(p++);
        if (d == ']') break;
      }
      return list;
    }
    if (c == '"') {
      p++;
      StringBuilder sb = new StringBuilder();
      while (s.charAt(p) != '"') {
        char ch = s.charAt(p++);
        if (ch == '\\') {
          char e = s.charAt(p++);
          if (e == 'n') sb.append('\n');
          else if (e == 't') sb.append('\t');
          else if (e == 'u') { sb.append((char) Integer.parseInt(s.substring(p, p + 4), 16)); p += 4; }
          else sb.append(e);
        } else sb.append(ch);
      }
      p++;
      return sb.toString();
    }
    if (s.startsWith("true", p)) { p += 4; return Boolean.TRUE; }
    if (s.startsWith("false", p)) { p += 5; return Boolean.FALSE; }
    if (s.startsWith("null", p)) { p += 4; return null; }
    int st = p;
    while (p < s.length() && "+-0123456789.eE".indexOf(s.charAt(p)) >= 0) p++;
    String num = s.substring(st, p);
    if (num.indexOf('.') >= 0 || num.indexOf('e') >= 0 || num.indexOf('E') >= 0) return Double.valueOf(num);
    return Long.valueOf(num);
  }
  @SuppressWarnings("unchecked")
  static java.util.List<Object> L(Object o) { return (java.util.List<Object>) o; }
  static int toInt(Object o) { return ((Number) o).intValue(); }
  static long toLong(Object o) { return ((Number) o).longValue(); }
  static double toDouble(Object o) { return ((Number) o).doubleValue(); }
  static int[] toIntArr(Object o) { java.util.List<Object> l = L(o); int[] r = new int[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toInt(l.get(i)); return r; }
  static long[] toLongArr(Object o) { java.util.List<Object> l = L(o); long[] r = new long[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toLong(l.get(i)); return r; }
  static double[] toDoubleArr(Object o) { java.util.List<Object> l = L(o); double[] r = new double[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toDouble(l.get(i)); return r; }
  static boolean[] toBoolArr(Object o) { java.util.List<Object> l = L(o); boolean[] r = new boolean[l.size()]; for (int i = 0; i < r.length; i++) r[i] = ((Boolean) l.get(i)).booleanValue(); return r; }
  static String[] toStrArr(Object o) { java.util.List<Object> l = L(o); String[] r = new String[l.size()]; for (int i = 0; i < r.length; i++) r[i] = (String) l.get(i); return r; }
  static int[][] toIntArr2(Object o) { java.util.List<Object> l = L(o); int[][] r = new int[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toIntArr(l.get(i)); return r; }
  static double[][] toDoubleArr2(Object o) { java.util.List<Object> l = L(o); double[][] r = new double[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toDoubleArr(l.get(i)); return r; }
  static String[][] toStrArr2(Object o) { java.util.List<Object> l = L(o); String[][] r = new String[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toStrArr(l.get(i)); return r; }
  static String quote(String x) {
    StringBuilder sb = new StringBuilder("\"");
    for (char c : x.toCharArray()) {
      if (c == '"') sb.append("\\\"");
      else if (c == '\\') sb.append("\\\\");
      else if (c == '\n') sb.append("\\n");
      else if (c == '\t') sb.append("\\t");
      else sb.append(c);
    }
    return sb.append('"').toString();
  }
  static String fmt(Object o) {
    if (o == null) return "null";
    if (o instanceof String) return quote((String) o);
    if (o instanceof Double) {
      double d = ((Double) o).doubleValue();
      if (d == Math.rint(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
      return String.valueOf(d);
    }
    if (o.getClass().isArray()) {
      int n = java.lang.reflect.Array.getLength(o);
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < n; i++) { if (i > 0) sb.append(','); sb.append(fmt(java.lang.reflect.Array.get(o, i))); }
      return sb.append(']').toString();
    }
    if (o instanceof java.util.List) {
      java.util.List<?> l = (java.util.List<?>) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(','); sb.append(fmt(l.get(i))); }
      return sb.append(']').toString();
    }
    return String.valueOf(o);
  }
}
`;

function javaConv(type, expr) {
  const map = {
    'int': `EvoIO.toInt(${expr})`,
    'long': `EvoIO.toLong(${expr})`,
    'double': `EvoIO.toDouble(${expr})`,
    'boolean': `((Boolean) ${expr}).booleanValue()`,
    'string': `((String) ${expr})`,
    'int[]': `EvoIO.toIntArr(${expr})`,
    'long[]': `EvoIO.toLongArr(${expr})`,
    'double[]': `EvoIO.toDoubleArr(${expr})`,
    'boolean[]': `EvoIO.toBoolArr(${expr})`,
    'string[]': `EvoIO.toStrArr(${expr})`,
    'int[][]': `EvoIO.toIntArr2(${expr})`,
    'double[][]': `EvoIO.toDoubleArr2(${expr})`,
    'string[][]': `EvoIO.toStrArr2(${expr})`,
  };
  return map[type];
}

function javaDriver(sig) {
  const decls = sig.params
    .map((p, i) => `    ${javaType(p.type)} ${p.name} = ${javaConv(p.type, `EvoIO.parse(__lines.get(${i}))`)};`)
    .join('\n');
  const names = sig.params.map((p) => p.name).join(', ');
  return `
// ---- hidden driver (not shown to the user) ----
${JAVA_EVO_IO}
public class Main {
  public static void main(String[] __args) throws Exception {
    java.io.BufferedReader __br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
    java.util.List<String> __lines = new java.util.ArrayList<String>();
    String __ln;
    while ((__ln = __br.readLine()) != null) { __ln = __ln.trim(); if (__ln.length() > 0) __lines.add(__ln); }
${decls}
    Object __res = new Solution().${sig.name}(${names});
    System.out.print("\\n${RESULT_MARKER}" + EvoIO.fmt(__res));
  }
}
`;
}

const CPP_EVO_IO = String.raw`
namespace evo {
  std::string s;
  size_t p = 0;
  void ws() { while (p < s.size() && std::isspace((unsigned char)s[p])) p++; }
  void rd(int& v) { ws(); char* e; v = (int)strtol(s.c_str() + p, &e, 10); p = e - s.c_str(); }
  void rd(long long& v) { ws(); char* e; v = strtoll(s.c_str() + p, &e, 10); p = e - s.c_str(); }
  void rd(double& v) { ws(); char* e; v = strtod(s.c_str() + p, &e); p = e - s.c_str(); }
  void rd(bool& v) { ws(); if (s.compare(p, 4, "true") == 0) { v = true; p += 4; } else { v = false; p += 5; } }
  void rd(std::string& v) {
    ws(); p++; v.clear();
    while (p < s.size() && s[p] != '"') {
      if (s[p] == '\\' && p + 1 < s.size()) { p++; char c = s[p]; v += (c == 'n') ? '\n' : (c == 't') ? '\t' : c; }
      else v += s[p];
      p++;
    }
    p++;
  }
  template <class T> void rd(std::vector<T>& v) {
    ws(); p++; v.clear(); ws();
    if (s[p] == ']') { p++; return; }
    while (true) { T x; rd(x); v.push_back(x); ws(); if (s[p] == ',') { p++; continue; } p++; break; }
  }
  std::string q(const std::string& x) {
    std::string r = "\"";
    for (char c : x) {
      if (c == '"') r += "\\\"";
      else if (c == '\\') r += "\\\\";
      else if (c == '\n') r += "\\n";
      else if (c == '\t') r += "\\t";
      else r += c;
    }
    return r + "\"";
  }
  std::string wr(int v) { return std::to_string(v); }
  std::string wr(long long v) { return std::to_string(v); }
  std::string wr(double v) { char b[64]; snprintf(b, sizeof b, "%.10g", v); return b; }
  std::string wr(bool v) { return v ? "true" : "false"; }
  std::string wr(const std::string& v) { return q(v); }
  template <class T> std::string wr(const std::vector<T>& v) {
    std::string r = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) r += ","; r += wr(v[i]); }
    return r + "]";
  }
}
`;

function cppDriver(sig) {
  const decls = sig.params
    .map((p, i) => `  ${cppType(p.type, true)} ${p.name}; evo::s = __lines[${i}]; evo::p = 0; evo::rd(${p.name});`)
    .join('\n');
  const names = sig.params.map((p) => p.name).join(', ');
  return `
// ---- hidden driver (not shown to the user) ----
#include <bits/stdc++.h>
${CPP_EVO_IO}
int main() {
  std::vector<std::string> __lines;
  std::string __ln;
  while (std::getline(std::cin, __ln)) {
    size_t a = __ln.find_first_not_of(" \\t\\r");
    if (a == std::string::npos) continue;
    size_t b = __ln.find_last_not_of(" \\t\\r");
    __lines.push_back(__ln.substr(a, b - a + 1));
  }
${decls}
  Solution __sol;
  auto __res = __sol.${sig.name}(${names});
  std::cout << "\\n${RESULT_MARKER}" << evo::wr(__res);
  return 0;
}
`;
}

// The full program sent to Judge0. The user's code comes first and unchanged,
// so compiler line numbers still match what they see in the editor.
export function buildSource(langId, userCode, sig) {
  if (!sig || !DRIVER_LANGS.has(langId)) return userCode;
  switch (langId) {
    case 'python3':    return `${userCode}\n${pyDriver(sig)}`;
    case 'javascript': return `${userCode}\n${jsDriver(sig)}`;
    case 'java':       return `${userCode}\n${javaDriver(sig)}`;
    default:           return `${userCode}\n${cppDriver(sig)}`;
  }
}