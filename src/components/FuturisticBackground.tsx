export const FuturisticBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Animated sine wave patterns */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Wave 1 */}
        <path
          d="M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 T2500,100 T3000,100"
          stroke="hsl(var(--primary) / 0.15)"
          strokeWidth="2"
          fill="none"
          className="animate-wave"
          style={{ animationDuration: '8s' }}
        />
        
        {/* Wave 2 */}
        <path
          d="M0,200 Q250,150 500,200 T1000,200 T1500,200 T2000,200 T2500,200 T3000,200"
          stroke="hsl(var(--primary) / 0.1)"
          strokeWidth="2"
          fill="none"
          className="animate-wave"
          style={{ animationDuration: '12s', animationDelay: '1s' }}
        />
        
        {/* Wave 3 */}
        <path
          d="M0,350 Q250,300 500,350 T1000,350 T1500,350 T2000,350 T2500,350 T3000,350"
          stroke="hsl(var(--accent) / 0.12)"
          strokeWidth="2"
          fill="none"
          className="animate-wave"
          style={{ animationDuration: '10s', animationDelay: '2s' }}
        />
        
        {/* Wave 4 */}
        <path
          d="M0,500 Q250,450 500,500 T1000,500 T1500,500 T2000,500 T2500,500 T3000,500"
          stroke="hsl(var(--primary) / 0.08)"
          strokeWidth="2"
          fill="none"
          className="animate-wave"
          style={{ animationDuration: '15s' }}
        />
        
        {/* Wave 5 */}
        <path
          d="M0,650 Q250,600 500,650 T1000,650 T1500,650 T2000,650 T2500,650 T3000,650"
          stroke="hsl(var(--accent) / 0.1)"
          strokeWidth="2"
          fill="none"
          className="animate-wave"
          style={{ animationDuration: '11s', animationDelay: '3s' }}
        />
        
        {/* Particles following wave paths */}
        <circle cx="0" cy="100" r="3" fill="hsl(var(--primary) / 0.25)">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            path="M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 T2500,100 T3000,100"
          />
        </circle>
        
        <circle cx="200" cy="100" r="2" fill="hsl(var(--primary) / 0.2)">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            path="M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 T2500,100 T3000,100"
          />
        </circle>
        
        <circle cx="0" cy="200" r="2.5" fill="hsl(var(--primary) / 0.18)">
          <animateMotion
            dur="12s"
            repeatCount="indefinite"
            path="M0,200 Q250,150 500,200 T1000,200 T1500,200 T2000,200 T2500,200 T3000,200"
          />
        </circle>
        
        <circle cx="300" cy="200" r="2" fill="hsl(var(--primary) / 0.15)">
          <animateMotion
            dur="12s"
            repeatCount="indefinite"
            path="M0,200 Q250,150 500,200 T1000,200 T1500,200 T2000,200 T2500,200 T3000,200"
          />
        </circle>
        
        <circle cx="0" cy="350" r="3.5" fill="hsl(var(--accent) / 0.22)">
          <animateMotion
            dur="10s"
            repeatCount="indefinite"
            path="M0,350 Q250,300 500,350 T1000,350 T1500,350 T2000,350 T2500,350 T3000,350"
          />
        </circle>
        
        <circle cx="150" cy="350" r="2" fill="hsl(var(--accent) / 0.18)">
          <animateMotion
            dur="10s"
            repeatCount="indefinite"
            path="M0,350 Q250,300 500,350 T1000,350 T1500,350 T2000,350 T2500,350 T3000,350"
          />
        </circle>
        
        <circle cx="0" cy="500" r="2.5" fill="hsl(var(--primary) / 0.15)">
          <animateMotion
            dur="15s"
            repeatCount="indefinite"
            path="M0,500 Q250,450 500,500 T1000,500 T1500,500 T2000,500 T2500,500 T3000,500"
          />
        </circle>
        
        <circle cx="250" cy="500" r="2" fill="hsl(var(--primary) / 0.12)">
          <animateMotion
            dur="15s"
            repeatCount="indefinite"
            path="M0,500 Q250,450 500,500 T1000,500 T1500,500 T2000,500 T2500,500 T3000,500"
          />
        </circle>
        
        <circle cx="0" cy="650" r="3" fill="hsl(var(--accent) / 0.2)">
          <animateMotion
            dur="11s"
            repeatCount="indefinite"
            path="M0,650 Q250,600 500,650 T1000,650 T1500,650 T2000,650 T2500,650 T3000,650"
          />
        </circle>
        
        <circle cx="180" cy="650" r="2" fill="hsl(var(--accent) / 0.16)">
          <animateMotion
            dur="11s"
            repeatCount="indefinite"
            path="M0,650 Q250,600 500,650 T1000,650 T1500,650 T2000,650 T2500,650 T3000,650"
          />
        </circle>
      </svg>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50 pointer-events-none" />
    </div>
  );
};
