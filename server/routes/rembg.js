const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

/**
 * POST /api/rembg
 * Body: { imageBase64: "data:image/jpeg;base64,..." }
 * Response: { imageBase64: "data:image/png;base64,..." }
 *
 * Requires Python + rembg installed:
 *   pip install "rembg[new]" pillow
 */
router.post('/', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  // Strip data URL header if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const scriptPath = path.join(__dirname, '..', 'rembg_script.py');

  // Try 'python' then fall back to 'python3'
  const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
  const py = spawn(pyCmd, [scriptPath]);

  let outputChunks = [];
  let errMsg = '';

  py.stdout.on('data', (chunk) => outputChunks.push(chunk));
  py.stderr.on('data', (chunk) => { errMsg += chunk.toString(); });

  py.on('error', (err) => {
    res.status(500).json({ error: `Could not start Python: ${err.message}` });
  });

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('[rembg] Python error:', errMsg);
      return res.status(500).json({
        error: 'Background removal failed',
        detail: errMsg.slice(0, 500),
      });
    }
    const output = Buffer.concat(outputChunks).toString('utf8').trim();
    res.json({ imageBase64: `data:image/png;base64,${output}` });
  });

  py.stdin.write(base64Data);
  py.stdin.end();
});

module.exports = router;
