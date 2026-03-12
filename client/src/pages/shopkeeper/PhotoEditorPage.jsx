// import { useCallback, useEffect, useRef, useState } from 'react';
// import toast from 'react-hot-toast';
// import { useLocation, useNavigate } from 'react-router-dom';
// import ImageEditor from 'tui-image-editor';
// import 'tui-image-editor/dist/tui-image-editor.css';

// // ── TUI theme (dark header) ───────────────────────────────────────
// const TUI_THEME = {
//   'common.bi.image': '',
//   'common.bisize.width': '0px',
//   'common.bisize.height': '0px',
//   'common.backgroundColor': '#f9fafb',
//   'header.backgroundImage': 'none',
//   'header.backgroundColor': '#1e293b',
//   'header.border': '0px',
//   'submenu.backgroundColor': '#1e293b',
//   'submenu.partition.color': '#334155',
//   'menu.normalIcon.path': '',
//   'menu.activeIcon.path': '',
//   'menu.disabledIcon.path': '',
//   'menu.iconSize.width': '24px',
//   'menu.iconSize.height': '24px',
// };

// // ── DPI constant for mm→px conversion ────────────────────────────
// const DPI = 300;
// const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);

// // Preset sizes (width × height in mm)
// const PRESETS = [
//   { label: 'Passport  3.5×4.5', w: 35, h: 45 },
//   { label: 'Visa  4×5',         w: 40, h: 50 },
//   { label: 'ID Card  3×4',      w: 30, h: 40 },
//   { label: 'Custom',            w: 0,  h: 0  },
// ];

// // ── Step 1: TUI Photo Editor ─────────────────────────────────────
// function StepEditor({ src, name, onNext }) {
//   const containerRef = useRef(null);
//   const editorRef    = useRef(null);

//   useEffect(() => {
//     if (!src || !containerRef.current) return;
//     // Convert relative path to absolute so TUI can load it reliably
//     const absoluteSrc = src.startsWith('http') ? src : `${window.location.origin}${src}`;
//     const editor = new ImageEditor(containerRef.current, {
//       includeUI: {
//         loadImage: { path: absoluteSrc, name: name || 'Photo' },
//         menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'text', 'filter'],
//         initMenu: 'filter',
//         uiSize: { width: '100%', height: 'calc(100vh - 64px)' },
//         menuBarPosition: 'bottom',
//         theme: TUI_THEME,
//       },
//       cssMaxWidth:  document.documentElement.clientWidth,
//       cssMaxHeight: document.documentElement.clientHeight - 120,
//       usageStatistics: false,
//     });
//     editorRef.current = editor;
//     return () => { try { editor.destroy(); } catch { /* ok */ } };
//   }, [src, name]);

//   const handleNext = () => {
//     if (!editorRef.current) return;
//     const dataUrl = editorRef.current.toDataURL({ format: 'png' });
//     onNext(dataUrl);
//   };

//   return (
//     <div className="flex flex-col h-screen">
//       <header className="h-16 bg-slate-800 flex items-center justify-between px-5 shrink-0 z-10">
//         <p className="text-white font-medium text-sm truncate">
//           ✏️ Editing: <span className="text-blue-300">{name}</span>
//         </p>
//         <button
//           onClick={handleNext}
//           className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
//           Next: Print Layout →
//         </button>
//       </header>
//       <div ref={containerRef} className="flex-1 overflow-hidden" />
//     </div>
//   );
// }

// // ── Step 2: Grid Layout Builder ──────────────────────────────────
// function StepGrid({ editedDataUrl, name, onBack }) {
//   // Size controls (mm)
//   const [presetIdx, setPresetIdx] = useState(0);
//   const [widthMm,  setWidthMm]   = useState(35);
//   const [heightMm, setHeightMm]  = useState(45);
//   const [cols,     setCols]      = useState(6);
//   const [rows,     setRows]      = useState(2);
//   const [gap,      setGap]       = useState(4);   // mm gap between photos
//   const [bgColor,  setBgColor]   = useState('#ffffff');
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [building,   setBuilding]  = useState(false);

//   // px dimensions at 300 DPI
//   const pxW   = mmToPx(widthMm);
//   const pxH   = mmToPx(heightMm);
//   const pxGap = mmToPx(gap);

//   const applyPreset = (idx) => {
//     setPresetIdx(idx);
//     if (PRESETS[idx].w) { setWidthMm(PRESETS[idx].w); setHeightMm(PRESETS[idx].h); }
//   };

