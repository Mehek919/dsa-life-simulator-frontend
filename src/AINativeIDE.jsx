import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import API_BASE from './config';

const LANG_COLORS = { javascript:'#f5c542', python:'#4285f4', css:'#ec4899', json:'#00c896' };

function FileTree({ files, activeFile, onSelect, onNewFile }) {
  return (
    <div style={{ width:180, background:'#0a0e17', borderRight:'1px solid #1e2a3a', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>Explorer</span>
        <button onClick={onNewFile} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16, lineHeight:1 }} title="New file">+</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
        {files.map(f => (
          <div key={f.name} onClick={() => onSelect(f.name)}
            style={{ padding:'5px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, background:activeFile===f.name?'#1e2a3a':'transparent', borderLeft:activeFile===f.name?'2px solid #06b6d4':'2px solid transparent', transition:'all 0.1s' }}
          >
            <span style={{ fontSize:11, color:f.readOnly?'#444':'#888' }}>
              {f.name.endsWith('.js') ? '📄' : f.name.endsWith('.css') ? '🎨' : f.name.endsWith('.json') ? '📋' : '📝'}
            </span>
            <span style={{ fontSize:11, color:activeFile===f.name?'#e8e8e8':f.readOnly?'#444':'#888', fontFamily:'"Fira Code", monospace' }}>{f.name}</span>
            {f.readOnly && <span style={{ fontSize:8, color:'#333', marginLeft:'auto' }}>RO</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Terminal({ lines, running }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [lines]);
  return (
    <div style={{ height:180, background:'#030609', borderTop:'1px solid #1e2a3a', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'4px 12px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>Terminal</span>
        {running && <span style={{ color:'#06b6d4', fontSize:10, fontStyle:'italic' }}>Running...</span>}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 14px', fontFamily:'"Fira Code", monospace', fontSize:11 }}>
        {lines.length === 0 && <span style={{ color:'#2a3645' }}>Press Run ▷ to execute tests</span>}
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.startsWith('✓')?'#00c896':l.startsWith('✗')?'#ff4d4d':l.startsWith('>')?'#06b6d4':'#888', marginBottom:2 }}>{l}</div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default function AINativeIDE({ session, user, onComplete }) {
  const task     = session.task || {};
  const initFiles = (session.task?.files || []).map(f => ({ ...f }));

  const [files,       setFiles]       = useState(initFiles);
  const [activeFile,  setActiveFile]  = useState(initFiles[0]?.name || '');
  const [aiMode,      setAiMode]      = useState('copilot'); // 'copilot' | 'agent'
  const [aiInput,     setAiInput]     = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiMessages,  setAiMessages]  = useState([{ role:'system', text:`🧠 AI assistant ready. Mode: Copilot. Type a question or switch to Agent mode to rewrite files.` }]);
  const [termLines,   setTermLines]   = useState([]);
  const [running,     setRunning]     = useState(false);
  const [completion,  setCompletion]  = useState('');
  const [solved,      setSolved]      = useState(false);
  const editorRef = useRef(null);

  const activeFileObj = files.find(f => f.name === activeFile);

  const updateFileContent = (name, content) => {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, content } : f));
    setCompletion('');
  };

  const handleRun = async () => {
    setRunning(true);
    setTermLines(['> Running tests...', '']);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-native/run`, { files });
      const output = res.data.output || '';
      const outputLines = output.split('\n').filter(Boolean);
      setTermLines(['> node tests.js', '', ...outputLines, '', res.data.allPassed ? '✅ All tests passed!' : `⚠ ${res.data.passed}/${res.data.total} tests passed`]);
      if (res.data.allPassed) setSolved(true);
    } catch (err) {
      setTermLines(['> Error running tests', err.response?.data?.output || err.message]);
    } finally { setRunning(false); }
  };

  const handleCopilot = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages(p => [...p, { role:'user', text:question }]);
    setAiLoading(true);
    try {
      const contextFiles = files.map(f => `// ${f.name}\n${f.content}`).join('\n\n---\n\n');
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-assist`, {
        userId: user.uid, type:'chat',
        question, code: activeFileObj?.content || '', language: 'javascript',
        problemTitle: task.title, problemDescription: `${task.description}\n\nAll project files:\n${contextFiles.slice(0,2000)}`,
      });
      setAiMessages(p => [...p, { role:'assistant', text:res.data.result }]);
    } catch (e) { setAiMessages(p => [...p, { role:'assistant', text:'⚠ AI unavailable — check API key.' }]); }
    finally { setAiLoading(false); }
  };

  const handleAgent = async () => {
    if (!aiInput.trim() || aiLoading || !activeFileObj) return;
    const instruction = aiInput.trim();
    setAiInput('');
    setAiMessages(p => [...p, { role:'user', text:`[Agent] ${instruction}` }]);
    setAiLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-native/agent`, {
        userId: user.uid, instruction, fileName: activeFile,
        fileContent: activeFileObj.content, allFiles: files, language: 'javascript',
      });
      updateFileContent(activeFile, res.data.newContent);
      setAiMessages(p => [...p, { role:'assistant', text:`✓ Rewrote ${activeFile}. Review the changes and run tests to verify.` }]);
    } catch (e) { setAiMessages(p => [...p, { role:'assistant', text:'⚠ Agent failed — try a more specific instruction.' }]); }
    finally { setAiLoading(false); }
  };

  const handleGetCompletion = async () => {
    if (!activeFileObj || aiLoading) return;
    setAiLoading(true);
    try {
      const contextFiles = files.filter(f => f.name !== activeFile).map(f => `// ${f.name}\n${f.content}`).join('\n\n');
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-assist`, {
        userId: user.uid, type:'completion',
        code: activeFileObj.content, language:'javascript',
        problemTitle: task.title, problemDescription: contextFiles.slice(0,1000),
      });
      setCompletion(res.data.result);
    } catch (e) { /* silent */ }
    finally { setAiLoading(false); }
  };

  const handleNewFile = () => {
    const name = prompt('New file name (e.g. helpers.js):');
    if (!name || files.find(f => f.name === name)) return;
    setFiles(prev => [...prev, { name, language:'javascript', readOnly:false, content:`// ${name}\n` }]);
    setActiveFile(name);
  };

  const aiMsgEndRef = useRef(null);
  useEffect(() => { aiMsgEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [aiMessages]);

  return (
    <div style={{ display:'flex', height:'100%', background:'#060910', fontFamily:'"Fira Code", monospace', overflow:'hidden' }}>
      {/* File Tree */}
      <FileTree files={files} activeFile={activeFile} onSelect={setActiveFile} onNewFile={handleNewFile} />

      {/* Editor + Terminal */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Tab bar */}
        <div style={{ display:'flex', background:'#0a0e17', borderBottom:'1px solid #1e2a3a', flexShrink:0, overflowX:'auto' }}>
          {files.filter(f => f.name === activeFile).map(f => (
            <div key={f.name} style={{ padding:'6px 16px', borderRight:'1px solid #1e2a3a', background:'#060910', borderTop:'1px solid #06b6d4', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#e8e8e8', fontSize:11 }}>{f.name}</span>
              {f.readOnly && <span style={{ color:'#333', fontSize:9 }}>🔒</span>}
            </div>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 12px' }}>
            {completion && (
              <button onClick={() => { updateFileContent(activeFile, (activeFileObj?.content||'') + '\n' + completion); }}
                style={{ background:'#00c89622', border:'1px solid #00c89644', borderRadius:6, color:'#00c896', cursor:'pointer', fontSize:10, fontWeight:700, padding:'3px 10px' }}>
                ✓ Accept
              </button>
            )}
            <button onClick={handleGetCompletion} disabled={aiLoading || activeFileObj?.readOnly}
              style={{ background:'#06b6d422', border:'1px solid #06b6d444', borderRadius:6, color:'#06b6d4', cursor:'pointer', fontSize:10, fontWeight:700, padding:'3px 10px', opacity:aiLoading?0.4:1 }}>
              {aiLoading ? '...' : '⚡ Copilot'}
            </button>
            <button onClick={handleRun} disabled={running}
              style={{ background:solved?'#00c89622':running?'#1e2a3a':'linear-gradient(135deg,#06b6d4,#06b6d488)', border:'none', borderRadius:6, color:running?'#444':solved?'#00c896':'#fff', cursor:'pointer', fontSize:11, fontWeight:700, padding:'4px 14px' }}>
              {running ? '⏳ Running' : solved ? '✅ Solved' : '▷ Run'}
            </button>
          </div>
        </div>

        {/* Completion ghost */}
        {completion && (
          <div style={{ background:'#00c89608', borderBottom:'1px solid #00c89622', padding:'6px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
            <span style={{ color:'#00c896', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>⚡ SUGGESTION</span>
            <pre style={{ margin:0, color:'#00c89688', fontSize:11, lineHeight:1.5, overflow:'auto', maxHeight:80 }}>{completion}</pre>
            <button onClick={() => setCompletion('')} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:14, flexShrink:0 }}>✕</button>
          </div>
        )}

        {/* Code editor */}
        <div style={{ flex:1, overflow:'auto', position:'relative' }}>
          {activeFileObj ? (
            <textarea
              ref={editorRef}
              value={activeFileObj.content}
              onChange={e => !activeFileObj.readOnly && updateFileContent(activeFile, e.target.value)}
              readOnly={activeFileObj.readOnly}
              spellCheck={false}
              style={{ width:'100%', height:'100%', background:'#060910', color:activeFileObj.readOnly?'#445':'#e8e8e8', fontFamily:'"Fira Code", monospace', fontSize:12, lineHeight:1.65, border:'none', outline:'none', resize:'none', padding:'16px', boxSizing:'border-box', opacity:activeFileObj.readOnly?0.6:1 }}
            />
          ) : (
            <div style={{ color:'#333', textAlign:'center', padding:60, fontSize:12 }}>Select a file from the explorer</div>
          )}
        </div>

        {/* Terminal */}
        <Terminal lines={termLines} running={running} />
      </div>

      {/* AI Panel */}
      <div style={{ width:300, borderLeft:'1px solid #1e2a3a', display:'flex', flexDirection:'column', background:'#0d1117', flexShrink:0 }}>
        {/* Mode toggle */}
        <div style={{ padding:'8px 10px', borderBottom:'1px solid #1e2a3a', display:'flex', gap:4, flexShrink:0 }}>
          {[{ id:'copilot', label:'💬 Copilot', desc:'Ask questions' }, { id:'agent', label:'🤖 Agent', desc:'Rewrite files' }].map(m => (
            <button key={m.id} onClick={() => setAiMode(m.id)}
              style={{ flex:1, padding:'6px 4px', background:aiMode===m.id?'#06b6d422':'transparent', border:`1px solid ${aiMode===m.id?'#06b6d444':'#1e2a3a'}`, borderRadius:8, cursor:'pointer', color:aiMode===m.id?'#06b6d4':'#555', fontSize:10, fontWeight:700, textAlign:'center', transition:'all 0.15s' }}
            >
              <div>{m.label}</div>
              <div style={{ fontSize:8, opacity:0.7, marginTop:1 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Task info */}
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
          <div style={{ color:'#06b6d4', fontSize:10, fontWeight:700, marginBottom:4 }}>📋 TASK</div>
          <div style={{ color:'#888', fontSize:10, lineHeight:1.6 }}>{task.scenario || task.description || ''}</div>
        </div>

        {/* AI Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
          {aiMessages.map((m, i) => (
            <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'90%', background:m.role==='user'?'#06b6d422':m.role==='system'?'#1e2a3a22':'#1e2a3a', border:`1px solid ${m.role==='user'?'#06b6d444':'#2a3645'}`, borderRadius:m.role==='user'?'10px 10px 2px 10px':'10px 10px 10px 2px', padding:'7px 10px', color:m.role==='user'?'#67e8f9':m.role==='system'?'#444':'#c8c8c8', fontSize:10, lineHeight:1.6, fontFamily:'Arial, sans-serif' }}>
              {m.role==='assistant' && <div style={{ color:'#06b6d4', fontSize:8, fontWeight:700, marginBottom:3 }}>✨ AI {aiMode==='agent'?'AGENT':'COPILOT'}</div>}
              {m.text}
            </div>
          ))}
          {aiLoading && <div style={{ color:'#444', fontSize:10, fontStyle:'italic', fontFamily:'Arial, sans-serif' }}>{aiMode==='agent'?'🤖 Agent rewriting...':'✨ Thinking...'}</div>}
          <div ref={aiMsgEndRef} />
        </div>

        {/* Agent mode warning */}
        {aiMode === 'agent' && (
          <div style={{ padding:'6px 12px', background:'#f59e0b08', borderTop:'1px solid #f59e0b22', flexShrink:0 }}>
            <div style={{ color:'#f59e0b', fontSize:9 }}>⚠ Agent will rewrite <strong>{activeFile}</strong>. Review before running.</div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'8px 10px', borderTop:'1px solid #1e2a3a', display:'flex', gap:6, flexShrink:0 }}>
          <textarea
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); aiMode==='agent'?handleAgent():handleCopilot(); } }}
            placeholder={aiMode==='agent' ? `Tell AI what to do with ${activeFile}...` : 'Ask about the code or task...'}
            rows={2}
            style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'7px 10px', color:'#e8e8e8', fontSize:10, outline:'none', resize:'none', fontFamily:'Arial, sans-serif', lineHeight:1.5 }}
          />
          <button
            onClick={aiMode==='agent'?handleAgent:handleCopilot}
            disabled={aiLoading||!aiInput.trim()}
            style={{ background:aiLoading||!aiInput.trim()?'#1e2a3a':`linear-gradient(135deg,#06b6d4,#06b6d488)`, border:'none', borderRadius:8, color:aiLoading||!aiInput.trim()?'#444':'#fff', cursor:'pointer', fontSize:10, fontWeight:700, padding:'0 10px', minWidth:44, opacity:1 }}
          >
            {aiLoading ? '...' : aiMode==='agent' ? '▶' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}