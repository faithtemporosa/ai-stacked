import { useEffect, useRef } from "react";

interface ParticleTrailOptions {
  color?: string;
  size?: number;
  lifetime?: number;
  particlesPerMove?: number;
}

export const useParticleTrail = (options: ParticleTrailOptions = {}) => {
  const {
    color = "hsl(var(--primary))",
    size = 6,
    lifetime = 1000,
    particlesPerMove = 2,
  } = options;

  const elementRef = useRef<HTMLElement | null>(null);
  const isHovering = useRef(false);
  const particleCount = useRef(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const createParticle = (x: number, y: number) => {
      const particle = document.createElement("div");
      particle.className = "particle-trail";
      particleCount.current++;
      
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        animation: particle-fade ${lifetime}ms ease-out forwards;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
        particleCount.current--;
      }, lifetime);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovering.current) return;
      
      const rect = element.getBoundingClientRect();
      const isOverElement =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isOverElement) {
        for (let i = 0; i < particlesPerMove; i++) {
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          createParticle(e.clientX + offsetX, e.clientY + offsetY);
        }
      }
    };

    const handleMouseEnter = () => {
      isHovering.current = true;
    };

    const handleMouseLeave = () => {
      isHovering.current = false;
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousemove", handleMouseMove);

    // Add keyframes if not already added
    if (!document.getElementById("particle-trail-styles")) {
      const style = document.createElement("style");
      style.id = "particle-trail-styles";
      style.textContent = `
        @keyframes particle-fade {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx, 0), var(--ty, 30px)) scale(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [color, size, lifetime, particlesPerMove]);

  return elementRef;
};
