// Web Audio API Synthesizer for Tactile Diorama Sound Effects

let audioCtx = null;

function initAudio() {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	}
	if (audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
}

// Play a wooden "tock" block placement sound
export function playPlaceWood() {
	initAudio();
	if (!audioCtx) return;

	const now = audioCtx.currentTime;
	
	// Create Nodes
	const osc = audioCtx.createOscillator();
	const osc2 = audioCtx.createOscillator();
	const gainNode = audioCtx.createGain();
	const lowpass = audioCtx.createBiquadFilter();

	// Configure oscillators
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(150, now);
	osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

	osc2.type = 'sine';
	osc2.frequency.setValueAtTime(300, now);
	osc2.frequency.exponentialRampToValueAtTime(150, now + 0.08);

	// Lowpass filter to make it sound "wooden" and warm
	lowpass.type = 'lowpass';
	lowpass.frequency.setValueAtTime(400, now);
	lowpass.frequency.exponentialRampToValueAtTime(200, now + 0.1);

	// Configure volume envelope
	gainNode.gain.setValueAtTime(0.01, now);
	gainNode.gain.linearRampToValueAtTime(0.6, now + 0.01);
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

	// Connect nodes
	osc.connect(lowpass);
	osc2.connect(lowpass);
	lowpass.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	// Start & Stop
	osc.start(now);
	osc2.start(now);
	osc.stop(now + 0.2);
	osc2.stop(now + 0.2);
}

// Play a glass "clink" sound (for teacups, teapots, delicate items)
export function playPlaceGlass() {
	initAudio();
	if (!audioCtx) return;

	const now = audioCtx.currentTime;

	const osc1 = audioCtx.createOscillator();
	const osc2 = audioCtx.createOscillator();
	const gainNode = audioCtx.createGain();

	osc1.type = 'sine';
	osc1.frequency.setValueAtTime(2400, now);
	osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

	osc2.type = 'triangle';
	osc2.frequency.setValueAtTime(3600, now);
	osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

	gainNode.gain.setValueAtTime(0.01, now);
	gainNode.gain.linearRampToValueAtTime(0.2, now + 0.005);
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

	osc1.connect(gainNode);
	osc2.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	osc1.start(now);
	osc2.start(now);
	osc1.stop(now + 0.35);
	osc2.stop(now + 0.35);
}

// Play a swoosh sound when removing blocks
export function playDelete() {
	initAudio();
	if (!audioCtx) return;

	const now = audioCtx.currentTime;

	const osc = audioCtx.createOscillator();
	const gainNode = audioCtx.createGain();
	const lowpass = audioCtx.createBiquadFilter();

	osc.type = 'triangle';
	osc.frequency.setValueAtTime(440, now);
	osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

	lowpass.type = 'lowpass';
	lowpass.frequency.setValueAtTime(1000, now);
	lowpass.frequency.exponentialRampToValueAtTime(200, now + 0.2);

	gainNode.gain.setValueAtTime(0.3, now);
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

	osc.connect(lowpass);
	lowpass.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	osc.start(now);
	osc.stop(now + 0.25);
}

// Play a nice warm chime sound for Day/Night switch or templates loading
export function playChime() {
	initAudio();
	if (!audioCtx) return;

	const now = audioCtx.currentTime;
	const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

	notes.forEach((freq, idx) => {
		const time = now + idx * 0.08;
		
		const osc = audioCtx.createOscillator();
		const gainNode = audioCtx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, time);

		gainNode.gain.setValueAtTime(0.001, time);
		gainNode.gain.linearRampToValueAtTime(0.15, time + 0.02);
		gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

		osc.connect(gainNode);
		gainNode.connect(audioCtx.destination);

		osc.start(time);
		osc.stop(time + 0.7);
	});
}

// General button click sound
export function playClick() {
	initAudio();
	if (!audioCtx) return;

	const now = audioCtx.currentTime;
	const osc = audioCtx.createOscillator();
	const gainNode = audioCtx.createGain();

	osc.type = 'sine';
	osc.frequency.setValueAtTime(800, now);
	osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

	gainNode.gain.setValueAtTime(0.1, now);
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

	osc.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	osc.start(now);
	osc.stop(now + 0.06);
}
