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

		this.ac = options.audioContext || new AudioContext();
		this.limiter = this.ac.createDynamicsCompressor();
		this.limiter.connect(this.ac.destination);

		this.selectors = options.selectors || {
			canvas: 'recordVisualizer',
			record: 'record',
			stop: 'stop',
			play: 'play',
			send: 'send',
			progress: 'progress'
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

			this.recordButton.addEventListener('click', () => this.startRecording());
			this.stopButton.addEventListener('click', () => this.stopRecording());
			this.playButton.addEventListener('click', () => this.playSample());
			this.sendButton.addEventListener('click', () => this.sendToServer());

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

		this.bufferSourceNode = this.ac.createBufferSource();
		this.bufferSourceNode.buffer = sample;
		this.bufferSourceNode.connect(this.limiter);
		this.bufferSourceNode.loop = false;
		this.bufferSourceNode.start();

		this.bufferSourceNode.onended = () => this._disableButtons(false, true, false, false);
		this._renderWave(this.canvas, sample.getChannelData(0));
	}

	playSample() {
		if (!this.lastSample) return;
		this.stopSample();

		this.bufferSourceNode = this.ac.createBufferSource();
		this.bufferSourceNode.buffer = this.lastSample;
		this.bufferSourceNode.connect(this.limiter);
		this.bufferSourceNode.loop = false;
		this.bufferSourceNode.start();

		this._disableButtons(true, true, true, true);
		this.bufferSourceNode.onended = () => this._disableButtons(false, true, false, false);
	}

	stopSample() {
		if (this.bufferSourceNode) {
			try { this.bufferSourceNode.stop(); } catch (e) { }
			try { this.bufferSourceNode.disconnect(); } catch (e) { }
			this.bufferSourceNode = null;
		}
	}

	async sendToServer() {
		if (!this.lastBlob) {
			alert('Aucun enregistrement à envoyer.');
			return;
		}

		const name = prompt('Nom du sample à envoyer :');
		if (!name) {
			alert('Envoi annulé.');
			return;
		}

		this.progressBar.style.display = 'block';
		this.progressBar.value = 0;

		try {
			await this._uploadWithProgress('https://myserver.com/api/samples', this.lastBlob, name);
			this.progressBar.style.display = 'none';
			alert('✅ Sample envoyé avec succès !');
		} catch (err) {
			this.progressBar.style.display = 'none';
			console.error('Upload error:', err);
			alert('Erreur pendant l’envoi : ' + err.message);
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

	_renderWave(canvas, data) {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const w = canvas.width;
		const h = canvas.height;
		const mid = h / 2;

		ctx.fillStyle = '#000000ff';
		ctx.fillRect(0, 0, w, h);

		ctx.strokeStyle = '#4CAF50';
		ctx.lineWidth = 1;
		ctx.beginPath();

		const step = w / data.length;
		let x = 0;
		for (let i = 0; i < data.length; i++) {
			const y = mid - data[i] * mid;
			i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
			x += step;
		}

		ctx.stroke();
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