//   // Build high-res grid canvas
//   const buildCanvas = useCallback(async () => {
//     setBuilding(true);
//     try {
//       const img = await createImageBitmap(
//         await (await fetch(editedDataUrl)).blob()
//       );

//       const totalW = cols * pxW + (cols + 1) * pxGap;
//       const totalH = rows * pxH + (rows + 1) * pxGap;

//       const canvas = document.createElement('canvas');
//       canvas.width  = totalW;
//       canvas.height = totalH;
//       const ctx = canvas.getContext('2d');
//       ctx.fillStyle = bgColor;
//       ctx.fillRect(0, 0, totalW, totalH);

//       for (let r = 0; r < rows; r++) {
//         for (let c = 0; c < cols; c++) {
//           const x = pxGap + c * (pxW + pxGap);
//           const y = pxGap + r * (pxH + pxGap);
//           ctx.drawImage(img, x, y, pxW, pxH);
//         }
//       }
//       return canvas;
//     } finally {
//       setBuilding(false);
//     }
//   }, [editedDataUrl, cols, rows, pxW, pxH, pxGap, bgColor]);

//   // Live canvas preview (scaled down)
//   const previewCanvasRef = useRef(null);
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       const canvas = await buildCanvas();
//       if (cancelled || !previewCanvasRef.current) return;

//       const MAX = 600;
//       const scale = Math.min(MAX / canvas.width, MAX / canvas.height, 1);
//       const el = previewCanvasRef.current;
//       el.width  = Math.round(canvas.width  * scale);
//       el.height = Math.round(canvas.height * scale);
//       const ctx = el.getContext('2d');
//       ctx.drawImage(canvas, 0, 0, el.width, el.height);

//       // also keep a data URL for download
//       const url = canvas.toDataURL('image/jpeg', 0.95);
//       if (!cancelled) setPreviewUrl(url);
//     })();
//     return () => { cancelled = true; };
//   }, [buildCanvas]);

//   const handleDownloadJPG = () => {
//     if (!previewUrl) return;
//     const a = document.createElement('a');
//     a.href = previewUrl;
//     a.download = `grid-${name || 'photos'}.jpg`;
//     a.click();
//     toast.success('JPG downloaded!');
//   };

//   const handleDownloadPDF = async () => {
//     if (!previewUrl) return;
//     try {
//       const { jsPDF } = await import('jspdf');
//       const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
//       const canvas = await buildCanvas();
//       const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
//       const margin = 5;
//       const imgW = 210 - margin * 2;
//       const imgH = imgW * (canvas.height / canvas.width);
//       pdf.addImage(dataUrl, 'JPEG', margin, margin, imgW, Math.min(imgH, 297 - margin * 2));
//       pdf.save(`grid-${name || 'photos'}.pdf`);
//       toast.success('PDF downloaded!');
//     } catch {
//       toast.error('PDF download failed');
//     }
//   };

//   const handlePrint = async () => {
//     const canvas = await buildCanvas();
//     const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
//     const win = window.open('', '_blank', 'width=900,height=700');
//     if (!win) { toast.error('Allow pop-ups to print'); return; }
//     win.document.write(`
//       <html><head><title>Print — ${name}</title>
//       <style>
//         *{margin:0;padding:0;box-sizing:border-box}
//         body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
//         img{max-width:100%;height:auto}
//         @media print{body{margin:0}img{width:100%}}
//       </style></head>
//       <body><img src="${dataUrl}" onload="window.focus();window.print();" /></body></html>
//     `);
//     win.document.close();
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col">
//       {/* Header */}
//       <header className="h-14 bg-slate-800 flex items-center justify-between px-5 shrink-0">
//         <button onClick={onBack}
//           className="text-white/70 hover:text-white text-sm flex items-center gap-1 transition">
//           ← Back to Editor
//         </button>
//         <p className="text-white font-semibold text-sm">🖨️ Print Layout</p>
//         <div className="flex gap-2">
//           <button onClick={handlePrint}
//             className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
//             🖨️ Print
//           </button>
//           <button onClick={handleDownloadJPG}
//             className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
//             ⬇ JPG
//           </button>
//           <button onClick={handleDownloadPDF}
//             className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
//             ⬇ PDF
//           </button>
//         </div>
//       </header>

//       <div className="flex flex-1 overflow-hidden">
//         {/* ── Controls sidebar ── */}
//         <aside className="w-72 bg-white border-r overflow-y-auto p-4 space-y-5 shrink-0">

