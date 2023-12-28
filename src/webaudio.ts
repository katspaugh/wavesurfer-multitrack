/**
 * Web Audio buffer player emulating the behavior of an HTML5 Audio element.
 */
class WebAudioPlayer {
  private audioContext: AudioContext
  private gainNode: GainNode
  private bufferNode: AudioBufferSourceNode | null = null
  private listeners: Map<string, Set<() => void>> = new Map()
  private autoplay = false
  private playStartTime = 0
  private playedDuration = 0
  private _src = ''
  private _duration = 0
  private _muted = false
  private buffer: AudioBuffer | null = null
  public paused = true
  public crossOrigin: string | null = null

  constructor(audioContext = new AudioContext()) {
    this.audioContext = audioContext

    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
  }

  addEventListener(event: string, listener: () => void, options?: { once?: boolean }) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(listener)

    if (options?.once) {
      const onOnce = () => {
        this.removeEventListener(event, onOnce)
        this.removeEventListener(event, listener)
      }
      this.addEventListener(event, onOnce)
    }
  }

  removeEventListener(event: string, listener: () => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.delete(listener)
    }
  }

  private emitEvent(event: string) {
    this.listeners.get(event)?.forEach((listener) => listener())
  }

  get src() {
    return this._src
  }

  set src(value: string) {
    this._src = value

    if (!value) {
      this.buffer = null
      this._duration = 0
      this.emitEvent('emptied')
      return
    }

    fetch(value)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        if (this.src !== value) return null
        return this.audioContext.decodeAudioData(arrayBuffer)
      })
      .then((audioBuffer) => {
        if (this.src !== value || !audioBuffer) return null

        this.buffer = audioBuffer
        this._duration = audioBuffer.duration

        this.emitEvent('loadedmetadata')
        this.emitEvent('canplay')

        if (this.autoplay) {
          this.play()
        }
      })
  }

  getChannelData() {
    const channelData = this.buffer?.getChannelData(0)
    return channelData ? [channelData] : undefined
  }

  async play() {
    if (!this.paused) return
    this.paused = false

    this.bufferNode?.disconnect()
    this.bufferNode = this.audioContext.createBufferSource()
    this.bufferNode.buffer = this.buffer
    this.bufferNode.connect(this.gainNode)

    const offset = this.playedDuration > 0 ? this.playedDuration : 0
    const start =
      this.playedDuration > 0 ? this.audioContext.currentTime : this.audioContext.currentTime - this.playedDuration

    this.bufferNode.start(start, offset)
    this.playStartTime = this.audioContext.currentTime
    this.emitEvent('play')
  }

  pause() {
    if (this.paused) return
    this.paused = true

    this.bufferNode?.stop()
    this.playedDuration += this.audioContext.currentTime - this.playStartTime
    this.emitEvent('pause')
  }

  async setSinkId(deviceId: string) {
    const ac = this.audioContext as AudioContext & { setSinkId: (id: string) => Promise<void> }
    return ac.setSinkId(deviceId)
  }

  get playbackRate() {
    return this.bufferNode?.playbackRate.value ?? 1
  }
  set playbackRate(value) {
    if (this.bufferNode) {
      this.bufferNode.playbackRate.value = value
    }
  }

  get currentTime() {
    return this.paused ? this.playedDuration : this.playedDuration + this.audioContext.currentTime - this.playStartTime
  }
  set currentTime(value) {
    this.emitEvent('seeking')

    if (this.paused) {
      this.playedDuration = value
    } else {
      this.pause()
      this.playedDuration = value
      this.play()
    }

    this.emitEvent('timeupdate')
  }

  get duration() {
    return this._duration
  }
  set duration(value: number) {
    this._duration = value
  }

  get volume() {
    return this.gainNode.gain.value
  }
  set volume(value) {
    this.gainNode.gain.value = value
    this.emitEvent('volumechange')
  }

  get muted() {
    return this._muted
  }
  set muted(value: boolean) {
    if (this._muted === value) return
    this._muted = value

    if (this._muted) {
      this.gainNode.disconnect()
    } else {
      this.gainNode.connect(this.audioContext.destination)
    }
  }
}

export default WebAudioPlayer
