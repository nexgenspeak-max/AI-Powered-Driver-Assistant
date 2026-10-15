// Bộ giả lập Dịch vụ Định danh cho SC-03: trả tài khoản tài xế và cài đặt rỗng.
// Chạy: node identity_stub.js 8093
const http = require('http');
const port = Number(process.argv[2] || 8093);
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const m = req.url.match(/^\/api\/v1\/accounts\/phone\/([^?]+)/);
  if (m) {
    const phone = decodeURIComponent(m[1]);
    return res.end(JSON.stringify({ id: `acc-${phone}`, phone, name: 'Tai xe thu nghiem', role: 'driver', status: 'active', is_online: true }));
  }
  if (req.url.startsWith('/api/v1/settings/')) return res.end(JSON.stringify({}));
  res.statusCode = 404; res.end('{}');
}).listen(port, () => console.log('identity stub on', port));
