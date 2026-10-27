// AudioWorklet: collects mic samples, downsamples to the provider's input rate, emits Int16 PCM chunks (~100 ms).
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.target = options.processorOptions.targetRate || 16000;
    this.ratio = sampleRate / this.target;
    this.chunk = Math.round(this.target / 10);
    this.buf = new Int16Array(this.chunk);
    this.len = 0;
    this.pos = 0; // fractional read position for resampling
    this.muted = false;
    this.port.onmessage = (e) => { if (e.data && 'muted' in e.data) this.muted = e.data.muted; };
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let level = 0;
    while (this.pos < ch.length) {
      const i = Math.floor(this.pos);
      const s = this.muted ? 0 : Math.max(-1, Math.min(1, ch[i]));
      level = Math.max(level, Math.abs(s));
      this.buf[this.len++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.len === this.chunk) {
        this.port.postMessage({ pcm: this.buf.buffer, level }, [this.buf.buffer]);
        this.buf = new Int16Array(this.chunk);
        this.len = 0;
        level = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor('mic-processor', MicProcessor);
