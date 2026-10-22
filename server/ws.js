/* A small, strict WebSocket server (RFC 6455) with no dependencies - the channel multiplayer will use.
 *
 * Deliberately limited, because every byte comes from the internet:
 *  - only text frames, no fragmentation, no extensions (no compression bombs)
 *  - client frames must be masked; payloads over `maxPayload` close the socket (1009)
 *  - message rate limit per socket; idle sockets are pinged and dropped if they stop answering
 *  - the HTTP upgrade is accepted only for the right path, the same origin, and while under the connection caps
 */
'use strict';
const crypto = require('crypto');
const { EventEmitter } = require('events');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Socket extends EventEmitter {
  constructor(sock, opts, ip) {
    super();
    this.sock = sock; this.opts = opts; this.ip = ip; this.buf = Buffer.alloc(0); this.open = true; this.alive = true;
    this.tokens = opts.msgBurst; this.last = Date.now();
    sock.setNoDelay(true);
    sock.on('data', d => this._data(d));
    sock.on('close', () => this._closed());
    sock.on('error', () => this._closed());
  }
  _closed() { if (!this.open) return; this.open = false; this.emit('close'); }
  _data(chunk) {
    if (!this.open) return;
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    if (this.buf.length > this.opts.maxPayload + 14) return this.close(1009, 'too big');
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const fin = b[0] & 0x80, rsv = b[0] & 0x70, op = b[0] & 0x0f, masked = b[1] & 0x80;
      let len = b[1] & 0x7f, off = 2;
      if (rsv) return this.close(1002, 'rsv');
      if (!masked) return this.close(1002, 'unmasked');
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) return this.close(1009, 'too big');   // 64-bit lengths are never needed here
      if (len > this.opts.maxPayload) return this.close(1009, 'too big');
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (!fin || op === 0x0) return this.close(1003, 'fragments not supported');
      if (op === 0x8) return this.close(1000);
      if (op === 0x9) { this._send(0xA, data.subarray(0, 125)); continue; }
      if (op === 0xA) { this.alive = true; continue; }
      if (op !== 0x1) return this.close(1003, 'text only');
      // rate limit: a token bucket per socket
      const now = Date.now(); this.tokens = Math.min(this.opts.msgBurst, this.tokens + (now - this.last) / 1000 * this.opts.msgPerSec); this.last = now;
      if (this.tokens < 1) return this.close(1008, 'slow down');
      this.tokens -= 1; this.alive = true;
      let msg; try { msg = JSON.parse(data.toString('utf8')); } catch (e) { return this.close(1007, 'bad json'); }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return this.close(1007, 'bad message');
      this.emit('message', msg);
    }
  }
  _send(op, payload) {
    if (!this.open) return;
    const n = payload.length;
    let head;
    if (n < 126) head = Buffer.from([0x80 | op, n]);
    else if (n < 65536) head = Buffer.from([0x80 | op, 126, n >> 8, n & 255]);
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    if (this.sock.writableLength > 1 << 20) return this.close(1008, 'too slow');   // a client that stops reading is dropped
    this.sock.write(Buffer.concat([head, payload]));
  }
  send(obj) { this._send(0x1, Buffer.from(JSON.stringify(obj), 'utf8')); }
  sendRaw(text) { this._send(0x1, Buffer.from(text, 'utf8')); }   // an already-encoded message, shared by a whole room
  close(code = 1000, reason = '') {
    if (!this.open) return;
    const r = Buffer.from(String(reason).slice(0, 100)), p = Buffer.alloc(2 + r.length); p.writeUInt16BE(code, 0); r.copy(p, 2);
    try { this._send(0x8, p); } catch (e) {}
    this.open = false; this.sock.end(); setTimeout(() => this.sock.destroy(), 1000).unref(); this.emit('close');
  }
}

/** attach to an http.Server. opts: { path, allowOrigin(origin, req), maxPayload, msgPerSec, msgBurst, maxPerIp, maxTotal, ipOf(req) } */
function attach(server, opts) {
  const o = { path: '/ws', maxPayload: 4096, msgPerSec: 20, msgBurst: 40, maxPerIp: 4, maxTotal: 2000, heartbeatMs: 25000, ...opts };
  const hub = new EventEmitter(), perIp = new Map(), all = new Set();
  const reject = (sock, code, text) => { try { sock.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); } catch (e) {} sock.destroy(); };
  server.on('upgrade', (req, sock) => {
    const url = (req.url || '').split('?')[0], ip = o.ipOf(req);
    if (url !== o.path) return reject(sock, 404, 'Not Found');
    if ((req.headers.upgrade || '').toLowerCase() !== 'websocket' || req.headers['sec-websocket-version'] !== '13') return reject(sock, 400, 'Bad Request');
    const key = req.headers['sec-websocket-key'];
    if (!key || !/^[A-Za-z0-9+/]{22}==$/.test(key)) return reject(sock, 400, 'Bad Request');
    if (!o.allowOrigin(req.headers.origin, req)) return reject(sock, 403, 'Forbidden');
    if (all.size >= o.maxTotal || (perIp.get(ip) || 0) >= o.maxPerIp) return reject(sock, 429, 'Too Many Requests');
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const ws = new Socket(sock, o, ip);
    all.add(ws); perIp.set(ip, (perIp.get(ip) || 0) + 1);
    ws.on('close', () => { if (!all.delete(ws)) return; const n = (perIp.get(ip) || 1) - 1; if (n) perIp.set(ip, n); else perIp.delete(ip); });
    hub.emit('connection', ws, req);
  });
  const beat = setInterval(() => {
    for (const ws of all) { if (!ws.alive) { ws.close(1001, 'timeout'); continue; } ws.alive = false; ws._send(0x9, Buffer.alloc(0)); }
  }, o.heartbeatMs);
  beat.unref();
  hub.clients = all;
  hub.close = () => { clearInterval(beat); for (const ws of all) ws.close(1001, 'server shutting down'); };
  return hub;
}
module.exports = { attach };
