export class CallSounds {
  private audioContext: AudioContext | null = null;
  private ringbackOscillator: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  startRingbackTone() {
    if (!this.audioContext) return;

    this.stopRingbackTone();

    const playRingback = () => {
      if (!this.audioContext) return;

      this.ringbackOscillator = this.audioContext.createOscillator();
      this.ringbackGain = this.audioContext.createGain();

      this.ringbackOscillator.connect(this.ringbackGain);
      this.ringbackGain.connect(this.audioContext.destination);

      this.ringbackOscillator.frequency.value = 440;
      this.ringbackGain.gain.value = 0.1;

      this.ringbackOscillator.start();

      setTimeout(() => {
        if (this.ringbackOscillator && this.ringbackGain) {
          this.ringbackGain.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext!.currentTime + 0.1
          );
          this.ringbackOscillator.stop(this.audioContext!.currentTime + 0.1);
        }
      }, 400);
    };

    playRingback();
    this.ringbackInterval = setInterval(playRingback, 2000);
  }

  stopRingbackTone() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringbackOscillator) {
      try {
        this.ringbackOscillator.stop();
      } catch (e) {
        // Already stopped
      }
      this.ringbackOscillator = null;
    }
    if (this.ringbackGain) {
      this.ringbackGain = null;
    }
  }

  playConnectedSound() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.15;

    oscillator.start();
    
    setTimeout(() => {
      oscillator.frequency.value = 1000;
    }, 80);

    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.2
    );
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  playIncomingRingTone() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 480;
    gainNode.gain.value = 0.2;

    oscillator.start();

    setTimeout(() => {
      oscillator.frequency.value = 620;
    }, 200);

    setTimeout(() => {
      oscillator.frequency.value = 480;
    }, 400);

    setTimeout(() => {
      oscillator.frequency.value = 620;
    }, 600);

    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.8
    );
    oscillator.stop(this.audioContext.currentTime + 0.8);
  }

  cleanup() {
    this.stopRingbackTone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
