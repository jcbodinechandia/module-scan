/* Module Scan - barcode reader running in a background thread, so the screen stays smooth. */
importScripts('zxing-reader.js');
let ready = null;
function prep() {
  if (!ready) {
    const wasmUrl = new URL('zxing_reader.wasm', self.location.href).href;
    ready = ZXingWASM.prepareZXingModule({
      overrides: { locateFile: (p, prefix) => p.endsWith('.wasm') ? wasmUrl : prefix + p },
      fireImmediately: true
    });
  }
  return ready;
}
self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'init') {
    try { await prep(); self.postMessage({ type: 'ready' }); }
    catch (err) { self.postMessage({ type: 'error', message: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'scan') {
    try {
      await prep();
      const img = { data: new Uint8ClampedArray(m.buf), width: m.w, height: m.h, colorSpace: 'srgb' };
      const res = await ZXingWASM.readBarcodes(img, Object.assign({ formats: ['Code128'], maxNumberOfSymbols: 3 }, m.opts));
      self.postMessage({
        type: 'result', id: m.id,
        results: res.filter(r => r.isValid && r.text).map(r => ({
          text: r.text, format: r.format,
          pts: [r.position.topLeft, r.position.topRight, r.position.bottomRight, r.position.bottomLeft]
        }))
      });
    } catch (err) {
      self.postMessage({ type: 'result', id: m.id, results: [], error: String(err && err.message || err) });
    }
  }
};
