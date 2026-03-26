import { useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize audio context on first user interaction
  const initializeAudioContext = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('Audio context initialized:', audioContextRef.current.state);
      }
      
      // Resume if suspended (common on mobile)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('Audio context resumed');
      }

      // Create and prepare audio element for iOS
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.preload = 'auto';
        
        // Add to document for mobile compatibility
        audioElementRef.current.style.display = 'none';
        document.body.appendChild(audioElementRef.current);
        
        // Play silent audio to unlock iOS audio
        const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v/////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGLUIF2YgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWLVZZ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnLADLIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        
        audioElementRef.current.src = silentAudio;
        await audioElementRef.current.play().catch(() => {
          console.log('Silent audio play blocked - normal on some browsers');
        });
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }, []);

  const playAudioFromBase64 = useCallback(async (base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Ensure audio context is initialized
        initializeAudioContext();

        // Create or reuse audio element
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
          audioElementRef.current.preload = 'auto';
          audioElementRef.current.crossOrigin = 'anonymous';
          
          // Add to document to help with mobile playback
          audioElementRef.current.style.display = 'none';
          document.body.appendChild(audioElementRef.current);
        }

        const audio = audioElementRef.current;
        
        // Set up audio analyzer for visualization
        if (audioContextRef.current && !analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          
          // Connect audio element to analyzer
          if (!sourceRef.current) {
            sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
          }
        }
        
        // Set the source
        audio.src = `data:audio/mp3;base64,${base64Audio}`;
        
        // Load the audio
        audio.load();

        const handleEnded = () => {
          console.log('Audio playback completed');
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          resolve();
        };

        const handleError = (error: Event) => {
          console.error('Audio playback error:', error);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          reject(new Error('Failed to play audio'));
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Play the audio
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio playback started successfully');
            })
            .catch((error) => {
              console.error('Audio play() failed:', error);
              audio.removeEventListener('ended', handleEnded);
              audio.removeEventListener('error', handleError);
              reject(new Error(`Audio autoplay blocked: ${error.message}`));
            });
        }
      } catch (error) {
        console.error('Error in audio playback:', error);
        reject(error);
      }
    });
  }, [initializeAudioContext]);

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      if (audioElementRef.current.parentNode) {
        audioElementRef.current.parentNode.removeChild(audioElementRef.current);
      }
      audioElementRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      console.log('Audio stopped');
    }
  }, []);

  const getAudioAnalyser = useCallback(() => {
    return analyserRef.current;
  }, []);

  return {
    initializeAudioContext,
    playAudioFromBase64,
    stopAudio,
    cleanup,
    getAudioAnalyser,
    audioElement: audioElementRef.current
  };
};
