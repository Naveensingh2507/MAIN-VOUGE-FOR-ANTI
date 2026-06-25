import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { ArrowRight, Play } from "lucide-react";
import { useAppState } from "../state/AppState";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { requireAuth } = useAppState();

  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const frameCount = 84;
  const currentFrame = useRef(0);

  // Eager Preload 001-084
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;
    
    // Check if on mobile (simple check)
    const isMobile = window.innerWidth <= 768;
    
    for (let i = 1; i <= frameCount; i++) {
      // Mobile logic: Load every 3rd frame (plus first and last to ensure boundaries)
      if (isMobile && i !== 1 && i !== frameCount && i % 3 !== 0) {
        continue;
      }
      
      const img = new Image();
      const frameStr = i.toString().padStart(3, "0");
      img.src = `/sequence/frame_${frameStr}.svg`; // using our generated SVGs
      
      // Store in sparse array if skipping frames, or dense if not
      loadedImages[i - 1] = img;

      img.onload = () => {
        loadedCount++;
        // If first image is loaded, draw it immediately
        if (i === 1) {
          renderFrame(0, loadedImages);
        }
      };
    }
    setImages(loadedImages);
  }, []);

  const renderFrame = (index: number, imgArray: HTMLImageElement[] = images) => {
    if (!canvasRef.current || imgArray.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Find closest loaded frame if skipping
    let imgToDraw = imgArray[index];
    if (!imgToDraw) {
      // Find nearest preceding frame
      for (let i = index; i >= 0; i--) {
        if (imgArray[i]) {
          imgToDraw = imgArray[i];
          break;
        }
      }
    }
    
    if (imgToDraw && imgToDraw.complete) {
      // Clear and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image to cover canvas (object-fit: cover equivalent)
      const hRatio = canvas.width / imgToDraw.width;
      const vRatio = canvas.height / imgToDraw.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShift_x = (canvas.width - imgToDraw.width * ratio) / 2;
      const centerShift_y = (canvas.height - imgToDraw.height * ratio) / 2;
      
      ctx.drawImage(
        imgToDraw, 
        0, 0, imgToDraw.width, imgToDraw.height,
        centerShift_x, centerShift_y, imgToDraw.width * ratio, imgToDraw.height * ratio
      );
    }
  };

  useEffect(() => {
    if (!containerRef.current || !titleRef.current) return;

    // Handle SplitText replacement using SplitType
    const splitTitle = new SplitType(titleRef.current, { types: 'chars' });
    
    // Set initial states
    gsap.set(splitTitle.chars, { opacity: 0 });
    gsap.set(subtitleRef.current, { opacity: 0 });
    gsap.set(ctaRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=3000", // Length of the scrub
        scrub: 1, // Smooth scrubbing
        pin: true,
      }
    });

    // Act A: Frame 010 (approx 12% into the scroll) -> Text Fades In
    // Canvas Scrub Mapping
    tl.to(currentFrame, {
      current: frameCount - 1,
      snap: "current",
      ease: "none",
      onUpdate: () => {
        const frameIndex = Math.round(gsap.utils.clamp(0, frameCount - 1, currentFrame.current));
        renderFrame(frameIndex);
      }
    }, 0);

    // Frame 010 equivalent
    tl.to(splitTitle.chars, {
      opacity: 1,
      stagger: 0.04,
      duration: 0.1, // timeline percentage
      ease: "power2.out",
    }, 0.12);
    
    // Letter-spacing animation
    tl.fromTo(titleRef.current, {
      letterSpacing: "0.6em",
    }, {
      letterSpacing: "0.05em",
      duration: 0.3,
      ease: "power2.out"
    }, 0.12);

    // Act B: Frame 048 (approx 57% into the scroll)
    tl.to(subtitleRef.current, {
      opacity: 1,
      duration: 0.1
    }, 0.57);

    tl.to(ctaRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.1,
      ease: "back.out(1.7)"
    }, 0.57);

    // Act C: Frame 070 (approx 83% into scroll) -> Section 1 Entrance vignette
    tl.to(".vignette-overlay", {
      opacity: 0.6,
      duration: 0.17 // Over ~30 scroll frames (30/84)
    }, 0.83);

    // Fade out chevron
    tl.to(".scroll-indicator", {
      opacity: 0,
      duration: 0.05
    }, 0.71); // Frame 060

    return () => {
      splitTitle.revert();
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [images]);

  // Handle magnetic hover
  const handleMagneticHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // +/- 12px pull radius as requested
    gsap.to(btn, {
      x: x * 0.2, // dampen the pull
      y: y * 0.2,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleMagneticLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)"
    });
  };

  const startJourney = () => {
    if (requireAuth("Sign in to build your Digital Closet.", "/dashboard")) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative bg-black text-white" ref={containerRef}>
      {/* Sticky Canvas Container */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Vignette Overlay (Act C) */}
        <div className="vignette-overlay absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#000_100%)] opacity-0 z-10 pointer-events-none" />

        {/* Particles Field */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-15 animate-particle-rise"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100 + 100}%`, // Start below screen
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* UI Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center w-full px-5 pointer-events-auto">
            <h1 
              ref={titleRef}
              className="text-5xl md:text-[8vw] font-extrabold uppercase tracking-widest mb-4"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
            >
              Antigravity
            </h1>
            
            <p 
              ref={subtitleRef}
              className="text-lg md:text-2xl font-light text-white/80 tracking-wide mt-2 mb-12"
            >
              Where weight becomes will
            </p>

            <div 
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <button 
                onClick={startJourney}
                onMouseMove={handleMagneticHover}
                onMouseLeave={handleMagneticLeave}
                className="group relative flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold overflow-hidden transition-colors hover:bg-neutral-200 pointer-events-auto"
              >
                <span>Explore</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onMouseMove={handleMagneticHover}
                onMouseLeave={handleMagneticLeave}
                className="group flex items-center justify-center gap-3 text-white border border-white/30 px-8 py-4 rounded-full font-semibold backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50 pointer-events-auto"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Watch Experience</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Depth Bar / Indicator */}
        <div className="scroll-indicator absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
          <span className="text-xs uppercase tracking-widest text-white/50 font-medium">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent animate-pulse" />
        </div>

        {/* Floating Nav */}
        <nav className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-center pointer-events-auto">
          <div className="text-xl font-bold tracking-tighter">AG</div>
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/dashboard" className="hover:opacity-70 transition-opacity">Closet</Link>
            <Link to="/style" className="hover:opacity-70 transition-opacity">Style</Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
