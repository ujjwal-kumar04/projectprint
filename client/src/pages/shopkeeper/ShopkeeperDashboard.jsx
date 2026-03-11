import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';
import api from '../../api/axios';
import ContactAdmin from '../../components/ContactAdmin';
import PassportEditor from '../../components/PassportEditor';
import { useAuth } from '../../context/AuthContext';

// ── Upload Card ───────────────────────────────────────────────────
function UploadCard({ upload, onSelect, onDelete, serverBase }) {
  const isImage = upload.fileType === 'image';
  const src     = `${serverBase}/${upload.filePath}`;

  return (
    <div className="card overflow-hidden group hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-36 bg-gray-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
        onClick={() => isImage && onSelect(upload)}
      >
        {isImage ? (
          <img
            src={src}
            alt={upload.customerName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <span className="text-4xl">📄</span>
            <span className="text-xs font-medium">PDF File</span>
          </div>
        )}
        {isImage && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
              Open Editor
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-gray-900 text-sm truncate">{upload.customerName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(upload.createdAt).toLocaleString('en-PK', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </p>
        <div className="flex gap-2 mt-3">
          {isImage && (
            <button
              onClick={() => onSelect(upload)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition"
            >
              🖼 Edit
            </button>
          )}
          <a
            href={src}
            download
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium transition"
          >
            ⬇ Download
          </a>
          <button
            onClick={() => onDelete(upload._id)}
            className="text-xs py-1.5 px-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
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
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  Customer Uploads
                  <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>
                </h2>
                <button onClick={() => fetchUploads(1)} className="btn-secondary text-xs py-1.5 px-3">
                  🔄 Refresh
                </button>
              </div>

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {uploads.map((upload) => (
                      <UploadCard
                        key={upload._id}
                        upload={upload}
                        serverBase={SERVER_BASE}
                        onSelect={setSelectedUpload}
                        onDelete={handleDelete}
                      />
                    ))}
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
              <div className="hidden lg:block w-52 shrink-0 sticky top-24">
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