//           {/* Preset sizes */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Photo Size</p>
//             <div className="flex flex-col gap-1">
//               {PRESETS.map((p, i) => (
//                 <button key={i} onClick={() => applyPreset(i)}
//                   className={`text-left text-sm px-3 py-2 rounded-lg border transition ${
//                     presetIdx === i
//                       ? 'bg-blue-600 text-white border-blue-600'
//                       : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
//                   }`}>
//                   {p.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Width / Height */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Size (mm)</p>
//             <div className="flex gap-2">
//               <div className="flex-1">
//                 <label className="text-xs text-gray-500 mb-1 block">Width</label>
//                 <input type="number" min="10" max="200" value={widthMm}
//                   onChange={(e) => { setWidthMm(+e.target.value); setPresetIdx(3); }}
//                   className="input w-full text-sm" />
//               </div>
//               <div className="flex-1">
//                 <label className="text-xs text-gray-500 mb-1 block">Height</label>
//                 <input type="number" min="10" max="200" value={heightMm}
//                   onChange={(e) => { setHeightMm(+e.target.value); setPresetIdx(3); }}
//                   className="input w-full text-sm" />
//               </div>
//             </div>
//             <p className="text-xs text-gray-400 mt-1">{pxW} × {pxH} px @ 300 DPI</p>
//           </div>

//           {/* Columns */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
//               Columns per Row: <span className="text-blue-600 font-bold">{cols}</span>
//             </p>
//             <div className="flex items-center gap-3">
//               <button onClick={() => setCols((c) => Math.max(1, c - 1))}
//                 className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">−</button>
//               <input type="range" min="1" max="10" value={cols}
//                 onChange={(e) => setCols(+e.target.value)} className="flex-1" />
//               <button onClick={() => setCols((c) => Math.min(10, c + 1))}
//                 className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">+</button>
//             </div>
//           </div>

//           {/* Rows */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
//               Rows: <span className="text-blue-600 font-bold">{rows}</span>
//             </p>
//             <div className="flex items-center gap-3">
//               <button onClick={() => setRows((r) => Math.max(1, r - 1))}
//                 className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">−</button>
//               <input type="range" min="1" max="10" value={rows}
//                 onChange={(e) => setRows(+e.target.value)} className="flex-1" />
//               <button onClick={() => setRows((r) => Math.min(10, r + 1))}
//                 className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">+</button>
//             </div>
//           </div>

//           {/* Gap */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
//               Gap: <span className="text-blue-600 font-bold">{gap} mm</span>
//             </p>
//             <input type="range" min="0" max="20" value={gap}
//               onChange={(e) => setGap(+e.target.value)} className="w-full" />
//           </div>

//           {/* Background color */}
//           <div>
//             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Background</p>
//             <div className="flex gap-2 flex-wrap mb-2">
//               {['#ffffff','#87ceeb','#003580','#f0f0f0','#d4edda','#fff3cd'].map((c) => (
//                 <button key={c} onClick={() => setBgColor(c)}
//                   style={{ background: c }}
//                   className={`w-7 h-7 rounded-full border-2 transition-transform ${
//                     bgColor === c ? 'border-blue-500 scale-125' : 'border-gray-300'
//                   }`} />
//               ))}
//             </div>
//             <div className="flex items-center gap-2">
//               <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
//                 className="w-9 h-9 rounded cursor-pointer border border-gray-200" />
//               <input type="text" value={bgColor}
//                 onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setBgColor(e.target.value)}
//                 className="input flex-1 font-mono text-sm" />
//             </div>
//           </div>

//           {/* Summary */}
//           <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-0.5">
//             <p>📐 {widthMm}×{heightMm} mm per photo</p>
//             <p>🔢 {cols} columns × {rows} rows = {cols * rows} photos</p>
//             <p>📏 Gap: {gap} mm</p>
//           </div>
//         </aside>

//         {/* ── Live preview ── */}
//         <main className="flex-1 overflow-auto flex flex-col items-center justify-start p-6 bg-gray-100 gap-6">
//           {building ? (
//             <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mt-20" />
//           ) : (
//             <>
//               <div className="shadow-2xl rounded-xl overflow-hidden border border-gray-300">
//                 <canvas ref={previewCanvasRef} />
//               </div>

