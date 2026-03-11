import emailjs from '@emailjs/browser';
import { useState } from 'react';
import toast from 'react-hot-toast';

// ── EmailJS Configuration ─────────────────────────────────────────
// 1. Sign up at https://www.emailjs.com  (free: 200 emails/month)
// 2. Add an Email Service (Gmail / Outlook)
// 3. Create a Template with variables:
//      {{from_name}}  {{from_email}}  {{shop_name}}  {{message}}  {{to_email}}
// 4. Replace the values below:
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const ADMIN_EMAIL         = 'admin@photopass.com';

export default function ContactAdmin({ user }) {
  const [message, setMessage] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return toast.error('Please enter a message');
    setBusy(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name:  user?.name      || 'Shopkeeper',
          from_email: user?.email     || '',
          shop_name:  user?.shopName  || '',
          message:    message.trim(),
          to_email:   ADMIN_EMAIL,
        },
        EMAILJS_PUBLIC_KEY
      );
      setSent(true);
      setMessage('');
      toast.success('Message sent to admin!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message. Please check your EmailJS configuration.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8">
        {/* Icon */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-2xl">✉️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contact Admin</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Send a message directly to the PhotoPass Pro administrator.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Message Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">The admin will get back to you soon.</p>
            <button onClick={() => setSent(false)} className="btn-secondary">Send Another Message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pre-filled info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your Name</span>
                <span className="font-medium text-gray-800">{user?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shop Name</span>
                <span className="font-medium text-gray-800">{user?.shopName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800">{user?.email}</span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Message *</label>
              <textarea
                rows={5}
                required
                className="input resize-none"
                placeholder="Describe your issue or question…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/500 characters</p>
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
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
              Messages are delivered via Email.js directly to admin's inbox — no server required.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
