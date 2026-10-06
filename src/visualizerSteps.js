const POINTER_NAMES = ['i','j','k','left','right','lo','hi','curr','slow','fast','minIdx','maxIdx'];
const PTR_COLORS = { i:'#3ee6ff', j:'#ff7ad9', k:'#ffd23f', low:'#4c8dff', high:'#ff9f43', mid:'#ffd23f', pivot:'#a66bff', found:'#2ee88f', left:'#4c8dff', right:'#ff9f43', best:'#2ee88f' };
const EXTRA = ['#7cf7c6','#ffb86b','#9ad0ff','#f78fff','#c3f75f','#ff8f8f'];
function ptrColor(n){ if (PTR_COLORS[n]) return PTR_COLORS[n]; let h=0; for (const c of n) h=(h*31+c.charCodeAt(0))>>>0; return EXTRA[h%EXTRA.length]; }
const KIND_COLOR = { compare:'#ffd23f', swap:'#3ee6ff', done:'#2ee88f', info:'#5d5880' };
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const randArr = (n=10) => Array.from({length:n}, () => rnd(5, 95));
/* ---------- built-in algorithms: each returns raw JSON steps ---------- */
function bubble(input){
  const a=input.slice(), n=a.length, S=[], sorted=[];
  S.push({message:`Start bubble sort on ${n} values`, array:a.slice(), active:[], sorted:[]});
  for (let i=0;i<n-1;i++){
    let swapped=false;
    for (let j=0;j<n-i-1;j++){
      S.push({type:'compare', message:`Compare a[${j}]=${a[j]} with a[${j+1}]=${a[j+1]}`, array:a.slice(), active:[j,j+1], sorted:sorted.slice(), pointers:{i, j}});
      if (a[j]>a[j+1]){
        [a[j],a[j+1]]=[a[j+1],a[j]]; swapped=true;
        S.push({type:'swap', message:`${a[j+1]} > ${a[j]}, swap them`, array:a.slice(), active:[j,j+1], sorted:sorted.slice(), swap:[j,j+1], pointers:{i, j}});
      }
    }
    sorted.push(n-i-1);
    S.push({type:'info', message:`Pass ${i+1} done. ${a[n-i-1]} is locked at index ${n-i-1}`, array:a.slice(), active:[], sorted:sorted.slice(), pointers:{i}});
    if (!swapped){ S[S.length-1].message += '. No swaps this pass, so the rest is already in order'; break; }
  }
  S.push({type:'done', message:'Array sorted', array:a.slice(), active:[], sorted:a.map((_,k)=>k)});
  return S;
}
function quick(input){
  const a=input.slice(), n=a.length, S=[], fixed=new Set();
  S.push({message:`Start quick sort (Lomuto partition) on ${n} values`, array:a.slice(), active:[], sorted:[]});
  const srt=()=>[...fixed].sort((x,y)=>x-y);
  function part(lo,hi){
    const pv=a[hi]; let i=lo-1;
    S.push({type:'info', message:`Partition a[${lo}..${hi}] around pivot ${pv}`, array:a.slice(), active:[], sorted:srt(), pivot:hi, low:lo, high:hi, vars:{pivotValue:pv}});
    for (let j=lo;j<hi;j++){
      S.push({type:'compare', message:`Is a[${j}]=${a[j]} smaller than pivot ${pv}?`, array:a.slice(), active:[j], sorted:srt(), pivot:hi, low:lo, high:hi, pointers:{i:Math.max(i,lo), j}, vars:{pivotValue:pv}});
      if (a[j]<pv){
        i++;
        if (i!==j){ [a[i],a[j]]=[a[j],a[i]]; S.push({type:'swap', message:`Yes. Move ${a[i]} left to index ${i}`, array:a.slice(), active:[i,j], sorted:srt(), pivot:hi, low:lo, high:hi, swap:[i,j], pointers:{i, j}, vars:{pivotValue:pv}}); }
      }
    }
    if (i+1!==hi){ [a[i+1],a[hi]]=[a[hi],a[i+1]]; S.push({type:'swap', message:`Drop pivot ${pv} into its final slot ${i+1}`, array:a.slice(), active:[i+1,hi], sorted:srt(), pivot:i+1, low:lo, high:hi, swap:[i+1,hi], pointers:{i:i+1}, vars:{pivotValue:pv}}); }
    fixed.add(i+1);
    return i+1;
  }
  (function qs(lo,hi){ if (lo>hi) return; if (lo===hi){ fixed.add(lo); return; } const p=part(lo,hi); qs(lo,p-1); qs(p+1,hi); })(0,n-1);
  S.push({type:'done', message:'Array sorted', array:a.slice(), active:[], sorted:a.map((_,k)=>k)});
  return S;
}
function binary(input, tgt){
  const a=input.slice().sort((x,y)=>x-y), n=a.length, S=[];
  const target = Number.isFinite(tgt) ? tgt : (Math.random()<0.8 ? a[rnd(0,n-1)] : rnd(5,95));
  let lo=0, hi=n-1, found=-1;
  S.push({message:`Search for ${target} in a sorted array`, array:a.slice(), active:[], sorted:[], low:lo, high:hi, vars:{target}});
  while (lo<=hi){
    const mid=(lo+hi)>>1;
    S.push({type:'compare', message:`Check the middle: a[${mid}]=${a[mid]} vs target ${target}`, array:a.slice(), active:[mid], low:lo, high:hi, mid, vars:{target}});
    if (a[mid]===target){ found=mid; break; }
    if (a[mid]<target){ lo=mid+1; S.push({type:'info', message:`${a[mid]} < ${target}, so throw away the left half`, array:a.slice(), active:[], low:lo, high:hi, vars:{target}}); }
    else { hi=mid-1; S.push({type:'info', message:`${a[mid]} > ${target}, so throw away the right half`, array:a.slice(), active:[], low:lo, high:hi, vars:{target}}); }
  }
  if (found>=0) S.push({type:'done', message:`Found ${target} at index ${found}`, array:a.slice(), active:[], low:lo, high:hi, mid:found, found, vars:{target}});
  else S.push({type:'done', message:`${target} is not in the array. low passed high`, array:a.slice(), active:[], vars:{target}});
  return S;
}
const CUSTOM_EXAMPLE = [
  {message:'Find the maximum: start with the first value', array:[5,2,9,1,7], active:[0], pointers:{i:0, best:0}, vars:{max:5}},
  {type:'compare', message:'Is 2 bigger than max 5? No', active:[1], pointers:{i:1, best:0}, vars:{max:5}},
  {type:'compare', message:'Is 9 bigger than max 5? Yes, new max', active:[2], pointers:{i:2, best:2}, vars:{max:9}},
  {type:'compare', message:'Is 1 bigger than max 9? No', active:[3], pointers:{i:3, best:2}, vars:{max:9}},
  {type:'compare', message:'Is 7 bigger than max 9? No', active:[4], pointers:{i:4, best:2}, vars:{max:9}},
  {type:'swap', message:'Move the max to the front', array:[9,2,5,1,7], active:[0,2], swap:[0,2], pointers:{best:0}, vars:{max:9}},
  {type:'done', message:'Max 9 is at index 0', sorted:[0], found:0, vars:{max:9}}
];
const ALGOS = [
  {id:'custom', name:'Custom Builder', sub:'Any algorithm', gl:'{ }', desc:'Write steps in JSON or build them on the timeline. The workbench animates whatever you describe.', cx:['User defined','User defined','Any algorithm'], gen:null},
  {id:'bubble', name:'Bubble Sort', sub:'Sorting', gl:'⇅', desc:'Walk the array, compare neighbours and swap them when they are out of order. The biggest value bubbles to the end each pass.', cx:['O(n²)','O(1)','Sorting'], gen:bubble},
  {id:'quick', name:'Quick Sort', sub:'Sorting · pivot', gl:'◆', desc:'Pick the last value as pivot, move everything smaller to its left, lock the pivot in place, then repeat on each side.', cx:['O(n log n) avg · O(n²) worst','O(log n)','Sorting'], gen:quick},
  {id:'binary', name:'Binary Search', sub:'Searching', gl:'⌕', desc:'On a sorted array, check the middle and throw away the half that cannot hold the target. low and high close in on the answer.', cx:['O(log n)','O(1)','Searching'], gen:binary},
];

