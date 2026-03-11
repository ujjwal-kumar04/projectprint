import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';
import api from '../../api/axios';
import ContactAdmin from '../../components/ContactAdmin';
import PassportEditor from '../../components/PassportEditor';
import { useAuth } from '../../context/AuthContext';

// ── Upload Row (table row) ────────────────────────────────────────
function UploadRow({ index, upload, onSelect, onDelete, onPrint, serverBase }) {
  const isImage = upload.fileType === 'image';
  const src     = `${serverBase}/${upload.filePath}`;

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
      {/* # */}
      <td className="px-4 py-2 text-sm text-gray-400 text-center">{index}</td>

      {/* Thumbnail */}
      <td className="px-4 py-2">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer"
             onClick={() => isImage && onSelect(upload)}>
          {isImage ? (
            <img src={src} alt={upload.customerName}
                 className="w-full h-full object-cover hover:scale-110 transition-transform" loading="lazy" />
          ) : (
            <span className="text-2xl">📄</span>
          )}
        </div>
      </td>

      {/* Customer Name */}
      <td className="px-4 py-2 font-medium text-gray-900">{upload.customerName}</td>

      {/* File Type */}
      <td className="px-4 py-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isImage ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {isImage ? '🖼 Image' : '📄 PDF'}
        </span>
      </td>

      {/* File Size */}
      <td className="px-4 py-2 text-sm text-gray-500">
        {upload.fileSize ? `${(upload.fileSize / 1024).toFixed(0)} KB` : '—'}
      </td>

      {/* Date */}
      <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
        {new Date(upload.createdAt).toLocaleString('en-PK', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}
      </td>

      {/* Actions */}
      <td className="px-4 py-2 no-print">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isImage && (
            <button onClick={() => onSelect(upload)}
              className="text-xs px-2 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition">
              🖼 Edit
            </button>
          )}
          <a href={src} target="_blank" rel="noreferrer"
            className="text-xs px-2 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition">
            👁 Open
          </a>
          <a href={src} download target="_blank" rel="noreferrer"
            className="text-xs px-2 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-800 font-medium transition">
            ⬇ Save
          </a>
          <button onClick={() => onPrint(src, upload.customerName, isImage)}
            className="text-xs px-2 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition">
            🖨️ Print
          </button>
          <button onClick={() => onDelete(upload._id)}
            className="text-xs px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition">
            🗑 Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── QR Code Sidebar ───────────────────────────────────────────────
function QRSidebar({ shopId, shopName }) {
  const uploadUrl = `${window.location.origin}/upload?shopId=${shopId}`;
  const downloadQR = () => {
    const canvas = document.getElementById('sk-qr-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${shopName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  return (
    <div className="card p-5 flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-gray-700">Your Customer QR Code</p>
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
        <QRCodeCanvas id="sk-qr-canvas" value={uploadUrl} size={140} level="H" includeMargin />
      </div>
      <p className="text-xs text-gray-400 text-center break-all">{uploadUrl}</p>
      <button onClick={downloadQR} className="btn-primary w-full text-xs py-2">⬇ Download QR</button>
    </div>
  );
}

// ── Main Shopkeeper Dashboard ─────────────────────────────────────
export default function ShopkeeperDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [uploads, setUploads]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('uploads');   // 'uploads' | 'contact'
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [newBadge, setNewBadge]     = useState(0);

  const SERVER_BASE = import.meta.env.DEV ? '' : '';   // proxied by Vite in dev

  const fetchUploads = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/shopkeeper/uploads?page=${p}&limit=20`);
      setUploads((prev) => p === 1 ? data.uploads : [...prev, ...data.uploads]);
      setTotal(data.total);
      setPage(p);
    } catch {
      toast.error('Could not load uploads');
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket.IO — real-time new uploads
  useEffect(() => {
    if (!user?.shopId) return;
    fetchUploads(1);

    const socket = socketIO('/', { path: '/socket.io', transports: ['websocket'] });
    socket.on('connect',    () => socket.emit('join-shop', user.shopId));
    socket.on('new-upload', (upload) => {
      setUploads((prev) => [upload, ...prev]);
      setTotal((t) => t + 1);
      setNewBadge((n) => n + 1);
      toast.success(`📷 New upload from ${upload.customerName}!`);
    });
    return () => socket.disconnect();
  }, [user?.shopId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this upload?')) return;
    try {
      await api.delete(`/shopkeeper/uploads/${id}`);
      setUploads((prev) => prev.filter((u) => u._id !== id));
      setTotal((t) => t - 1);
      toast.success('Upload deleted');
    } catch {
      toast.error('Could not delete');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${total} uploads? This cannot be undone.`)) return;
    try {
      // delete all one by one using existing per-item endpoint
      await Promise.all(uploads.map((u) => api.delete(`/shopkeeper/uploads/${u._id}`)));
      setUploads([]);
      setTotal(0);
      toast.success('All uploads deleted');
    } catch {
      toast.error('Could not delete all uploads');
    }
  };

  // Open a print-preview window for a single file (image or PDF)
  const handlePrintRow = (src, name, isImage) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) { toast.error('Allow pop-ups to use row print'); return; }
    if (isImage) {
      win.document.write(`
        <html><head><title>Print — ${name}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { display:flex; align-items:center; justify-content:center;
                 min-height:100vh; background:#fff; }
          img  { max-width:100%; max-height:100vh; object-fit:contain; }
          @media print { body { margin:0; } img { width:100%; height:auto; } }
        </style></head>
        <body>
          <img src="${src}" onload="window.focus();window.print();" />
        </body></html>
      `);
    } else {
      // Embed PDF in iframe so browser print dialog opens for it
      win.document.write(`
        <html><head><title>Print — ${name}</title>
        <style>
          * { margin:0; padding:0; }
          html, body { width:100%; height:100%; overflow:hidden; }
          iframe { width:100%; height:100%; border:none; }
        </style></head>
        <body>
          <iframe src="${src}" id="pdfFrame"></iframe>
          <script>
            document.getElementById('pdfFrame').onload = function() {
              try { this.contentWindow.focus(); this.contentWindow.print(); }
              catch(e) { window.print(); }
            };
          <\/script>
        </body></html>
      `);
    }
    win.document.close();
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const TABS = [
    { key: 'uploads', label: 'Customer Uploads', icon: '📷' },
    { key: 'contact', label: 'Contact Admin',    icon: '✉️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">PP</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-gray-900 leading-none">{user?.shopName}</p>
              <p className="text-xs text-gray-400">{user?.name}</p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); if (tab.key === 'uploads') setNewBadge(0); }}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.key === 'uploads' && newBadge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {newBadge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'uploads' && (
          <div className="flex gap-6 items-start">
            {/* Upload Grid */}
            <div className="flex-1 min-w-0">
              {/* Print styles — only active when window.print() is called */}
              <style>{`
                @media print {
                  header, .no-print, .qr-sidebar { display: none !important; }
                  body { background: white !important; }
                  .print-table { font-size: 12px; }
                  .print-table th, .print-table td { padding: 6px 10px !important; }
                }
              `}</style>

              <div className="flex items-center justify-between mb-5 no-print">
                <h2 className="text-lg font-semibold text-gray-900">
                  Customer Uploads
                  <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>
                </h2>
                <div className="flex gap-2">
                  {uploads.length > 0 && (
                    <button onClick={handleDeleteAll}
                      className="text-xs py-1.5 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition">
                      🗑 Delete All
                    </button>
                  )}
                  <button onClick={() => window.print()}
                    className="btn-secondary text-xs py-1.5 px-3">
                    🖨️ Print
                  </button>
                  <button onClick={() => fetchUploads(1)} className="btn-secondary text-xs py-1.5 px-3">
                    🔄 Refresh
                  </button>
                </div>
              </div>
              {/* Print-only heading */}
              <h2 className="hidden print:block text-lg font-bold mb-3">
                Customer Uploads — {user?.shopName}
              </h2>

              {loading && uploads.length === 0 ? (
                <div className="flex justify-center items-center h-52">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : uploads.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-6xl mb-4">📭</span>
                  <p className="font-medium text-gray-600">No uploads yet</p>
                  <p className="text-sm mt-1">Share your QR code with customers to receive photos.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm print-table">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left">
                          {['#', 'Photo', 'Customer Name', 'Type', 'Size', 'Date', 'Actions'].map((h) => (
                            <th key={h}
                              className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider${
                                h === 'Actions' ? ' no-print' : ''
                              }`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploads.map((upload, i) => (
                          <UploadRow
                            key={upload._id}
                            index={i + 1}
                            upload={upload}
                            serverBase={SERVER_BASE}
                            onSelect={setSelectedUpload}
                            onDelete={handleDelete}
                            onPrint={handlePrintRow}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {uploads.length < total && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={() => fetchUploads(page + 1)}
                        disabled={loading}
                        className="btn-secondary"
                      >
                        {loading ? 'Loading…' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* QR Sidebar */}
            {user?.shopId && (
              <div className="hidden lg:block w-52 shrink-0 sticky top-24 qr-sidebar no-print">
                <QRSidebar shopId={user.shopId} shopName={user.shopName} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <ContactAdmin user={user} />
        )}
      </main>

      {/* Passport Photo Editor Modal */}
      {selectedUpload && (
        <PassportEditor
          upload={selectedUpload}
          serverBase={SERVER_BASE}
          onClose={() => setSelectedUpload(null)}
        />
      )}
    </div>
  );
}