//               {/* Download & Print buttons below preview */}
//               <div className="flex gap-4">
//                 <button
//                   onClick={handleDownloadJPG}
//                   className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-base">
//                   ⬇ Download
//                 </button>
//                 <button
//                   onClick={handlePrint}
//                   className="flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-base">
//                   🖨️ Print
//                 </button>
//               </div>
//             </>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

// // ── Main Page (orchestrates steps) ───────────────────────────────
// export default function PhotoEditorPage() {
//   const location = useLocation();
//   const navigate  = useNavigate();
//   const { src, name } = location.state || {};
//   const [step, setStep]           = useState('edit');   // 'edit' | 'grid'
//   const [editedUrl, setEditedUrl] = useState(null);

//   if (!src) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
//         <p className="text-gray-500 text-lg">No image to edit.</p>
//         <button onClick={() => navigate(-1)} className="btn-secondary">← Go Back</button>
//       </div>
//     );
//   }

//   if (step === 'edit') {
//     return (
//       <StepEditor
//         src={src}
//         name={name}
//         onNext={(dataUrl) => { setEditedUrl(dataUrl); setStep('grid'); }}
//       />
//     );
//   }

//   return (
//     <StepGrid
//       editedDataUrl={editedUrl}
//       name={name}
//       onBack={() => setStep('edit')}
//     />
//   );
// }

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import ImageEditor from "tui-image-editor";
import "tui-image-editor/dist/tui-image-editor.css";

const DPI = 300;

const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);

