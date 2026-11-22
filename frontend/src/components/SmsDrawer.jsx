import { useState } from 'react';
import { apiFetch, deleteMyData } from '../lib/api.js';
import { ShieldIcon, BellIcon, XIcon } from './Icons.jsx';

export default function SmsDrawer({ open, onClose, messages, householdId, token, setToken, onDeleted }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [otpError, setOtpError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!open) return null;

  const list = Array.isArray(messages) ? messages : [];
  const unread = list.filter((m) => m && m.read === false).length;

  async function sendOtp() {
    setOtpError('');
    setOtpStatus('');
    setBusy(true);
    try {
      await apiFetch('/api/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
      setSent(true);
      setOtpStatus('Code sent (simulated)');
    } catch (err) {
      setOtpError(err.message || 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setOtpError('');
    setOtpStatus('');
    setBusy(true);
    try {
      const res = await apiFetch('/api/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) });
      setToken(res.token);
      setOtpStatus('Verified');
    } catch (err) {
      setOtpError(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    if (!householdId) return;
    if (!window.confirm('Delete all of your household data? This cannot be undone.')) return;
    setDeleteError('');
    setBusy(true);
    try {
      await deleteMyData(householdId, token);
    } catch (err) {
      setDeleteError(err.message || 'Could not delete data. Your local data is kept.');
      return;
    } finally {
      setBusy(false);
    }
    // Only reached after the server confirmed the delete.
    if (onDeleted) onDeleted();
  }

  const inputCls = 'w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none';
  const btnCls = 'rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-sm border-l border-slate-200 p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BellIcon className="h-5 w-5 text-emerald-600" />
            SMS Alerts & Updates
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <XIcon />
          </button>
        </header>

        <section className="rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldIcon className="h-4 w-4 text-emerald-600" />
            Verify your phone
          </h3>
          <input className={inputCls} type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="button" className={btnCls} disabled={busy || !phone} onClick={sendOtp}>Send OTP</button>
          {sent && (
            <div className="space-y-2">
              <input className={inputCls} type="text" inputMode="numeric" placeholder="Enter code" value={otp} onChange={(e) => setOtp(e.target.value)} />
              <button type="button" className={btnCls} disabled={busy || !otp} onClick={verifyOtp}>Verify</button>
            </div>
          )}
          {otpStatus && <p className="text-sm text-emerald-700">{otpStatus}</p>}
          {otpError && <p className="text-sm text-red-600" role="alert">{otpError}</p>}
        </section>

        <section className="rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Messages <span className="ml-1 text-xs text-slate-500">({unread} unread)</span>
          </h3>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts yet</p>
          ) : (
            <ul className="space-y-2">
              {list.map((item, i) => (
                <li key={item.id ?? i} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 text-sm text-slate-700">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-slate-300' : 'bg-emerald-500'}`}
                    aria-label={item.read ? 'Read' : 'Unread'}
                  />
                  <span>{item.text ?? item.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <button
            type="button"
            disabled={busy || !householdId}
            onClick={deleteData}
            className="w-full rounded-2xl border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Delete My Data
          </button>
          {deleteError && <p className="text-sm text-red-600" role="alert">{deleteError}</p>}
        </section>
      </aside>
    </div>
  );
}