/* ---------- step normalisation + semantic checks ---------- */
const OPT_IDX = ['pivot','low','high','mid','found'];
function isInt(v){ return Number.isInteger(v); }
function normalize(raw){
  const errors=[], steps=[];
  if (!Array.isArray(raw)) return {steps, errors:[{step:-1, msg:'The top level must be a list of steps: [ {...}, {...} ]'}]};
  if (!raw.length) return {steps, errors:[{step:-1, msg:'Add at least one step.'}]};
  let prev=null;
  raw.forEach((s,k)=>{
    const E=(m)=>errors.push({step:k, msg:`Step ${k+1}: ${m}`});
    if (!s || typeof s!=='object' || Array.isArray(s)){ E('must be an object like { "message": "...", "array": [...] }'); return; }
    const KNOWN=['type','message','array','active','sorted','swap','pivot','low','high','mid','found','pointers','vars'];
    Object.keys(s).forEach(key=>{ if (!KNOWN.includes(key)){ const near=KNOWN.find(q=>q[0]===key[0]&&Math.abs(q.length-key.length)<=2); E(`unknown field "${key}"${near?`. Did you mean "${near}"?`:''}`); } });
    if (s.message!==undefined && typeof s.message!=='string') E('"message" must be text in quotes');
    if (s.type!==undefined && !['array','compare','swap','done','info'].includes(s.type)) E('"type" must be one of compare, swap, done, info or array');
    let arr = s.array!==undefined ? s.array : prev && prev.array;
    if (!Array.isArray(arr)){ E(k===0 ? 'the first step needs an "array"' : '"array" must be a list of numbers'); return; }
    if (!arr.length){ E('"array" is empty'); return; }
    if (arr.length>24){ E(`"array" has ${arr.length} values. The workbench fits up to 24`); return; }
    if (arr.some(v=>typeof v!=='number' || !isFinite(v))){ E('every value in "array" must be a number'); return; }
    const n=arr.length;
    const idx=(v,name)=>{ if (v===undefined || v===null) return null; if (!isInt(v)){ E(`"${name}" must be a whole-number index`); return null; } if (v<0||v>=n){ E(`"${name}" is ${v} but the array only has indexes 0 to ${n-1}`); return null; } return v; };
    const list=(v,name)=>{ if (v===undefined||v===null) return []; if (!Array.isArray(v)){ E(`"${name}" must be a list of indexes`); return []; } return v.map((x,q)=>idx(x,`${name}[${q}]`)).filter(x=>x!==null); };
    const out={ raw:s, message: typeof s.message==='string' ? s.message : '', array:arr.slice(), active:list(s.active,'active'), sorted:list(s.sorted!==undefined ? s.sorted : (prev && s.array===undefined ? prev.sorted : undefined),'sorted') , ptrs:{}, vars:{} };
    OPT_IDX.forEach(f=>{ out[f]=idx(s[f],f); });
    if (s.swap!==undefined){ const sw=list(s.swap,'swap'); if (sw.length!==2) E('"swap" needs exactly two indexes, like [0, 3]'); else out.swap=sw; }
    if (s.pointers!==undefined){ if (typeof s.pointers!=='object'||Array.isArray(s.pointers)||!s.pointers) E('"pointers" must be an object like { "i": 0 }'); else Object.entries(s.pointers).forEach(([p,v])=>{ const q=idx(v,`pointers.${p}`); if (q!==null) out.ptrs[p]=q; }); }
    if (s.vars!==undefined){ if (typeof s.vars!=='object'||Array.isArray(s.vars)||!s.vars) E('"vars" must be an object like { "target": 42 }'); else Object.entries(s.vars).forEach(([p,v])=>{ if (POINTER_NAMES.includes(p) && isInt(v) && v>=0 && v<n) out.ptrs[p]=v; else out.vars[p]= (typeof v==='object' ? JSON.stringify(v) : v); }); }
    ['pivot','low','high','mid'].forEach(f=>{ if (out[f]!==null && out.ptrs[f]===undefined) out.ptrs[f]=out[f]; });
    // kind
    const t=s.type;
    if (['compare','swap','done','info'].includes(t)) out.kind=t;
    else if (out.swap || (prev && prev.array.join()!==out.array.join())) out.kind='swap';
    else if (out.found!==null || (out.sorted.length===n && n>0)) out.kind='done';
    else if (out.active.length) out.kind='compare';
    else out.kind='info';
    steps.push(out); prev=out;
  });
  return {steps, errors};
}

/* ---------- formatter: one key per line, short arrays inline ---------- */
function inl(v){
  if (Array.isArray(v)) return '[' + v.map(x=>JSON.stringify(x)).join(', ') + ']';
  if (v && typeof v==='object') { const e=Object.entries(v); return e.length ? '{ ' + e.map(([k,x])=>JSON.stringify(k)+': '+JSON.stringify(x)).join(', ') + ' }' : '{}'; }
  return JSON.stringify(v);
}
function fmt(steps){ return '[\n' + steps.map(s=>'  {\n' + Object.entries(s).map(([k,v])=>'    '+JSON.stringify(k)+': '+inl(v)).join(',\n') + '\n  }').join(',\n') + '\n]\n'; }
export { POINTER_NAMES, ptrColor, KIND_COLOR, rnd, randArr, bubble, quick, binary, CUSTOM_EXAMPLE, ALGOS, normalize, fmt };
