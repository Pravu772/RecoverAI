import { useState, useEffect } from 'react';

const SIZE_MAP = {
  sm: { ring: 28, stroke: 2,   fontSize: '0.625rem' },
  md: { ring: 44, stroke: 2.5, fontSize: '0.6875rem' },
  lg: { ring: 64, stroke: 3,   fontSize: '0.75rem' },
};

/**
 * LoadingInline — lightweight in-app loading state for cards/sections.
 *
 * Props:
 *   isLoading  boolean  — show/hide (fades out gracefully)
 *   label      string   — text beneath the ring (optional)
 *   size       'sm'|'md'|'lg'  — ring size preset (default: 'md')
 *   minHeight  string   — CSS min-height of the container (default: '140px')
 */
const LoadingInline = ({ isLoading, label = 'Loading…', size = 'md', minHeight = '140px' }) => {
  const [visible, setVisible] = useState(isLoading);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFading(false);
      setVisible(true);
    } else if (visible) {
      setFading(true);
      const t = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isLoading, visible]);

  if (!visible) return null;

  const { ring, stroke, fontSize } = SIZE_MAP[size] || SIZE_MAP.md;
  const r = (ring - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className="loading-inline-wrap"
      style={{
        minHeight,
        opacity: fading ? 0 : 1,
        transition: 'opacity 250ms ease',
      }}
      role="status"
      aria-label={label || 'Loading'}
    >
      {/* Gradient ring spinner */}
      <svg
        width={ring}
        height={ring}
        viewBox={`0 0 ${ring} ${ring}`}
        fill="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="inlineRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#14b8a6" />  {/* teal-500 */}
            <stop offset="100%" stopColor="#10b981" />  {/* emerald-500 */}
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={r}
          stroke="rgba(79,70,229,0.1)"
          strokeWidth={stroke}
          fill="none"
        />

        {/* Animated dash */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={r}
          stroke="url(#inlineRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * 0.65} ${circ * 0.35}`}
          strokeDashoffset={circ * 0.25}
          fill="none"
          className="loading-inline-ring"
          style={{ transformOrigin: `${ring / 2}px ${ring / 2}px` }}
        />
      </svg>

      {/* Label */}
      {label && (
        <span className="loading-inline-label" style={{ fontSize }}>
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingInline;
