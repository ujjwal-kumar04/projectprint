import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

export default function UploadPage() {
  const [params]  = useSearchParams();
  const shopId    = params.get('shopId');

  const [shopName, setShopName]   = useState('');
  const [valid,    setValid]      = useState(null);   // null=loading, true, false
  const [name,     setName]       = useState('');
  const [file,     setFile]       = useState(null);
  const [preview,  setPreview]    = useState(null);
  const [busy,     setBusy]       = useState(false);
  const [done,     setDone]       = useState(false);
  const fileRef = useRef();

  // Verify shopId on mount
  useEffect(() => {
    if (!shopId) { setValid(false); return; }
    axios.get(`/api/upload/verify/${shopId}`)
      .then(({ data }) => { setShopName(data.shopName); setValid(true); })
      .catch(() => setValid(false));
  }, [shopId]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    if (!file)        return toast.error('Please select a photo or PDF');

    setBusy(true);
    const fd = new FormData();
    fd.append('shopId',       shopId);
    fd.append('customerName', name.trim());
    fd.append('photo',        file);

    try {
      await axios.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────
  if (valid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Invalid Shop ───────────────────────────────────────────────
  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid QR Code</h1>
          <p className="text-gray-500 text-sm">
            This link is invalid or the shop is currently inactive.<br />
            Please contact the shopkeeper for a new QR code.
          </p>
        </div>
      </div>
    );
  }

  // ── Success State ─────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl shadow-xl p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Successful!</h1>
          <p className="text-gray-500 mb-6">
            Your photo has been sent to <strong>{shopName}</strong>.<br />
            The shopkeeper will process it shortly.
          </p>
          <button
            onClick={() => { setDone(false); setName(''); setFile(null); setPreview(null); fileRef.current.value = ''; }}
            className="btn-primary w-full py-3"
          >
            Upload Another Photo
          </button>
        </div>
      </div>
    );
  }

  // ── Upload Form ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 bg-white rounded-2xl shadow-lg items-center justify-center mb-3">
            <svg className="w-9 h-9 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{shopName}</h1>
          <p className="text-blue-200 text-sm mt-1">Upload your passport photo</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                className="input text-base"
                placeholder="e.g. Ahmed Ali Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo or PDF *
                <span className="ml-1 text-xs text-gray-400">(Max 10MB)</span>
              </label>

              {/* Custom file button */}
              <div
                onClick={() => fileRef.current.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {preview ? (
                  <img src={preview} alt="preview" className="mx-auto max-h-40 rounded-lg object-contain" />
                ) : file ? (
                  <div className="flex flex-col items-center gap-2 text-blue-600">
                    <span className="text-4xl">📄</span>
                    <p className="text-sm font-medium">{file.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <span className="text-4xl">📷</span>
                    <p className="text-sm">Tap to select photo or PDF</p>
                    <p className="text-xs">JPEG, PNG, WebP or PDF</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3 text-base"
            >
              {busy ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Uploading…
                </span>
              ) : '📤 Submit Photo'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4">Powered by PhotoPass Pro</p>
      </div>
    </div>
  );
}
