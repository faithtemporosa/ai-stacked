// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceAssistantProps {
  onStart: () => void;
  onStop: () => void;
  isListening: boolean;
  audioAnalyser?: AnalyserNode | null;
  isSpeaking?: boolean;
  disabled?: boolean;
}

/**
 * Siri-style Voice UI Component
 * 
 * Features:
 * - Iconic Siri orb with overlapping colorful spheres (red, cyan, purple, teal)
 * - Smooth pulsating animation when active
 * - Animated waveform with 25 vertical bars
 * - Bars animate independently with randomized heights
 * - Mobile and desktop responsive
 * - Matches Apple Siri visual style using CSS animations
 */
const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  onStart, 
  onStop, 
  isListening, 
  audioAnalyser,
  isSpeaking = false,
  disabled = false 
}) => {
  const bars = 25;
  // Initialize 25 bars for Siri-style waveform
  const [waveformHeights, setWaveformHeights] = useState<number[]>(
    Array.from({ length: bars }, () => 8)
  );
  
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(0));
  const particleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  
  const particleColors = [
    'rgba(236, 72, 153, 0.8)', // pink
    'rgba(56, 189, 248, 0.8)', // cyan
    'rgba(168, 85, 247, 0.8)', // purple
    'rgba(20, 184, 166, 0.8)', // teal
  ];

  // Initialize frequency data array
  useEffect(() => {
    if (audioAnalyser) {
      frequencyDataRef.current = new Uint8Array(audioAnalyser.frequencyBinCount);
    }
  }, [audioAnalyser]);

  // Create particle effect when speaking
  useEffect(() => {
    if (isSpeaking && orbRef.current) {
      const createParticle = () => {
        if (!orbRef.current) return;
        
        const rect = orbRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create 2-3 particles per emission
        const particleCount = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < particleCount; i++) {
          const particle = document.createElement('div');
          const color = particleColors[Math.floor(Math.random() * particleColors.length)];
          const size = 4 + Math.random() * 6;
          const angle = Math.random() * Math.PI * 2;
          const velocity = 50 + Math.random() * 100;
          const lifetime = 1000 + Math.random() * 500;
          
          particle.className = 'voice-particle';
          particle.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 0 10px ${color};
          `;
          
          document.body.appendChild(particle);
          
          // Animate particle
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / lifetime;
            
            if (progress >= 1) {
              particle.remove();
              return;
            }
            
            const distance = velocity * (elapsed / 1000);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const opacity = 1 - progress;
            const scale = 1 - progress * 0.5;
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.opacity = opacity.toString();
            particle.style.transform = `scale(${scale})`;
            
            requestAnimationFrame(animate);
          };
          
          requestAnimationFrame(animate);
        }
      };
      
      // Emit particles every 150ms while speaking
      createParticle(); // Initial burst
      particleIntervalRef.current = setInterval(createParticle, 150);
      
      return () => {
        if (particleIntervalRef.current) {
          clearInterval(particleIntervalRef.current);
          particleIntervalRef.current = null;
        }
        // Clean up any remaining particles
        document.querySelectorAll('.voice-particle').forEach(p => p.remove());
      };
    }
  }, [isSpeaking, particleColors]);

  // Smooth waveform animation with breathing pattern or audio analysis
  useEffect(() => {
    if (!isListening && !isSpeaking) {
      // Reset to minimal heights when not active
      setWaveformHeights(Array.from({ length: bars }, () => 8));
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      // ~60ms cadence for smooth updates (matching typical Siri)
      if (timestamp - lastTickRef.current > 60) {
        lastTickRef.current = timestamp;

        // If speaking and we have audio analyzer, use real audio data
        if (isSpeaking && audioAnalyser && frequencyDataRef.current.length > 0) {
          const dataArray = frequencyDataRef.current;
          // @ts-ignore - AnalyserNode type definition issue with Uint8Array
          audioAnalyser.getByteFrequencyData(dataArray);
          
          setWaveformHeights((prev) =>
            prev.map((_, i) => {
              // Map each bar to a frequency range
              const dataIndex = Math.floor((i / bars) * dataArray.length);
              const value = dataArray[dataIndex] || 0;
              
              // Scale the frequency value (0-255) to bar height (6-50)
              const normalized = value / 255;
              const height = 6 + (normalized * 44);
              
              return Math.max(6, Math.min(50, height));
            })
          );
        } else {
          // Fallback to simulated animation when listening (no audio playing)
          setWaveformHeights((prev) =>
            prev.map((_, i) => {
              // Create breathing variation across bars with sine wave
              const base = 6 + (Math.sin((timestamp / 600) + i * 0.35) + 1) * 10; // 6–26
              const jitter = Math.random() * 10; // +0–10 random variation
              const max = 44; // cap the height
              return Math.min(max, Math.max(6, base + jitter));
            })
          );
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isListening, isSpeaking, bars, audioAnalyser]);

  const handleClick = () => {
    if (disabled) return;
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-10 py-12 w-full">
      {/* Siri Orb - Multi-sphere design with pulsating animation */}
      <div ref={orbRef} className="relative flex items-center justify-center w-64 h-64">
        {/* Circular wave rings around the orb - Siri style */}
        {isListening && (
          <>
            {/* Wave ring 1 - Innermost */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '220px',
                height: '220px',
                border: '2px solid rgba(168, 85, 247, 0.6)',
                animation: 'siriWaveExpand 1.5s ease-out infinite',
                animationDelay: '0s',
              }}
            />
            {/* Wave ring 2 */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '220px',
                height: '220px',
                border: '2px solid rgba(56, 189, 248, 0.5)',
                animation: 'siriWaveExpand 1.5s ease-out infinite',
                animationDelay: '0.3s',
              }}
            />
            {/* Wave ring 3 */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '220px',
                height: '220px',
                border: '2px solid rgba(236, 72, 153, 0.4)',
                animation: 'siriWaveExpand 1.5s ease-out infinite',
                animationDelay: '0.6s',
              }}
            />
            {/* Wave ring 4 - Outermost */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '220px',
                height: '220px',
                border: '2px solid rgba(20, 184, 166, 0.3)',
                animation: 'siriWaveExpand 1.5s ease-out infinite',
                animationDelay: '0.9s',
              }}
            />
          </>
        )}
        
        {/* Outer glow ring when listening */}
        {isListening && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        )}
        
        {/* Main clickable area */}
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`relative w-48 h-48 rounded-full flex items-center justify-center group z-10 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          aria-label={disabled ? 'Voice assistant' : isListening ? 'Stop listening' : 'Start listening'}
          style={{
            background: 'transparent',
          }}
        >
          {/* Siri Orb Container */}
          <div 
            className={`absolute inset-0 rounded-full transition-all duration-700 ${
              isListening ? 'scale-110' : 'scale-100 group-hover:scale-105'
            }`}
            style={{
              background: 'radial-gradient(circle at center, rgba(30, 30, 60, 0.4), rgba(20, 20, 40, 0.8))',
            }}
          >
            {/* Red/Pink Sphere - Top Right */}
            <div 
              className={`absolute top-12 right-12 w-32 h-32 rounded-full ${
                isListening ? 'animate-pulse' : ''
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.9), rgba(219, 39, 119, 0.6))',
                filter: 'blur(20px)',
                mixBlendMode: 'screen',
                animation: isListening ? 'siriPulse 2s ease-in-out infinite, siriOrbit 8s linear infinite' : 'siriOrbit 12s linear infinite',
                animationDelay: '0s',
                transformOrigin: 'center',
              }}
            />

            {/* Cyan/Blue Sphere - Left */}
            <div 
              className={`absolute top-16 left-8 w-36 h-36 rounded-full ${
                isListening ? 'animate-pulse' : ''
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.9), rgba(14, 165, 233, 0.6))',
                filter: 'blur(20px)',
                mixBlendMode: 'screen',
                animation: isListening ? 'siriPulse 2s ease-in-out infinite, siriOrbitReverse 10s linear infinite' : 'siriOrbitReverse 14s linear infinite',
                animationDelay: '0.3s',
                transformOrigin: 'center',
              }}
            />

            {/* Purple Sphere - Center */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full ${
                isListening ? 'animate-pulse' : ''
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.9), rgba(147, 51, 234, 0.7))',
                filter: 'blur(18px)',
                mixBlendMode: 'screen',
                animation: isListening ? 'siriPulse 2s ease-in-out infinite, siriOrbit 12s linear infinite' : 'siriOrbit 16s linear infinite',
                animationDelay: '0.6s',
                transformOrigin: 'center',
              }}
            />

            {/* Teal/Green Sphere - Bottom Right */}
            <div 
              className={`absolute bottom-10 right-16 w-32 h-32 rounded-full ${
                isListening ? 'animate-pulse' : ''
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(20, 184, 166, 0.9), rgba(13, 148, 136, 0.6))',
                filter: 'blur(20px)',
                mixBlendMode: 'screen',
                animation: isListening ? 'siriPulse 2s ease-in-out infinite, siriOrbitReverse 9s linear infinite' : 'siriOrbitReverse 13s linear infinite',
                animationDelay: '0.9s',
                transformOrigin: 'center',
              }}
            />

            {/* Central White Glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))',
                filter: 'blur(15px)',
                mixBlendMode: 'screen',
                opacity: isListening ? 1 : 0.7,
              }}
            />

            {/* Microphone Icon in Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              {isListening ? (
                <MicOff className="w-10 h-10 text-white drop-shadow-2xl" />
              ) : (
                <Mic className="w-10 h-10 text-white drop-shadow-2xl" />
              )}
            </div>
          </div>

          {/* Outer ring glow */}
          {isListening && (
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                background: 'radial-gradient(circle, transparent 60%, rgba(139, 92, 246, 0.3), transparent)',
                opacity: 0.5,
              }}
            />
          )}
        </button>
      </div>

      {/* Siri-style Waveform - Centered with 25 bars */}
      <div 
        className={`
          flex items-center justify-center gap-1 h-16
          transition-all duration-500 ease-in-out
          ${isListening || isSpeaking ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        {waveformHeights.map((height, index) => (
          <div
            key={index}
            className="w-1 rounded-full"
            style={{
              height: `${height}px`,
              background: 'linear-gradient(to top, #38bdf8, #a855f7, #ec4899)',
              transition: isSpeaking ? 'height 60ms ease-out' : `height ${120 + Math.random() * 60}ms ease-in-out`,
              opacity: (isListening || isSpeaking) ? 0.9 : 0,
            }}
          />
        ))}
      </div>

      {/* Status Text - Centered */}
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : disabled ? 'Voice Assistant' : 'Tap to speak'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isSpeaking ? 'Assistant is responding' : isListening ? 'Tap again to stop' : disabled ? 'Your AI assistant is ready to help' : 'Ask me about automations'}
        </p>
      </div>

      {/* CSS Animations for Siri pulsating and orbiting effects */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes siriPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
        
        @keyframes siriOrbit {
          0% {
            transform: rotate(0deg) translateX(8px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(8px) rotate(-360deg);
          }
        }
        
        @keyframes siriOrbitReverse {
          0% {
            transform: rotate(0deg) translateX(-8px) rotate(0deg);
          }
          100% {
            transform: rotate(-360deg) translateX(-8px) rotate(360deg);
          }
        }
        
        @keyframes siriWaveExpand {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
};

export default VoiceAssistant;
