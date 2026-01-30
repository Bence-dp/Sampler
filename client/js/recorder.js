import WaveformDrawer from './waveformdrawer.js';

export default class Recorder {
	constructor(options = {}) {
		this.recordButton = null;
		this.stopButton = null;
		this.playButton = null;
		this.sendButton = null;
		this.canvas = null;
		this.progressBar = null;

		this.recorder = null;
		this.lastBlob = null;
		this.lastSample = null;
		this.bufferSourceNode = null;

		if (options && typeof options.currentTime === 'number') {
			this.ac = options; 
		} else {
			this.ac = (options && options.audioContext) || new AudioContext();
		}

		this.limiter = this.ac.createDynamicsCompressor();
		this.limiter.connect(this.ac.destination);

		// base URL for API (upload / presets). Can be remote server.
		this.apiBase = (options && options.apiBase) || 'http://localhost:3000';

		this.canvasMgr = (options && options.canvasMgr) || null;
		this.presetManager = (options && options.presetManager) || null;

		this.selectors = (options && options.selectors) || {
			canvas: 'recordVisualizer',
			record: 'record',
			stop: 'stop',
			play: 'play',
			send: 'send',
			progress: 'progress'
		};

		// playhead state for recorder canvas
		this._playhead = {
			active: false,
			startedAt: 0,
			duration: 0,
			reqId: null
		};
	}

