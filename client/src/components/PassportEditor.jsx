import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ImageEditor from 'tui-image-editor';
import 'tui-image-editor/dist/tui-image-editor.css';

// ── Passport photo constants (300 DPI)  ────────────────────────────────────────
// 3.5cm × 4.5cm at 300dpi = (3.5/2.54*300) × (4.5/2.54*300) = 413 × 531 px
const PP_W  = 413;   // passport photo width  (px @ 300 DPI)
const PP_H  = 531;   // passport photo height (px @ 300 DPI)
const COLS  = 6;     // photos per row
const ROWS  = 2;     // rows on A4
const PAD   = 30;    // padding between & around photos (px)

// Visible preview is scaled down for the UI but the download canvas is full-res
const PREVIEW_SCALE = 0.35;

// ── Helpers ─────────────────────────────────────────────────────────────────────
/** Draw an image (with transparent bg) onto a canvas with a solid background color */
function compositeOnCanvas(imageBitmap, bgColor, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  return canvas;
}

/** Build the final A4 grid canvas with 6×2 passport photos */
function buildGridCanvas(composited) {
  const gridW = COLS * PP_W  + (COLS + 1) * PAD;
  const gridH = ROWS * PP_H  + (ROWS + 1) * PAD;
  const canvas = document.createElement('canvas');
  canvas.width  = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, gridW, gridH);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = PAD + col * (PP_W + PAD);
      const y = PAD + row * (PP_H + PAD);
      ctx.drawImage(composited, x, y, PP_W, PP_H);
    }
  }
  return canvas;
}

/** Canvas → blob → object URL */
function canvasToObjectURL(canvas, type = 'image/jpeg', quality = 0.95) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(URL.createObjectURL(b)), type, quality));
}

