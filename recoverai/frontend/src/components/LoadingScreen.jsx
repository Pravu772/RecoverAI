import { useState, useEffect, useRef } from 'react';

/**
 * Pre-computed streak data — stable constants, no Math.random() at render-time.
 * 16 streaks with varied top position, speed, delay, opacity, and width.
 * Every 3rd streak carries a tiny ₹ symbol particle.
 */
const STREAKS = [
  { top: '4%', duration: 4.2, delay: 0, opacity: 0.13, width: 220, hasRupee: false },
  { top: '9%', duration: 5.8, delay: 0.7, opacity: 0.09, width: 160, hasRupee: false },
  { top: '15%', duration: 3.9, delay: 1.4, opacity: 0.17, width: 300, hasRupee: true },
  { top: '21%', duration: 6.5, delay: 0.3, opacity: 0.10, width: 190, hasRupee: false },
  { top: '27%', duration: 4.7, delay: 2.1, opacity: 0.14, width: 240, hasRupee: false },
  { top: '33%', duration: 5.2, delay: 0.9, opacity: 0.08, width: 170, hasRupee: true },
  { top: '39%', duration: 3.6, delay: 1.8, opacity: 0.18, width: 280, hasRupee: false },
  { top: '45%', duration: 7.1, delay: 0.4, opacity: 0.11, width: 210, hasRupee: false },
  { top: '51%', duration: 4.4, delay: 2.6, opacity: 0.16, width: 320, hasRupee: true },
  { top: '57%', duration: 5.9, delay: 1.1, opacity: 0.09, width: 155, hasRupee: false },
  { top: '63%', duration: 3.8, delay: 0.6, opacity: 0.15, width: 265, hasRupee: false },
  { top: '69%', duration: 6.3, delay: 1.9, opacity: 0.12, width: 195, hasRupee: true },
  { top: '75%', duration: 4.1, delay: 0.2, opacity: 0.18, width: 310, hasRupee: false },
  { top: '81%', duration: 5.5, delay: 2.3, opacity: 0.10, width: 175, hasRupee: false },
  { top: '87%', duration: 3.7, delay: 1.5, opacity: 0.14, width: 245, hasRupee: true },
  { top: '93%', duration: 6.8, delay: 0.8, opacity: 0.08, width: 200, hasRupee: false },
];

/* SVG ring constants — circumference of circle with r=58 ≈ 364.4px */
const RING_R = 58;
const RING_SIZE = (RING_R + 10) * 2;   // 136px container
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 364.4

/**
 * LoadingScreen — full-screen cold-load animation.
 *
 * Props:
 *   isLoading  boolean  — tied to actual data-fetch state (no fake delays)
 *   onDone     fn       — called after the 300ms exit fade completes
 */
const LoadingScreen = ({ isLoading, onDone }) => {
  const [phase, setPhase] = useState('enter');     // 'enter' | 'loop' | 'exit' | 'gone'
  const [ringLooping, setRingLooping] = useState(false);
  const doneCalledRef = useRef(false);

  // After the initial 1.5s reveal animation, switch ring to infinite loop mode
  // so it never looks "frozen" while waiting for slow data
  useEffect(() => {
    const t = setTimeout(() => setRingLooping(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // When isLoading goes false → trigger exit sequence
  useEffect(() => {
    if (!isLoading && phase === 'enter') {
      // Data came back before animation finished — wait for reveal to complete
      const t = setTimeout(() => {
        setPhase('exit');
      }, 1200); // let reveal at least mostly complete
      return () => clearTimeout(t);
    }

    if (!isLoading && phase === 'loop') {
      setPhase('exit');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // After reveal animation completes (~1.5s), move to 'loop' if still loading
  useEffect(() => {
    if (phase !== 'enter') return;
    const t = setTimeout(() => {
      setPhase(prev => prev === 'enter' ? 'loop' : prev);
    }, 1600);
    return () => clearTimeout(t);
  }, [phase]);

  // Execute exit: add CSS class → wait 300ms → mark gone → call onDone
  useEffect(() => {
    if (phase !== 'exit') return;
    const t = setTimeout(() => {
      setPhase('gone');
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onDone?.();
      }
    }, 320);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  if (phase === 'gone') return null;

  const isExiting = phase === 'exit';

  return (
    <div
      className={`loading-screen-overlay${isExiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label="RecoverAI is loading"
      aria-live="polite"
    >

      {/* ── Layer 1: Cash Flow Streaks ─────────────────────────────────── */}
      {STREAKS.map((s, i) => (
        <div
          key={i}
          className="loading-flow-line"
          style={{
            top: s.top,
            left: 0,
            width: s.width,
            opacity: s.opacity,
            background: i % 3 === 0
              ? 'linear-gradient(90deg, transparent, #0d9488, #34d399, transparent)'  /* teal→emerald */
              : i % 3 === 1
                ? 'linear-gradient(90deg, transparent, #10b981, transparent)'          /* emerald */
                : 'linear-gradient(90deg, transparent, #14b8a6, transparent)',          /* teal */
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {/* Tiny ₹ particle riding the line */}
          {s.hasRupee && (
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: 600,
                color: i % 2 === 0 ? 'rgba(52,211,153,0.75)' : 'rgba(20,184,166,0.75)',  /* emerald-400 / teal-500 */
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1,
                userSelect: 'none',
              }}
              aria-hidden="true"
            >
              ₹
            </span>
          )}
        </div>
      ))}

      {/* ── Layer 2: Focal Point ───────────────────────────────────────── */}
      <div className="loading-focal-wrap">

        {/* Ring + Symbol container */}
        <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>

          {/* SVG progress ring */}
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="loading-ring-svg"
            style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />   {/* teal-500 */}
                <stop offset="50%" stopColor="#34d399" />   {/* emerald-400 */}
                <stop offset="100%" stopColor="#10b981" />   {/* emerald-500 */}
              </linearGradient>
            </defs>

            {/* Track circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              className="loading-ring-track"
            />

            {/* Animated fill circle */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke="url(#ringGradient)"
              className={`loading-ring-fill${ringLooping ? ' is-looping' : ''}`}
            />
          </svg>

          {/* ₹ Symbol — focal point reveal */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="loading-symbol" aria-hidden="true">
              ₹
            </span>
          </div>
        </div>

        {/* Status labels — crossfade sequence */}
        <div className="loading-label-wrap" aria-hidden="true">
          <span className="loading-label label-1">
            Detecting revenue signals…
          </span>
          <span className="loading-label label-2">
            Recovering…
          </span>
        </div>

        {/* Product wordmark */}
        <span className="loading-wordmark">
          RecoverAI
        </span>
      </div>
    </div>
  );
};

export default LoadingScreen;