	async init() {
		this.canvas = document.getElementById(this.selectors.canvas);
		this.recordButton = document.getElementById(this.selectors.record);
		this.stopButton = document.getElementById(this.selectors.stop);
		this.playButton = document.getElementById(this.selectors.play);
		this.sendButton = document.getElementById(this.selectors.send);
		this.progressBar = document.getElementById(this.selectors.progress);

		this._disableButtons(true, true, true, true);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.recorder = new MediaRecorder(stream);

			this.recorder.addEventListener('dataavailable', (e) => this._onRecordingReady(e));
			this.recorder.addEventListener('start', () => console.log('Recording started'));

		this.recordButton.addEventListener('click', (e) => { e.preventDefault(); this.startRecording(); });
		this.stopButton.addEventListener('click', (e) => { e.preventDefault(); this.stopRecording(); });
		this.playButton.addEventListener('click', (e) => { e.preventDefault(); this.playSample(); });
		this.sendButton.addEventListener('click', (e) => { e.preventDefault(); this.sendToServer(); });

			this._disableButtons(false, true, true, true);
			console.log('Recorder ready');
		} catch (err) {
			console.error('Micro access denied:', err);
		}
	}

	_disableButtons(record, stop, play, send) {
		if (this.recordButton) this.recordButton.disabled = record;
		if (this.stopButton) this.stopButton.disabled = stop;
		if (this.playButton) this.playButton.disabled = play;
		if (this.sendButton) this.sendButton.disabled = send;
	}

	startRecording() {
		this._disableButtons(true, false, true, true);
		this.stopSample();
		if (this.recorder) this.recorder.start();
	}

	stopRecording() {
		this._disableButtons(false, true, true, true);
		if (this.recorder) this.recorder.stop();
	}

	async _onRecordingReady(event) {
		this.lastBlob = event.data;
		try {
			const arrayBuffer = await this.lastBlob.arrayBuffer();
			const decoded = await this.ac.decodeAudioData(arrayBuffer);
			this._useSample(decoded);
		} catch (err) {
			console.error('Audio decode failed:', err);
		}
	}

	_useSample(sample) {
		this._maximizeSampleInPlace(sample);
		this.lastSample = sample;

		this.stopSample();

		this._disableButtons(false, true, false, false);

		this._renderWave(this.canvas, sample);
	}

	playSample() {
		if (!this.lastSample) return;
		this.stopSample();

		this.bufferSourceNode = this.ac.createBufferSource();
		this.bufferSourceNode.buffer = this.lastSample;
		this.bufferSourceNode.connect(this.limiter);
		this.bufferSourceNode.loop = false;
		this.bufferSourceNode.start();

		const startedAt = this.ac.currentTime;
		const playDuration = this.lastSample.duration || (this.lastSample.length / this.lastSample.sampleRate);
		if (this.canvas) {
			this._startPlayhead(startedAt, playDuration);
		}

		this._disableButtons(true, true, true, true);
		this.bufferSourceNode.onended = () => {
			this._disableButtons(false, true, false, false);
			this._stopPlayhead();
		};
	}

	stopSample() {
		if (this.bufferSourceNode) {
			try { this.bufferSourceNode.stop(); } catch (e) { }
			try { this.bufferSourceNode.disconnect(); } catch (e) { }
			this.bufferSourceNode = null;
		}
		this._stopPlayhead();
	}

	_startPlayhead(startedAt, duration) {
		this._playhead.active = true;
		this._playhead.startedAt = startedAt;
		this._playhead.duration = duration;
		const canvas = this.canvas;
		const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

		const draw = () => {
			if (!this._playhead.active || !ctx) return;
			const now = this.ac.currentTime;
			const elapsed = now - this._playhead.startedAt;
			const t = this._playhead.duration > 0 ? (elapsed / this._playhead.duration) : 1;
			let x = Math.min(Math.max(0, t), 1) * canvas.width;


			ctx.save();

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			try {
				const drawer = new WaveformDrawer();
				drawer.init(this.lastSample, canvas, '#83E83E');
				drawer.drawWave(0, canvas.height);
			} catch (e) { /* if waveform draw fails, continue */ }

			ctx.strokeStyle = 'red';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
			ctx.restore();

			if (t < 1) {
				this._playhead.reqId = requestAnimationFrame(draw);
			} else {
				this._playhead.active = false;
			}
		};

		if (this._playhead.reqId) cancelAnimationFrame(this._playhead.reqId);
		this._playhead.reqId = requestAnimationFrame(draw);
	}

	_stopPlayhead() {
		this._playhead.active = false;
		if (this._playhead.reqId) {
			cancelAnimationFrame(this._playhead.reqId);
			this._playhead.reqId = null;
		}
		if (this.canvas && this.lastSample) {
			try {
				const ctx = this.canvas.getContext('2d');
				ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				const drawer = new WaveformDrawer();
				drawer.init(this.lastSample, this.canvas, '#83E83E');
				drawer.drawWave(0, this.canvas.height);
			} catch (e) { }
		}
	}

	async sendToServer() {
		if (!this.lastBlob) {
			alert('Aucun enregistrement à envoyer.');
			return;
		}

		const folder = prompt('Dossier sur le serveur (ex: recordings) :') || 'recordings';
		const presetName = folder;
		const sampleBaseName = prompt('Nom du sample (sans extension) :') || 'recording';
		const mime = this.lastBlob.type || 'audio/webm';
		const extMatch = mime.match(/audio\/(.+)/);
		const ext = extMatch ? extMatch[1].replace(/[^a-z0-9]/gi, '') : 'webm';
		const filename = `${sampleBaseName.replace(/[^a-z0-9-_]/gi, '_')}.${ext}`;

		this.progressBar.style.display = 'block';
		this.progressBar.value = 0;

		const form = new FormData();
		form.append('files', this.lastBlob, filename);
		// ask server to create the preset JSON with the folder name
		form.append('presetName', presetName);

		const uploadUrl = `${this.apiBase.replace(/\/$/, '')}/api/upload/${encodeURIComponent(folder)}`;

		try {
			const sendForm = (formData) => new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('POST', uploadUrl, true);

				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable && this.progressBar) {
						this.progressBar.value = (e.loaded / e.total) * 100;
					}
				};

				xhr.onload = () => {
					let parsed = null;
					try { parsed = JSON.parse(xhr.responseText); } catch (e) { parsed = { raw: xhr.responseText }; }
					resolve({ status: xhr.status, body: parsed });
				};

				xhr.onerror = () => reject(new Error('Network error during upload'));
				xhr.send(formData);
			});

			let uploadResp = await sendForm(form);

			if (uploadResp && uploadResp.status === 409) {
				const ok = confirm('Le preset existe déjà. Voulez-vous l\u00e9craser ?');
				if (!ok) {
					this.progressBar.style.display = 'none';
					alert('Envoi annulé.');
					return;
				}
				form.append('overwrite', 'true');
				uploadResp = await sendForm(form);
			}

			this.progressBar.style.display = 'none';

			if (uploadResp && uploadResp.body && uploadResp.body.preset) {
				const presetName = uploadResp.body.preset.name || uploadResp.body.preset.slug || 'nouveau preset';
				console.log('Preset créé/mis à jour:', presetName);

				if (this.presetManager) {
					await this.presetManager.addPresetDynamically(uploadResp.body.preset, true);
					alert(`Enregistrement envoyé et preset "${presetName}" créé/mis à jour !`);
				} else {
					alert(`Preset "${presetName}" créé ! Rechargez la page pour le voir.`);
				}
				return uploadResp.body.preset;
			}

			alert('Upload réussi : ' + (uploadResp.body && uploadResp.body.files && uploadResp.body.files[0] && uploadResp.body.files[0].url ? uploadResp.body.files[0].url : 'ok'));
			return uploadResp.body;
		} catch (err) {
			this.progressBar.style.display = 'none';
			console.error('Upload/creation error:', err);
			alert('Erreur pendant l’envoi : ' + err.message);
			throw err;
		}
	}

	_uploadWithProgress(url, blob, sampleName) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', url, true);
			xhr.setRequestHeader('X-Sample-Name', sampleName);

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable && this.progressBar) {
					this.progressBar.value = (e.loaded / e.total) * 100;
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(xhr.responseText);
				} else {
					reject(new Error(`Erreur HTTP ${xhr.status}`));
				}
			};

			xhr.onerror = () => reject(new Error('Erreur réseau'));
			xhr.send(blob);
		});
	}

	_renderWave(canvas, decodedAudioBuffer) {
		if (!canvas || !decodedAudioBuffer) return;

		try {
			const drawer = new WaveformDrawer();
			drawer.init(decodedAudioBuffer, canvas, '#83E83E');
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			drawer.drawWave(0, canvas.height);
		} catch (err) {
			console.error('Waveform draw failed:', err);
		}
	}

	_maximizeSampleInPlace(sample) {
		const numChannels = sample.numberOfChannels;
		let maxValue = 0;

		for (let i = 0; i < numChannels; i++) {
			const data = sample.getChannelData(i);
			for (const v of data) {
				maxValue = Math.max(maxValue, Math.abs(v));
			}
		}

		const amp = 1 / maxValue;
		for (let i = 0; i < numChannels; i++) {
			const data = sample.getChannelData(i);
			for (let j = 0; j < data.length; j++) {
				data[j] *= amp;
			}
		}
	}
}
