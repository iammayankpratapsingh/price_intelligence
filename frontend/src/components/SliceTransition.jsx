import { useEffect } from 'react';
import { CarRunning } from './CarArt.jsx';
import LoginScreen from './LoginScreen.jsx';

/** Exhaust puffs, staggered so smoke trails continuously from the pipe. */
const PUFFS = [0, 110, 220, 330, 440, 550, 660, 770, 880];

/**
 * The sign-in screen unzipped by a passing car.
 *
 * Both halves are hinged at the right-hand end of the seam. As the car drives
 * right the halves rotate apart about that hinge, so the gap is widest at the
 * left — where the car has already been — and still shut ahead of it, the way a
 * zip bag opens. The screen stays one continuous piece rather than tearing.
 */
export default function SliceTransition({ onDone, duration = 1600, screenProps }) {
  useEffect(() => {
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [onDone, duration]);

  const half = (
    <div style={{ position: 'absolute', inset: 0 }}>
      <LoginScreen {...screenProps} inert hideHero />
    </div>
  );

  return (
    <div className="slice-stage" style={{ '--slice-dur': `${duration}ms` }}>
      <span
        style={{
          position: 'absolute', width: 1, height: 1, overflow: 'hidden',
          clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
        }}
      >
        Signed in. Opening the catalog.
      </span>

      {/* What shows through the cut once the halves part. */}
      <div className="slice-reveal" aria-hidden="true">
        <div className="slice-brand">
          <div className="slice-mark">PX</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>PartsIndex</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Opening the catalog…</div>
          </div>
        </div>
      </div>

      <div className="slice-half slice-top" aria-hidden="true">{half}</div>
      <div className="slice-half slice-bottom" aria-hidden="true">{half}</div>

      {/* The cut itself: a bright line that opens along the seam. */}
      <div className="slice-flash" aria-hidden="true" />

      <div className="slice-car" aria-hidden="true">
        <div className="drive-smoke">
          {PUFFS.map((delay) => (
            <div key={delay} className="puff" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
        <CarRunning />
      </div>
    </div>
  );
}
