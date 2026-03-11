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
import { useLocation, useNavigate } from "react-router-dom";
import ImageEditor from "tui-image-editor";
import "tui-image-editor/dist/tui-image-editor.css";
import toast from "react-hot-toast";

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
    if (!src) return;

    const instance = new ImageEditor(ref.current, {
      includeUI: {
        loadImage: { path: src, name: name || "photo" },
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

    return () => instance.destroy();
  }, [src, name]);

  const handleNext = () => {
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

function StepGrid({ editedDataUrl, name, onBack }) {
  const [presetIdx, setPresetIdx] = useState(0);

  const [widthMm, setWidthMm] = useState(35);
  const [heightMm, setHeightMm] = useState(45);

  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(2);

  const [gap, setGap] = useState(4);

  const [bgColor, setBgColor] = useState("#ffffff");

  const previewRef = useRef(null);

  const pxW = mmToPx(widthMm);
  const pxH = mmToPx(heightMm);
  const pxGap = mmToPx(gap);

  const applyPreset = (i) => {
    setPresetIdx(i);

    if (PRESETS[i].w) {
      setWidthMm(PRESETS[i].w);
      setHeightMm(PRESETS[i].h);
    }
  };

  const buildCanvas = useCallback(async () => {
    const img = await loadImage(editedDataUrl);

    const totalW = cols * pxW + (cols + 1) * pxGap;
    const totalH = rows * pxH + (rows + 1) * pxGap;

    const canvas = document.createElement("canvas");

    canvas.width = totalW;
    canvas.height = totalH;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pxGap + c * (pxW + pxGap);
        const y = pxGap + r * (pxH + pxGap);

        ctx.drawImage(img, x, y, pxW, pxH);
      }
    }

    return canvas;
  }, [editedDataUrl, cols, rows, pxW, pxH, pxGap, bgColor]);

  useEffect(() => {
    (async () => {
      const canvas = await buildCanvas();

      const preview = previewRef.current;

      const MAX = 600;

      const scale = Math.min(MAX / canvas.width, MAX / canvas.height);

      preview.width = canvas.width * scale;
      preview.height = canvas.height * scale;

      const ctx = preview.getContext("2d");

      ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
    })();
  }, [buildCanvas]);

  const downloadJPG = async () => {
    const canvas = await buildCanvas();

    const link = document.createElement("a");

    link.href = canvas.toDataURL("image/jpeg");

    link.download = "passport-grid.jpg";

    link.click();

    toast.success("Downloaded");
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");

    const canvas = await buildCanvas();

    const img = canvas.toDataURL("image/jpeg");

    const pdf = new jsPDF();

    pdf.addImage(img, "JPEG", 10, 10, 190, 0);

    pdf.save("passport-photo.pdf");
  };

  const handlePrint = async () => {
    const canvas = await buildCanvas();

    const data = canvas.toDataURL("image/jpeg");

    const win = window.open("");

    win.document.write(`
<html>
<body style="margin:0">
<img src="${data}" style="width:100%" onload="window.print()"/>
</body>
</html>
`);
  };

  return (
    <div className="flex h-screen">

      <div className="w-72 bg-white border-r p-4 space-y-4">

        <button onClick={onBack} className="text-sm">
          ← Back
        </button>

        <div>
          <p className="text-xs mb-2">Photo Size</p>

          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className="block w-full text-left border p-2 mb-1"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs">Width</p>

          <input
            className="input w-full"
            value={widthMm}
            onChange={(e) => setWidthMm(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs">Height</p>

          <input
            className="input w-full"
            value={heightMm}
            onChange={(e) => setHeightMm(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs">Columns</p>

          <input
            type="range"
            min="1"
            max="10"
            value={cols}
            onChange={(e) => setCols(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs">Rows</p>

          <input
            type="range"
            min="1"
            max="10"
            value={rows}
            onChange={(e) => setRows(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs">Gap (mm)</p>

          <input
            type="range"
            min="0"
            max="20"
            value={gap}
            onChange={(e) => setGap(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs">Background</p>

          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </div>

        <div className="space-y-2">

          <button
            onClick={downloadJPG}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Download JPG
          </button>

          <button
            onClick={downloadPDF}
            className="w-full bg-indigo-600 text-white p-2 rounded"
          >
            Download PDF
          </button>

          <button
            onClick={handlePrint}
            className="w-full bg-green-600 text-white p-2 rounded"
          >
            Print
          </button>

        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-100">

        <canvas ref={previewRef} className="shadow-xl"></canvas>

      </div>
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */

export default function PhotoEditorPage() {

  const location = useLocation();
  const navigate = useNavigate();

  const { src, name } = location.state || {};

  const [step, setStep] = useState("edit");

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
