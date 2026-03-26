import { useRef, useCallback } from "react";

interface HapticFeedbackOptions {
  rippleColor?: string;
  rippleDuration?: number;
  scaleAmount?: number;
}

export const useHapticFeedback = (options: HapticFeedbackOptions = {}) => {
  const {
    rippleColor = "hsl(var(--primary) / 0.3)",
    rippleDuration = 600,
    scaleAmount = 0.95,
  } = options;

  const elementRef = useRef<HTMLElement | null>(null);

  const createRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: ${rippleColor};
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: ripple-expand ${rippleDuration}ms ease-out;
    `;

    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.appendChild(ripple);

    // Button press animation
    element.style.transform = `scale(${scaleAmount})`;
    element.style.transition = "transform 100ms ease-out";

    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 100);

    setTimeout(() => {
      ripple.remove();
    }, rippleDuration);

    // Add keyframes if not already added
    if (!document.getElementById("haptic-feedback-styles")) {
      const style = document.createElement("style");
      style.id = "haptic-feedback-styles";
      style.textContent = `
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.6;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, [rippleColor, rippleDuration, scaleAmount]);

  return { elementRef, createRipple };
};
