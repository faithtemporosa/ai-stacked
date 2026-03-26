export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceDetectionInterval: number | null = null;
  private onSilenceDetected: (() => void) | null = null;
  
  // VAD settings - faster response
  private readonly SILENCE_THRESHOLD = 0.01; // Volume threshold for silence
  private readonly SILENCE_DURATION = 400; // Stop after 400ms of silence (was 1000ms)
  private readonly CHECK_INTERVAL = 50; // Check every 50ms
  private silenceStart: number | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Close the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startRecording(onAutoStop?: () => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Set up audio analysis for VAD
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      // Store callback for auto-stop
      this.onSilenceDetected = onAutoStop || null;

      // Use webm format which is widely supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      
      // Start silence detection
      if (onAutoStop) {
        this.startSilenceDetection();
      }
      
      console.log('Recording started with VAD');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private startSilenceDetection(): void {
    this.silenceStart = null;
    
    this.silenceDetectionInterval = window.setInterval(() => {
      if (!this.analyser || !this.isRecording()) {
        this.stopSilenceDetection();
        return;
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Check if currently silent
      if (rms < this.SILENCE_THRESHOLD) {
        if (this.silenceStart === null) {
          this.silenceStart = Date.now();
        } else if (Date.now() - this.silenceStart >= this.SILENCE_DURATION) {
          console.log('Silence detected - auto stopping');
          this.stopSilenceDetection();
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }
      } else {
        // Reset silence timer if sound detected
        this.silenceStart = null;
      }
    }, this.CHECK_INTERVAL);
  }

  private stopSilenceDetection(): void {
    if (this.silenceDetectionInterval !== null) {
      clearInterval(this.silenceDetectionInterval);
      this.silenceDetectionInterval = null;
    }
    this.silenceStart = null;
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      // Stop silence detection
      this.stopSilenceDetection();

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', audioBlob.size);
        
        // Clean up
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }

        this.analyser = null;
        
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Recording error'));
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export function playAudioFromBase64(base64Audio: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      // Set audio attributes for better mobile compatibility
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      audio.onended = () => {
        console.log('Audio playback completed');
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        reject(new Error('Failed to play audio'));
      };
      
      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
      };
      
      // Play with better error handling for mobile
      audio.play()
        .then(() => {
          console.log('Audio playback started successfully');
        })
        .catch((error) => {
          console.error('Audio play() failed:', error);
          // On mobile, play() might fail if not triggered by user interaction
          // Reject but with more context
          reject(new Error(`Audio autoplay blocked: ${error.message}`));
        });
    } catch (error) {
      console.error('Error creating audio element:', error);
      reject(error);
    }
  });
}