// ── TUI Photo Editor Tab ──────────────────────────────────────
function TuiEditorTab({ imageUrl }) {
  const containerRef = useRef(null);
  const editorRef    = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = new ImageEditor(containerRef.current, {
      includeUI: {
        loadImage: { path: imageUrl, name: 'Photo' },
        menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'text', 'filter'],
        initMenu: 'filter',
        uiSize: { width: '100%', height: '560px' },
        menuBarPosition: 'bottom',
      },
      cssMaxWidth: 700,
      cssMaxHeight: 500,
      usageStatistics: false,
    });
    editorRef.current = editor;
    return () => { try { editor.destroy(); } catch { /* already destroyed */ } };
  }, [imageUrl]);

  const handleDownload = () => {
    if (!editorRef.current) return;
    const dataUrl = editorRef.current.toDataURL();
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = 'edited-photo.png';
    a.click();
    toast.success('Photo downloaded!');
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} />
      <div className="flex justify-end pt-1">
        <button
          onClick={handleDownload}
          className="btn-primary text-sm px-5">
          ⬇ Download Edited Photo
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PassportEditor({ upload, serverBase, onClose }) {
  const imageUrl = `${serverBase}/${upload.filePath}`;
  const [activeTab, setActiveTab] = useState('passport'); // 'passport' | 'editor'

  const [step, setStep]               = useState('original'); // original | removing | preview | grid
  const [bgColor, setBgColor]         = useState('#ffffff');
  const [processedBitmap, setProcessedBitmap] = useState(null);  // ImageBitmap without background
  const [originalBitmap,  setOriginalBitmap]  = useState(null);
  const [gridUrl,  setGridUrl]        = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [removing, setRemoving]       = useState(false);
  const [buildingGrid, setBuildingGrid] = useState(false);
  const downloadRef = useRef(null);

  // Load image as bitmap when modal opens
  useEffect(() => {
    let objectUrl;
    (async () => {
      try {
        const res    = await fetch(imageUrl);
        const blob   = await res.blob();
        objectUrl    = URL.createObjectURL(blob);
        const bitmap = await createImageBitmap(await (await fetch(objectUrl)).blob());
        setOriginalBitmap(bitmap);
      } catch {
        toast.error('Could not load image');
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageUrl]);

  // Whenever bgColor or processedBitmap changes, regenerate the single-photo preview
  useEffect(() => {
    if (!processedBitmap) return;
    const canvas = compositeOnCanvas(processedBitmap, bgColor, PP_W, PP_H);
    canvasToObjectURL(canvas, 'image/png', 1).then((url) => {
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    });
  }, [processedBitmap, bgColor]);

  // ── Background removal using @imgly/background-removal (free, in-browser) ──
  const removeBackground = useCallback(async () => {
    if (removing) return;
    setRemoving(true);
    setStep('removing');
    try {
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      const res    = await fetch(imageUrl);
      const blob   = await res.blob();
      // publicPath → model files served from unpkg CDN
      const result = await removeBg(blob, {
        publicPath: 'https://unpkg.com/@imgly/background-removal@1.4.5/dist/',
        output: { format: 'image/png', quality: 1 },
      });
      const bitmap = await createImageBitmap(result);
      setProcessedBitmap(bitmap);
      setStep('preview');
      toast.success('Background removed!');
    } catch (err) {
      console.error(err);
      toast.error('Background removal failed. Using original image.');
      if (originalBitmap) { setProcessedBitmap(originalBitmap); setStep('preview'); }
    } finally {
      setRemoving(false);
    }
  }, [imageUrl, removing, originalBitmap]);

  // ── Build 6-photo grid ────────────────────────────────────────────────────
  const buildGrid = useCallback(async () => {
    if (!processedBitmap) return;
    setBuildingGrid(true);
    try {
      const single = compositeOnCanvas(processedBitmap, bgColor, PP_W, PP_H);
      const grid   = buildGridCanvas(single);
      const url    = await canvasToObjectURL(grid, 'image/jpeg', 0.95);
      setGridUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
      setStep('grid');
    } catch {
      toast.error('Could not build grid');
    } finally {
      setBuildingGrid(false);
    }
  }, [processedBitmap, bgColor]);

  // ── Download as PDF ───────────────────────────────────────────────────────
  const downloadPDF = useCallback(async () => {
    if (!processedBitmap) return;
    try {
      const { jsPDF } = await import('jspdf');
      // A4 in mm, landscape would need 210×297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const single   = compositeOnCanvas(processedBitmap, bgColor, PP_W, PP_H);
      const gridCnv  = buildGridCanvas(single);
      const dataUrl  = gridCnv.toDataURL('image/jpeg', 0.95);

      // Fit grid to A4 width (210mm) with a 5mm margin
      const margin = 5;
      const imgW   = 210 - margin * 2;
      // maintain aspect ratio
      const imgH   = imgW * (gridCnv.height / gridCnv.width);
      pdf.addImage(dataUrl, 'JPEG', margin, margin, imgW, Math.min(imgH, 297 - margin * 2));
      pdf.save(`passport-photos-${upload.customerName}.pdf`);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF download failed');
    }
  }, [processedBitmap, bgColor, upload.customerName]);

  // ── Download JPG ──────────────────────────────────────────────────────────
  const downloadJPG = () => {
    if (!gridUrl) return;
    const a = document.createElement('a');
    a.href     = gridUrl;
    a.download = `passport-photos-${upload.customerName}.jpg`;
    a.click();
    toast.success('JPG downloaded!');
  };

  // PRESET background colors
  const presetColors = ['#ffffff', '#87ceeb', '#003580', '#f0f0f0', '#d4edda', '#fff3cd'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Photo Editor</h2>
            <p className="text-sm text-gray-400 mt-0.5">Customer: {upload.customerName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          {[{ key: 'passport', label: '🪪 Passport Grid' }, { key: 'editor', label: '✏️ Photo Editor' }].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* TUI editor tab */}
          {activeTab === 'editor' && <TuiEditorTab imageUrl={imageUrl} />}

          {/* Passport grid tab */}
          {activeTab === 'passport' && (<>
          {/* Step 1 — Original + Remove BG */}
          {(step === 'original' || step === 'removing') && (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-3">Original Photo</p>
                <img
                  src={imageUrl}
                  alt="original"
                  crossOrigin="anonymous"
                  className="max-h-72 rounded-xl border object-contain mx-auto"
                />
              </div>
              <div className="flex-none sm:self-center sm:w-56 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">1. Remove Background</p>
                  <p className="text-xs text-gray-400 mb-3">Uses AI in your browser — no API key needed. First run downloads ~50MB of AI model from CDN.</p>
                  <button
                    onClick={removeBackground}
                    disabled={removing}
                    className="btn-primary w-full"
                  >
                    {removing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Removing…
                      </span>
                    ) : '✂️ Remove Background'}
                  </button>
                </div>
                <p className="text-xs text-gray-300 text-center">— or —</p>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Skip removal and use original:</p>
                  <button
                    onClick={() => { setProcessedBitmap(originalBitmap); setStep('preview'); }}
                    disabled={!originalBitmap}
                    className="btn-secondary w-full text-sm"
                  >
                    Use Original → Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Preview + Color Picker */}
          {(step === 'preview' || step === 'grid') && (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Live preview */}
              <div className="flex-1 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-700 mb-3 self-start">Single Photo Preview (3.5 × 4.5 cm)</p>
                <div
                  className="rounded-xl border-2 border-dashed border-gray-200 overflow-hidden"
                  style={{
                    width:  PP_W  * PREVIEW_SCALE,
                    height: PP_H  * PREVIEW_SCALE,
                    background: bgColor,
                  }}
                >
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex-none sm:w-64 space-y-5">
                {/* Background color */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Background Color</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        title={c}
                        onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          bgColor === c ? 'border-blue-500 scale-125' : 'border-gray-300'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setBgColor(e.target.value)}
                      className="input flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Generate grid */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">2. Generate 6-Photo Grid</p>
                  <p className="text-xs text-gray-400 mb-3">Creates a print-ready layout with 6 photos arranged in 2 rows of 3.</p>
                  <button
                    onClick={buildGrid}
                    disabled={buildingGrid}
                    className="btn-primary w-full"
                  >
                    {buildingGrid ? 'Building…' : '🖨 Generate Print Grid'}
                  </button>
                </div>

                {/* Back */}
                <button
                  onClick={() => { setStep('original'); setProcessedBitmap(null); setGridUrl(null); }}
                  className="btn-secondary w-full text-sm"
                >
                  ← Back to Original
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Grid Preview + Download */}
          {step === 'grid' && gridUrl && (
            <div className="border-t pt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Print-Ready Grid (6 Passport Photos)</p>
              <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
                <img
                  src={gridUrl}
                  alt="passport grid"
                  className="mx-auto rounded shadow-sm"
                  style={{ maxWidth: '100%' }}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={downloadJPG} className="btn-primary flex-1 min-w-[140px]">
                  ⬇ Download JPG
                </button>
                <button onClick={downloadPDF} className="btn-secondary flex-1 min-w-[140px]">
                  ⬇ Download PDF
                </button>
                <button
                  onClick={buildGrid}
                  className="btn-secondary flex-1 min-w-[140px]"
                >
                  🔄 Regenerate
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                High-resolution JPG / PDF ready for professional printing at {PP_W} × {PP_H} px (300 DPI) per photo.
              </p>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}