const PRESETS = [
  { label: "Passport 3.5×4.5", w: 35, h: 45 },
  { label: "Visa 4×5", w: 40, h: 50 },
  { label: "ID Card 3×4", w: 30, h: 40 },
  { label: "Custom", w: 0, h: 0 },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ---------------- IMAGE EDITOR ---------------- */

function StepEditor({ src, name, onNext }) {
  const ref = useRef(null);
  const editor = useRef(null);

  useEffect(() => {
    if (!src || !ref.current) return;

    const instance = new ImageEditor(ref.current, {
      includeUI: {
        // Do NOT pass loadImage here — use loadImageFromURL below for reliable loading
        menu: ["crop", "flip", "rotate", "draw", "shape", "text", "filter"],
        initMenu: "filter",
        menuBarPosition: "bottom",
        uiSize: {
          width: "100%",
          height: "calc(100vh - 60px)",
        },
      },
      cssMaxWidth: window.innerWidth,
      cssMaxHeight: window.innerHeight - 120,
      usageStatistics: false,
    });

    editor.current = instance;

    // Build absolute URL so TUI can fetch it regardless of base path
    const absoluteSrc = src.startsWith("http")
      ? src
      : `${window.location.origin}${src.startsWith("/") ? src : `/${src}`}`;

    // loadImageFromURL is TUI's reliable programmatic API
    instance
      .loadImageFromURL(absoluteSrc, name || "photo")
      .catch(() => toast.error("Image load failed — check file path"));

    return () => {
      try {
        instance.destroy();
      } catch { /* ok */ }
    };
  }, [src, name]);

  const handleNext = () => {
    if (!editor.current) return;
    const data = editor.current.toDataURL();
    onNext(data);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 bg-slate-800 flex items-center justify-between px-4">
        <p className="text-white text-sm">Editing: {name}</p>

        <button
          onClick={handleNext}
          className="bg-green-600 text-white px-4 py-1 rounded"
        >
          Next →
        </button>
      </header>

      <div ref={ref} className="flex-1"></div>
    </div>
  );
}

/* ---------------- GRID BUILDER ---------------- */

const ALL_PRESETS = [
  { label: "Passport 3.5×4.5", w: 35, h: 45 },
  { label: "Visa 4×5",         w: 40, h: 50 },
  { label: "ID Card 3×4",      w: 30, h: 40 },
  { label: "Stamp 2.5×3",      w: 25, h: 30 },
  { label: "2×2 inch",         w: 51, h: 51 },
  { label: "3.5×3.5 cm",       w: 35, h: 35 },
  { label: "Custom",           w: 0,  h: 0  },
];

function StepGrid({ editedDataUrl, name, onBack }) {
  const [photoUrl,  setPhotoUrl]  = useState(editedDataUrl);
  const [removing,  setRemoving]  = useState(false);
  const [printing,  setPrinting]  = useState(false);

  const [presetIdx, setPresetIdx] = useState(0);
  const [widthMm,   setWidthMm]   = useState(35);
  const [heightMm,  setHeightMm]  = useState(45);
  const [cols,      setCols]      = useState(6);
  const [rows,      setRows]      = useState(2);
  const [gap,       setGap]       = useState(4);
  const [bgColor,   setBgColor]   = useState("#ffffff");
  const [scaleX,    setScaleX]    = useState(100); // horizontal scale %
  const [scaleY,    setScaleY]    = useState(100); // vertical scale %

  const previewRef = useRef(null);
  const mainRef    = useRef(null);

  const pxW   = mmToPx(widthMm);
  const pxH   = mmToPx(heightMm);
  const pxGap = mmToPx(gap);

  const applyPreset = (i) => {
    setPresetIdx(i);
    if (ALL_PRESETS[i].w) {
      setWidthMm(ALL_PRESETS[i].w);
      setHeightMm(ALL_PRESETS[i].h);
    }
  };

  // ── Remove background via local rembg Python API ────────────────
  const handleRemoveBg = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/rembg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: photoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const { imageBase64 } = await res.json();
      setPhotoUrl(imageBase64);
      toast.success("Background removed!");
    } catch (e) {
      toast.error(`Remove BG failed: ${e.message}`);
    } finally {
      setRemoving(false);
    }
  };

  // ── Build high-res canvas at 300 DPI (with H/V scale) ───────────
  const buildCanvas = useCallback(async () => {
    const img    = await loadImage(photoUrl);
    const spxW   = Math.round(pxW * scaleX / 100);
    const spxH   = Math.round(pxH * scaleY / 100);
    const totalW = cols * spxW  + (cols + 1) * pxGap;
    const totalH = rows * spxH  + (rows + 1) * pxGap;
    const canvas = document.createElement("canvas");
    canvas.width  = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        ctx.drawImage(img, pxGap + c * (spxW + pxGap), pxGap + r * (spxH + pxGap), spxW, spxH);
    return canvas;
  }, [photoUrl, cols, rows, pxW, pxH, pxGap, bgColor, scaleX, scaleY]);

  // ── Draw preview scaled to fit the main area (1 screen) ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = await buildCanvas();
        if (cancelled || !previewRef.current || !mainRef.current) return;
        const { clientWidth: cw, clientHeight: ch } = mainRef.current;
        const maxW  = cw - 48;
        const maxH  = ch - 48;
        const scale = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
        const el    = previewRef.current;
        el.width    = Math.round(canvas.width  * scale);
        el.height   = Math.round(canvas.height * scale);
        el.getContext("2d").drawImage(canvas, 0, 0, el.width, el.height);
      } catch { /* ok */ }
    })();
    return () => { cancelled = true; };
  }, [buildCanvas]);

  // ── Download JPG ─────────────────────────────────────────────────
  const handleDownload = async () => {
    const canvas = await buildCanvas();
    const link   = document.createElement("a");
    link.href     = canvas.toDataURL("image/jpeg", 0.95);
    link.download = `photos-${name || "grid"}.jpg`;
    link.click();
    toast.success("Downloaded!");
  };

  // ── Print (only photo, no browser chrome / scale marks) ──────────
  const handlePrint = async () => {
    setPrinting(true);
    try {
      const canvas = await buildCanvas();
      const data   = canvas.toDataURL("image/jpeg", 0.95);
      const win    = window.open("", "_blank");
      if (!win) { toast.error("Allow pop-ups to print"); return; }
      win.document.write(
        `<!DOCTYPE html><html><head><title>Print</title><style>` +
        `*{margin:0;padding:0;box-sizing:border-box}` +
        `html,body{width:100%;height:100%;background:#fff}` +
        `img{display:block;width:100%;height:auto}` +
        `@media print{` +
        `  @page{size:auto;margin:0mm}` +
        `  html,body{margin:0;padding:0}` +
        `  img{width:100%;height:auto}` +
        `}` +
        `</style></head><body>` +
        `<img src="${data}" onload="setTimeout(function(){window.focus();window.print();window.close();},300)"/>` +
        `</body></html>`
      );
      win.document.close();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

      {/* ── TOP HEADER with Print & Download ── */}
      <header className="bg-slate-800 px-4 py-2 flex items-center justify-between shrink-0 shadow-md z-10">
        <button
          onClick={onBack}
          className="text-white/70 hover:text-white text-sm transition"
        >
          ← Back
        </button>
        <span className="text-white font-semibold text-sm">🖨️ Print Layout</span>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
          >
            ⬇ Download JPG
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
          >
            {printing ? "…" : "🖨️ Print"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-64 bg-white border-r p-3 overflow-y-auto shrink-0 space-y-4">

          {/* Remove Background */}
          <button
            onClick={handleRemoveBg}
            disabled={removing}
            className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-60 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
          >
            {removing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Removing…
              </>
            ) : "✂️ Remove Background"}
          </button>

          {/* Size Presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Photo Size
            </p>
            <div className="grid grid-cols-2 gap-1">
              {ALL_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(i)}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition ${
                    presetIdx === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Width / Height */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Custom Size (mm)
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Width</label>
                <input
                  type="number" min="5" max="300" value={widthMm}
                  onChange={(e) => { setWidthMm(+e.target.value); setPresetIdx(ALL_PRESETS.length - 1); }}
                  className="border rounded px-2 py-1 text-sm w-full mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Height</label>
                <input
                  type="number" min="5" max="300" value={heightMm}
                  onChange={(e) => { setHeightMm(+e.target.value); setPresetIdx(ALL_PRESETS.length - 1); }}
                  className="border rounded px-2 py-1 text-sm w-full mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{pxW} × {pxH} px @ 300 DPI</p>
          </div>

          {/* Columns */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Columns: <span className="text-blue-600 font-bold">{cols}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCols((c) => Math.max(1, c - 1))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >−</button>
              <input
                type="range" min="1" max="10" value={cols}
                onChange={(e) => setCols(+e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => setCols((c) => Math.min(10, c + 1))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >+</button>
            </div>
          </div>

          {/* Rows */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Rows: <span className="text-blue-600 font-bold">{rows}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRows((r) => Math.max(1, r - 1))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >−</button>
              <input
                type="range" min="1" max="10" value={rows}
                onChange={(e) => setRows(+e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => setRows((r) => Math.min(10, r + 1))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >+</button>
            </div>
          </div>

          {/* Gap */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Gap: <span className="text-blue-600 font-bold">{gap} mm</span>
            </p>
            <input
              type="range" min="0" max="20" value={gap}
              onChange={(e) => setGap(+e.target.value)}
              className="w-full"
            />
          </div>

          {/* Horizontal Scale */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Horizontal Scale: <span className="text-blue-600 font-bold">{scaleX}%</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScaleX((v) => Math.max(10, v - 5))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >−</button>
              <input
                type="range" min="10" max="200" value={scaleX}
                onChange={(e) => setScaleX(+e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => setScaleX((v) => Math.min(200, v + 5))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >+</button>
            </div>
          </div>

          {/* Vertical Scale */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Vertical Scale: <span className="text-blue-600 font-bold">{scaleY}%</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScaleY((v) => Math.max(10, v - 5))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >−</button>
              <input
                type="range" min="10" max="200" value={scaleY}
                onChange={(e) => setScaleY(+e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => setScaleY((v) => Math.min(200, v + 5))}
                className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 font-bold text-base leading-none"
              >+</button>
            </div>
          </div>

          {/* Background color */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Background
            </p>
            <div className="flex gap-2 flex-wrap mb-2">
              {["#ffffff","#87ceeb","#003580","#f0f0f0","#d4edda","#fff3cd"].map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    bgColor === c ? "border-blue-500 scale-125" : "border-gray-300"
                  }`}
                />
              ))}
            </div>
            <input
              type="color" value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-0.5">
            <p>📐 {widthMm}×{heightMm} mm per photo</p>
            <p>↔ Scale: {scaleX}% H × {scaleY}% V</p>
            <p>🔢 {cols} cols × {rows} rows = {cols * rows} photos</p>
            <p>📏 Gap: {gap} mm</p>
          </div>
        </aside>

        {/* ── PREVIEW — scales to fit one screen ── */}
        <main
          ref={mainRef}
          className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100 p-6"
        >
          <canvas
            ref={previewRef}
            className="shadow-2xl rounded border border-gray-300 max-w-full max-h-full"
          />
        </main>
      </div>
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */

export default function PhotoEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { src, name } = location.state || {};

  const [step,   setStep]   = useState("edit");
  const [edited, setEdited] = useState(null);

  if (!src)
    return (
      <div className="flex items-center justify-center h-screen">
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );

  if (step === "edit")
    return (
      <StepEditor
        src={src}
        name={name}
        onNext={(data) => {
          setEdited(data);
          setStep("grid");
        }}
      />
    );

  return (
    <StepGrid
      editedDataUrl={edited}
      name={name}
      onBack={() => setStep("edit")}
    />
  );
}
