// Minimal static server for the GRS019 web viewer (no dependencies).
// Serves the PROJECT ROOT so the viewer can read ../viewerData and ../previewer.
// Usage: node serve.js  ->  open the printed URL in a browser.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');      // project root
const PORT = process.env.PORT || 8090;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.bin': 'application/octet-stream', '.gz': 'application/octet-stream', '.css': 'text/css' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/webviewer/';
  if (p.endsWith('/')) p += 'index.html';        // serve index.html for directory requests
  const fp = path.join(ROOT, path.normalize(p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + p); }
    // Note: .gz is sent raw (no Content-Encoding) so the viewer decompresses it itself.
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Web viewer: http://localhost:' + PORT + '/webviewer/  (Ctrl+C to stop)'));
