import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

/**
 * AdminPanel.jsx
 *
 * Gate this behind your role check before rendering:
 *   {userData?.role === 'admin' && <AdminPanel user={user} userData={userData} />}
 */

const TABS = [
  { id: 'stats', label: 'Overview' },
  { id: 'companies', label: 'Companies and Personas' },
  { id: 'templates', label: 'Interview Templates' },
  { id: 'behavior', label: 'AI Behavior' },
  { id: 'platform', label: 'Platform Configuration' },
];

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('stats');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Administrator</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
            Companies, interview templates, and AI behavior, live editable, no deploy required.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? '#a855f722' : '#0d1117',
                border: `1px solid ${tab === t.id ? '#a855f766' : '#1e2a3a'}`,
                borderRadius: 10, color: tab === t.id ? '#a855f7' : '#888',
                cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '9px 16px',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'stats' && <StatsTab userId={user?.uid} />}
        {tab === 'companies' && <CompaniesTab userId={user?.uid} />}
        {tab === 'templates' && <TemplatesTab userId={user?.uid} />}
        {tab === 'behavior' && <BehaviorTab userId={user?.uid} />}
        {tab === 'platform' && <PlatformTab userId={user?.uid} />}

      </div>
    </div>
  );
}

function StatsTab({ userId }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/admin/stats`, { params: { userId } })
      .then(res => setStats(res.data))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, [userId]);

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <div style={{ color: '#555' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: stats.totalUsers, color: '#a855f7' },
          { label: 'Total Interviews', value: stats.totalInterviews, color: '#00c896' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 18 }}>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BreakdownCard title="By Company" data={stats.byCompany} />
        <BreakdownCard title="By Interview Type" data={stats.byType} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 16 }}>
      <div style={{ color: '#888', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {entries.map(([key, count]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #14141f' }}>
          <span style={{ color: '#ccc', fontSize: 12 }}>{key}</span>
          <span style={{ color: '#666', fontSize: 12 }}>{count}</span>
        </div>
      ))}
      {entries.length === 0 && <div style={{ color: '#333', fontSize: 12 }}>No data yet.</div>}
    </div>
  );
}

function CompaniesTab({ userId }) {
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    axios.get(`${API_BASE}/admin/companies`)
      .then(res => setCompanies(res.data.companies))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  if (error) return <ErrorBox message={error} />;
  if (loading) return <div style={{ color: '#555' }}>Loading...</div>;

  return (
    <div>
      <button onClick={() => setEditing({ key: '', archetype: '', pressureStyle: 'balanced', promptInstructions: '', warmthTrend: '' })}
        style={{ background: '#a855f7', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 18px', marginBottom: 18 }}>
        Add Company
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {Object.entries(companies).map(([key, c]) => (
          <div key={key} style={{ background: '#0d1117', border: `1px solid ${c.isOverridden ? '#a855f766' : '#1e2a3a'}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, textTransform: 'capitalize' }}>{key}</div>
                <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{c.archetype}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {c.isOverridden && <span style={{ background: '#a855f722', color: '#a855f7', borderRadius: 12, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>EDITED</span>}
                {c.isCustom && <span style={{ background: '#00c89622', color: '#00c896', borderRadius: 12, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>CUSTOM</span>}
              </div>
            </div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 8 }}>Pressure: {c.pressureStyle}</div>
            <button onClick={() => setEditing({ key, ...c })}
              style={{ marginTop: 10, width: '100%', background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 11, padding: '7px 0' }}>
              Edit
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <CompanyEditModal
            initial={editing}
            userId={userId}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); fetchCompanies(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CompanyEditModal({ initial, userId, onClose, onSaved }) {
  const [key, setKey] = useState(initial.key || '');
  const [archetype, setArchetype] = useState(initial.archetype || '');
  const [pressureStyle, setPressureStyle] = useState(initial.pressureStyle || 'balanced');
  const [promptInstructions, setPromptInstructions] = useState(initial.promptInstructions || '');
  const [warmthTrend, setWarmthTrend] = useState(initial.warmthTrend || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!key.trim()) { setError('Company key is required.'); return; }
    if (!promptInstructions.trim()) { setError('Prompt instructions are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await axios.put(`${API_BASE}/admin/companies/${key.toLowerCase().trim()}`, {
        userId, archetype, pressureStyle, promptInstructions, warmthTrend,
      });
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={initial.key ? `Edit ${initial.key}` : 'New Company'}>
      <FieldLabel>Company Key</FieldLabel>
      <TextInput value={key} onChange={setKey} disabled={Boolean(initial.key)} placeholder="e.g. google" />

      <FieldLabel>Archetype (short description)</FieldLabel>
      <TextInput value={archetype} onChange={setArchetype} placeholder="Curious, intellectually playful" />

      <FieldLabel>Pressure Style (tag)</FieldLabel>
      <TextInput value={pressureStyle} onChange={setPressureStyle} placeholder="intellectual-depth" />

      <FieldLabel>Prompt Instructions (this drives the AI's actual behavior)</FieldLabel>
      <TextArea value={promptInstructions} onChange={setPromptInstructions} rows={7} />

      <FieldLabel>Warmth Trend</FieldLabel>
      <TextInput value={warmthTrend} onChange={setWarmthTrend} placeholder="warms up if candidate handles pushback well" />

      {error && <ErrorText message={error} />}
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </ModalShell>
  );
}

const INTERVIEW_TYPES = [
  'coding', 'system-design', 'behavioral', 'technical-screening', 'recruiter-call',
  'ai-fluency', 'personalized', 'voice', 'autonomous', 'frontend',
  'db-debug', 'api-integration', 'cloud-arch', 'distributed-systems',
];

function TemplatesTab({ userId }) {
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    axios.get(`${API_BASE}/admin/interview-templates`)
      .then(res => setOverrides(res.data.templates))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  if (error) return <ErrorBox message={error} />;
  if (loading) return <div style={{ color: '#555' }}>Loading...</div>;

  return (
    <div>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
        Editing a template here overrides the hardcoded default for that interview type immediately, for every session.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {INTERVIEW_TYPES.map(type => {
          const hasOverride = Boolean(overrides[type]);
          return (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1117', border: `1px solid ${hasOverride ? '#a855f766' : '#1e2a3a'}`, borderRadius: 10, padding: '12px 16px' }}>
              <div>
                <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>{type}</span>
                {hasOverride && <span style={{ marginLeft: 10, background: '#a855f722', color: '#a855f7', borderRadius: 12, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>CUSTOM PROMPT</span>}
              </div>
              <button onClick={() => setEditing({ type, systemPrompt: overrides[type]?.systemPrompt || '' })}
                style={{ background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 11, padding: '6px 14px' }}>
                {hasOverride ? 'Edit' : 'Override'}
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && (
          <TemplateEditModal
            initial={editing}
            userId={userId}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); fetchTemplates(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TemplateEditModal({ initial, userId, onClose, onSaved }) {
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (systemPrompt.trim().length < 20) { setError('Prompt is too short.'); return; }
    setSaving(true);
    setError('');
    try {
      await axios.put(`${API_BASE}/admin/interview-templates/${initial.type}`, { userId, systemPrompt });
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={`Override: ${initial.type}`} wide>
      <FieldLabel>System Prompt</FieldLabel>
      <TextArea value={systemPrompt} onChange={setSystemPrompt} rows={12} />
      {error && <ErrorText message={error} />}
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </ModalShell>
  );
}

function BehaviorTab({ userId }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/admin/ai-behavior`)
      .then(res => setConfig(res.data.config))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await axios.put(`${API_BASE}/admin/ai-behavior`, { userId, ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!config) return <div style={{ color: '#555' }}>Loading...</div>;

  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 20, maxWidth: 460 }}>
      <ToggleRow
        label="Variability Engine"
        desc="Each session gets a different behavioral angle, so no two interviews feel identical."
        value={config.variabilityEnabled}
        onChange={v => setConfig({ ...config, variabilityEnabled: v })}
      />
      <ToggleRow
        label="Evidence-Based Evaluation"
        desc="Final reports must cite specific transcript moments rather than general impressions."
        value={config.evidenceBasedEvaluationEnabled}
        onChange={v => setConfig({ ...config, evidenceBasedEvaluationEnabled: v })}
      />

      <FieldLabel>Groq Model</FieldLabel>
      <TextInput value={config.groqModel} onChange={v => setConfig({ ...config, groqModel: v })} />

      <FieldLabel>Temperature</FieldLabel>
      <input type="number" step="0.1" min="0" max="1" value={config.groqTemperature}
        onChange={e => setConfig({ ...config, groqTemperature: parseFloat(e.target.value) })}
        style={inputStyle} />

      <FieldLabel>Max Follow-ups Per Question</FieldLabel>
      <input type="number" min="0" max="5" value={config.maxFollowUpsPerQuestion}
        onChange={e => setConfig({ ...config, maxFollowUpsPerQuestion: parseInt(e.target.value, 10) })}
        style={inputStyle} />

      {error && <ErrorText message={error} />}

      <button onClick={save} disabled={saving}
        style={{ marginTop: 16, width: '100%', background: 'linear-gradient(135deg, #a855f7, #a855f7bb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 0', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
      </button>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #14141f' }}>
      <div style={{ maxWidth: 300 }}>
        <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 20, border: 'none', cursor: 'pointer',
          background: value ? '#a855f7' : '#1e2a3a', position: 'relative', flexShrink: 0,
        }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

function PlatformTab({ userId }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/admin/platform-config`)
      .then(res => setConfig(res.data.config))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await axios.put(`${API_BASE}/admin/platform-config`, { userId, ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (type) => {
    const current = config.enabledInterviewTypes || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setConfig({ ...config, enabledInterviewTypes: next });
  };

  const toggleDistrict = (d) => {
    const current = config.enabledDistricts || [];
    const next = current.includes(d) ? current.filter(x => x !== d) : [...current, d];
    setConfig({ ...config, enabledDistricts: next });
  };

  if (error) return <ErrorBox message={error} />;
  if (!config) return <div style={{ color: '#555' }}>Loading...</div>;

  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 20, maxWidth: 620 }}>

      <ToggleRow
        label="Maintenance Mode"
        desc="Blocks all new interview starts platform-wide, shows the message below instead."
        value={config.maintenanceMode}
        onChange={v => setConfig({ ...config, maintenanceMode: v })}
      />

      {config.maintenanceMode && (
        <>
          <FieldLabel>Maintenance Message</FieldLabel>
          <TextArea value={config.maintenanceMessage} onChange={v => setConfig({ ...config, maintenanceMessage: v })} rows={2} />
        </>
      )}

      <ToggleRow
        label="New Signups"
        desc="Turn off to stop accepting new user accounts."
        value={config.newSignupsEnabled}
        onChange={v => setConfig({ ...config, newSignupsEnabled: v })}
      />
      <ToggleRow
        label="Resume Screening"
        desc="Enable or disable the Resume Screening feature platform-wide."
        value={config.resumeScreeningEnabled}
        onChange={v => setConfig({ ...config, resumeScreeningEnabled: v })}
      />
      <ToggleRow
        label="Recruiter Dashboard"
        desc="Enable or disable recruiter pipeline access platform-wide."
        value={config.recruiterDashboardEnabled}
        onChange={v => setConfig({ ...config, recruiterDashboardEnabled: v })}
      />

      <FieldLabel>Platform Announcement (shown to all users, leave blank for none)</FieldLabel>
      <TextArea value={config.platformAnnouncement} onChange={v => setConfig({ ...config, platformAnnouncement: v })} rows={2} />

      <div style={{ marginTop: 18 }}>
        <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Enabled Interview Types</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {INTERVIEW_TYPES.map(type => {
            const on = (config.enabledInterviewTypes || []).includes(type);
            return (
              <button key={type} onClick={() => toggleType(type)}
                style={{
                  background: on ? '#a855f722' : '#060910',
                  border: `1px solid ${on ? '#a855f766' : '#1e2a3a'}`,
                  borderRadius: 20, color: on ? '#a855f7' : '#555',
                  cursor: 'pointer', fontSize: 11, padding: '5px 12px',
                }}>
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Enabled Districts</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(d => {
            const on = (config.enabledDistricts || []).includes(d);
            return (
              <button key={d} onClick={() => toggleDistrict(d)}
                style={{
                  background: on ? '#a855f722' : '#060910',
                  border: `1px solid ${on ? '#a855f766' : '#1e2a3a'}`,
                  borderRadius: 20, color: on ? '#a855f7' : '#555',
                  cursor: 'pointer', fontSize: 11, padding: '5px 12px', width: 32,
                }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorText message={error} />}

      <button onClick={save} disabled={saving}
        style={{ marginTop: 20, width: '100%', background: 'linear-gradient(135deg, #a855f7, #a855f7bb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 0', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
      </button>
    </div>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#060910', border: '1px solid #1e2a3a', borderRadius: 8, color: '#e8e8e8', fontSize: 13, padding: '9px 10px', margin: '6px 0 14px' };

function FieldLabel({ children }) {
  return <label style={{ display: 'block', color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{children}</label>;
}
function TextInput({ value, onChange, placeholder, disabled }) {
  return <input value={value} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }} />;
}
function TextArea({ value, onChange, rows = 6 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }} />;
}
function ErrorText({ message }) {
  return <div style={{ color: '#ff6b6b', fontSize: 12, margin: '8px 0' }}>{message}</div>;
}
function ErrorBox({ message }) {
  return <div style={{ color: '#ff6b6b', background: '#ff4d4d11', border: '1px solid #ff4d4d33', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{message}</div>;
}

function ModalShell({ children, title, onClose, wide }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16, padding: 24, width: wide ? 560 : 420, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 16 }}>{title}</div>
        {children}
      </motion.div>
    </motion.div>
  );
}
function ModalActions({ onCancel, onSave, saving }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
      <button onClick={onCancel} style={{ flex: 1, background: '#1e2a3a', border: 'none', borderRadius: 10, color: '#888', cursor: 'pointer', fontSize: 13, padding: '11px 0' }}>Cancel</button>
      <button onClick={onSave} disabled={saving} style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7, #a855f7bb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 0', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}