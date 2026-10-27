import { voiceSocketUrl } from '../api.js';

const b64FromBuffer = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const bufferFromB64 = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

/**
 * Live voice session with the AI tutor.
 * Events (callbacks): onStatus(status), onTranscript({role,text}), onLevel({mic, tutor}), onInfo(msg), onError(msg), onEnded(info)
 * status: 'connecting' | 'ready' | 'tutor-speaking' | 'listening' | 'ended'
 */
export class TutorSession {
  constructor({ lessonId, ...handlers }) {
    this.lessonId = lessonId;
    this.h = handlers;
    this.muted = false;
    this.playHead = 0;
    this.sources = new Set();
  }

  emit(name, arg) { this.h[name]?.(arg); }

  async start() {
    this.emit('onStatus', 'connecting');
    // Must be created from a user gesture (button tap) for mobile autoplay rules
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });

    this.ws = new WebSocket(voiceSocketUrl(this.lessonId));
    this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data));
    this.ws.onerror = () => this.emit('onError', 'Connection problem. Check your internet.');
    this.ws.onclose = () => this.cleanup();
  }

  async onMessage(m) {
    switch (m.type) {
      case 'ready':
        this.outputRate = m.outputRate;
        this.maxSeconds = m.maxSeconds;
        await this.startMic(m.inputRate);
        this.emit('onStatus', 'listening');
        this.emit('onReady', m);
        break;
      case 'audio':
        this.play(m.data);
        break;
      case 'transcript':
        this.emit('onTranscript', { role: m.role, text: m.text });
        break;
      case 'interrupted':
        this.stopPlayback();
        break;
      case 'turn_complete':
        break;
      case 'warning':
        this.emit('onInfo', m.message);
        break;
      case 'error':
        this.emit('onError', m.message);
        break;
      case 'ended':
        this.emit('onEnded', m);
        break;
      default:
    }
  }

  async startMic(rate) {
    await this.ctx.audioWorklet.addModule('/mic-worklet.js');
    this.micSrc = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, 'mic-processor', { processorOptions: { targetRate: rate } });
    this.worklet.port.onmessage = (e) => {
      this.emit('onLevel', { mic: e.data.level });
      if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'audio', data: b64FromBuffer(e.data.pcm) }));
    };
    // keep the graph pulling without making the mic audible
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.micSrc.connect(this.worklet).connect(sink).connect(this.ctx.destination);
  }

  play(b64) {
    const pcm = new Int16Array(bufferFromB64(b64));
    const buf = this.ctx.createBuffer(1, pcm.length, this.outputRate || 24000);
    const ch = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < pcm.length; i++) { ch[i] = pcm[i] / 0x8000; peak = Math.max(peak, Math.abs(ch[i])); }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    this.playHead = Math.max(this.playHead, now + 0.03);
    src.start(this.playHead);
    this.playHead += buf.duration;
    this.sources.add(src);
    this.emit('onStatus', 'tutor-speaking');
    this.emit('onLevel', { tutor: peak });
    src.onended = () => {
      this.sources.delete(src);
      if (!this.sources.size) this.emit('onStatus', 'listening');
    };
  }

  stopPlayback() {
    for (const s of this.sources) { try { s.stop(); } catch { /* ignore */ } }
    this.sources.clear();
    this.playHead = 0;
    this.emit('onStatus', 'listening');
  }

  setMuted(m) {
    this.muted = m;
    this.worklet?.port.postMessage({ muted: m });
  }

  sendText(text) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'text', text }));
  }

  stop() {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'end' }));
    setTimeout(() => this.cleanup(), 300);
  }

  cleanup() {
    if (this.closed) return;
    this.closed = true;
    this.stopPlayback();
    try { this.ws?.close(); } catch { /* ignore */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.emit('onStatus', 'ended');
  }
}
