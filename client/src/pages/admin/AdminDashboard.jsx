import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Create Shopkeeper Modal ───────────────────────────────────────
function CreateShopkeeperModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', shopName: '', phone: '' });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/admin/shopkeepers', form);
      toast.success('Shopkeeper created!');
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shopkeeper');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Add New Shopkeeper</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Ahmed Khan' },
            { label: 'Shop Name *', key: 'shopName', type: 'text', placeholder: 'Star Photo Studio' },
            { label: 'Email *',    key: 'email', type: 'email', placeholder: 'ahmed@example.com' },
            { label: 'Password *', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
            { label: 'Phone',      key: 'phone', type: 'tel', placeholder: '+92 300 1234567' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                required={label.endsWith('*')}
                className="input"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Creating…' : 'Create Shopkeeper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QR Modal ─────────────────────────────────────────────────────
function QRModal({ shop, onClose }) {
  const uploadUrl = `${window.location.origin}/upload?shopId=${shop.shopId}`;
  const canvasRef = useRef(null);

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${shop.shopName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">QR Code — {shop.shopName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50">
            <QRCodeCanvas
              id="qr-canvas"
              value={uploadUrl}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: '',
                excavate: false,
              }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 break-all px-2">{uploadUrl}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button onClick={downloadQR} className="btn-primary flex-1">
              ⬇ Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shopkeepers, setShopkeepers] = useState([]);
  const [stats, setStats]             = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [qrTarget, setQrTarget]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [skRes, statsRes] = await Promise.all([
        api.get('/admin/shopkeepers'),
        api.get('/admin/stats'),
      ]);
      setShopkeepers(skRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleActive = async (id) => {
    try {
      const { data } = await api.patch(`/admin/shopkeepers/${id}/toggle`);
      setShopkeepers((prev) =>
        prev.map((s) => s._id === id ? { ...s, isActive: data.isActive } : s)
      );
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const deleteShopkeeper = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This will also delete all their customer uploads.`)) return;
    try {
      await api.delete(`/admin/shopkeepers/${id}`);
      setShopkeepers((prev) => prev.filter((s) => s._id !== id));
      toast.success('Shopkeeper deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = shopkeepers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.shopName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">PhotoPass Pro</span>
            <span className="hidden sm:block ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Shopkeepers" value={stats?.total}
            color="bg-blue-100" icon={<span className="text-blue-600 text-xl">🏪</span>} />
          <StatCard label="Active Shops" value={stats?.active}
            color="bg-green-100" icon={<span className="text-green-600 text-xl">✅</span>} />
          <StatCard label="Total Uploads" value={stats?.totalUploads}
            color="bg-purple-100" icon={<span className="text-purple-600 text-xl">📷</span>} />
          <StatCard label="Today's Uploads" value={stats?.todayUploads}
            color="bg-orange-100" icon={<span className="text-orange-600 text-xl">📅</span>} />
        </div>

        {/* Shopkeepers Table */}
        <div className="card">
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Shopkeepers</h2>
              <p className="text-sm text-gray-500 mt-0.5">{shopkeepers.length} total registered</p>
            </div>
            <div className="flex gap-3">
              <input
                type="search"
                placeholder="Search shopkeepers…"
                className="input max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button onClick={() => setShowCreate(true)} className="btn-primary whitespace-nowrap">
                + Add Shopkeeper
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-3">🏪</div>
              {search ? 'No shopkeepers match your search.' : 'No shopkeepers yet. Add one to get started!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {['Shopkeeper', 'Shop Name', 'Email', 'Phone', 'Uploads', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((sk) => (
                    <tr key={sk._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{sk.name}</td>
                      <td className="px-4 py-3 text-gray-600">{sk.shopName}</td>
                      <td className="px-4 py-3 text-gray-600">{sk.email}</td>
                      <td className="px-4 py-3 text-gray-500">{sk.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-600">{sk.uploadCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        {sk.isActive
                          ? <span className="badge-active">Active</span>
                          : <span className="badge-inactive">Inactive</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQrTarget(sk)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition"
                            title="Show QR Code"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => toggleActive(sk._id)}
                            className={`text-xs px-2 py-1 rounded font-medium transition ${
                              sk.isActive
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {sk.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteShopkeeper(sk._id, sk.name)}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateShopkeeperModal
          onClose={() => setShowCreate(false)}
          onCreated={(sk) => setShopkeepers((prev) => [{ ...sk, uploadCount: 0 }, ...prev])}
        />
      )}
      {qrTarget && <QRModal shop={qrTarget} onClose={() => setQrTarget(null)} />}
    </div>
  );
}
