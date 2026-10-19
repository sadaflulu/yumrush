/**
 * YumRush - Web Audio Synthesizer
 * 
 * Provides crisp, lag-free sound effects generated natively using Web Audio API.
 * No external MP3/WAV files required! Works 100% offline and reliably.
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('yumrush_sound_muted') === 'true';
        this.initialized = false;
    }

    /**
     * Initializes or resumes the AudioContext on first user interaction.
     * Browsers require a user click or keypress before allowing audio playback.
     */
    init() {
        if (this.initialized && this.ctx && this.ctx.state === 'running') {
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!this.ctx && AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.initialized = true;
        } catch (e) {
            console.warn('AudioContext could not be initialized:', e);
        }
    }

    /**
     * Toggles sound on and off, storing preference in localStorage.
     * @returns {boolean} Current muted state (true = muted, false = unmuted)
     */
    toggleMute() {
        this.init();
        this.isMuted = !this.isMuted;
        localStorage.setItem('yumrush_sound_muted', this.isMuted.toString());
        return this.isMuted;
    }

    /**
     * Plays a cheerful sound when food is caught in the basket.
     * @param {string} type Type of food caught
     */
    playCatch(type = 'normal') {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';

            if (type === 'bonus') {
                // Sparkling high-pitched arpeggio for bonus food
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
                osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16); // D6
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.28);
            } else {
                // Cheerful short pop/ding for standard food
                const baseFreq = type === 'pizza' ? 659.25 : (type === 'burger' ? 523.25 : 587.33);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            }
        } catch (e) {
            // Silently continue if audio fails
        }
    }

    /**
     * Plays an audible thud/buzz when a food item hits the ground and a life is lost.
     */
    playMiss() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {
            // Silently continue if audio fails
        }
    }

    /**
     * Plays a celebratory fanfare when the player reaches a new level.
     */
    playLevelUp() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
            const duration = 0.1;

            notes.forEach((freq, idx) => {
                const startTime = this.ctx.currentTime + (idx * duration);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            });
        } catch (e) {
            // Silently continue
        }
    }

    /**
     * Plays game-over audio tone sequence.
     * @param {boolean} isHighScore If true, plays a cheer tone rather than a sad tone
     */
    playGameOver(isHighScore = false) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (isHighScore) {
                // Triumphant victory sound
                const victoryNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                victoryNotes.forEach((freq, idx) => {
                    const startTime = this.ctx.currentTime + (idx * 0.12);
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.25, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.2);
                });
            } else {
                // Sad descending tones
                const sadNotes = [329.63, 293.66, 261.63, 220.00]; // E4, D4, C4, A3
                sadNotes.forEach((freq, idx) => {
                    const startTime = this.ctx.currentTime + (idx * 0.15);
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.18, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.18);
                });
            }
        } catch (e) {
            // Silently continue
        }
    }

    /**
     * Subtle click sound for UI buttons.
     */
    playClick() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {
            // Silently continue
        }
    }
}

// Global sound manager instance
window.sounds = new SoundManager();
