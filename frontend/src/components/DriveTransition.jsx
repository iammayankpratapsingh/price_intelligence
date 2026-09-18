import { useEffect } from 'react';
import { CarRunning } from './CarArt.jsx';

/** Exhaust puffs, staggered so smoke trails continuously from the pipe. */
const PUFFS = [0, 110, 220, 330, 440, 550, 660, 770, 880];

/** Streaks behind the car, at varied heights and speeds, to sell the speed. */
const SPEED_LINES = [
  { top: '34%', width: '22%', left: '18%', delay: 0, duration: 620 },
  { top: '44%', width: '30%', left: '40%', delay: 120, duration: 700 },
  { top: '58%', width: '18%', left: '12%', delay: 240, duration: 560 },
  { top: '66%', width: '26%', left: '50%', delay: 80, duration: 660 },
  { top: '72%', width: '14%', left: '30%', delay: 320, duration: 600 },
];

/**
 * Full-screen sign-in flourish: a car drives left to right trailing exhaust
 * smoke, then `onDone` fires and the app unlocks.
 */
export default function DriveTransition({ onDone, duration = 1500, name }) {
  useEffect(() => {
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [onDone, duration]);

  return (
    <div className="drive-overlay" role="status" aria-live="polite">
      <span
        style={{
          position: 'absolute', width: 1, height: 1, overflow: 'hidden',
          clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
        }}
      >
        Signed in. Opening the catalog.
      </span>

      {SPEED_LINES.map((l, i) => (
        <div
          key={i}
          className="speed-line"
          aria-hidden="true"
          style={{
            top: l.top,
            left: l.left,
            width: l.width,
            animationDelay: `${l.delay}ms`,
            animationDuration: `${l.duration}ms`,
          }}
        />
      ))}

      <div className="drive-road" aria-hidden="true" />
      <div className="drive-dashes" aria-hidden="true" />

      <div className="drive-car" style={{ '--drive-dur': `${duration}ms` }}>
        <div className="drive-smoke" aria-hidden="true">
          {PUFFS.map((delay) => (
            <div key={delay} className="puff" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
        <CarRunning />
      </div>

      <div className="drive-caption">
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
          {name ? `Welcome back, ${name}` : 'Welcome back'}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', marginTop: 4 }}>
          Opening the catalog…
        </div>
      </div>
    </div>
  );
}
