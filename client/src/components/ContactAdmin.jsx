import emailjs from '@emailjs/browser';
import { useState } from 'react';
import toast from 'react-hot-toast';

// ── EmailJS credentials from Vite environment variables ───────────
// Set these in client/.env  (copy from client/.env.example)
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@photopass.com';

const MAX_CHARS = 500;

const SUBJECTS = [
  'Technical Issue',
  'Billing / Subscription',
  'Account Problem',
  'Feature Request',
  'General Enquiry',
  'Other',
];

export default function ContactAdmin({ user }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [sent,    setSent]    = useState(false);

  // Show email if available, otherwise phone number
  const contact = user?.email || user?.phone || '—';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject)
      return toast.error('Please select a subject');
    if (!message.trim())
      return toast.error('Please enter a message');
    if (message.length > MAX_CHARS)
      return toast.error(`Message must be ${MAX_CHARS} characters or less`);

    // Guard: remind developer to configure EmailJS
    if (
      !SERVICE_ID  || SERVICE_ID  === 'YOUR_SERVICE_ID'  ||
      !TEMPLATE_ID || TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
      !PUBLIC_KEY  || PUBLIC_KEY  === 'YOUR_PUBLIC_KEY'
    ) {
      toast.error('EmailJS is not configured yet. Fill in client/.env with your credentials.');
      return;
    }

    setBusy(true);
    try {
      // ── @emailjs/browser v4 API ───────────────────────────────
      // 4th argument MUST be an options object { publicKey }, NOT a plain string
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name:  user?.name     || 'Shopkeeper',
          contact,                          // email or phone
          shop_name:  user?.shopName || '',
          subject,
          message:    message.trim(),
          to_email:   ADMIN_EMAIL,
        },
        { publicKey: PUBLIC_KEY }           // ← correct v4 format
      );

      setSent(true);
      setSubject('');
      setMessage('');
      toast.success('✅ Message sent to admin!');
    } catch (err) {
      console.error('EmailJS error:', err);
      const detail = err?.text || err?.message || 'Unknown error';
      toast.error(`Failed to send: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const remaining = MAX_CHARS - message.length;

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contact Admin</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Send a message directly to the PhotoPass Pro administrator.
            </p>
          </div>
        </div>

        {/* ── Success State ─────────────────────────────────────── */}
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Message Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">The admin will get back to you soon.</p>
            <button onClick={() => setSent(false)} className="btn-secondary">
              Send Another Message
            </button>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Sender info (read-only) */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {[
                { label: 'Your Name', value: user?.name },
                { label: 'Shop Name', value: user?.shopName },
                { label: user?.email ? 'Email' : 'Mobile', value: contact },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value || '—'}</span>
                </div>
              ))}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">— Select a subject —</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                maxLength={MAX_CHARS}
                className="input resize-none"
                placeholder="Describe your issue or question in detail…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className={`text-xs mt-1 text-right ${remaining < 50 ? 'text-red-500' : 'text-gray-400'}`}>
                {remaining} characters remaining
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3"
            >
              {busy ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Sending…
                </span>
              ) : '📨 Send Message to Admin'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Delivered via EmailJS — no backend server required.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
