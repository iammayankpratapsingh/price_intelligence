/**
 * Vector artwork for the sign-in panel. Everything is inline SVG on the theme
 * tokens, so it stays crisp at any size and follows light/dark automatically.
 */

/** Three-quarter view hatchback, the hero illustration. */
export function CarHero({ style }) {
  return (
    <svg viewBox="0 0 520 240" style={{ width: '100%', height: 'auto', display: 'block', ...style }} role="img" aria-label="Illustration of a car">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8546A" />
          <stop offset="55%" stopColor="#C4293A" />
          <stop offset="100%" stopColor="#8E1B28" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D8E4F2" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7E96B4" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="262" cy="205" rx="205" ry="20" fill="url(#shadow)" />

      {/* body */}
      <path
        d="M52 168c-10 0-18-7-18-16v-22c0-12 8-22 20-25l52-13 40-38c9-9 21-14 34-14h84c14 0 27 6 36 17l30 36 52 12c17 4 28 18 28 35v12c0 9-8 16-18 16z"
        fill="url(#body)"
      />
      {/* lower shading */}
      <path
        d="M34 146v6c0 9 8 16 18 16h340c10 0 18-7 18-16v-6z"
        fill="#000"
        opacity="0.16"
      />
      {/* windows */}
      <path d="M168 62h-18c-9 0-17 4-23 11l-28 31h69z" fill="url(#glass)" />
      <path d="M184 62h80c10 0 19 4 25 12l24 30h-129z" fill="url(#glass)" />
      {/* window divider + roof highlight */}
      <path d="M176 62v42" stroke="#8E1B28" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <path d="M146 54c9-9 21-14 34-14h84c14 0 27 6 36 17" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
      {/* door lines */}
      <path d="M176 110v54M268 104v60" stroke="#000" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M196 132h26" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      <path d="M288 132h26" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      {/* body shine sweep */}
      <path d="M60 120h330v12H60z" fill="url(#shine)" />
      {/* lights */}
      <path d="M34 128h26c6 0 10 5 10 11s-4 11-10 11H34z" fill="#FFD48A" />
      <path d="M420 130h-22c-6 0-10 4-10 10s4 10 10 10h22z" fill="#FF6B6B" />
      {/* wheels */}
      <g>
        <circle cx="130" cy="168" r="36" fill="#1B2430" />
        <circle cx="130" cy="168" r="20" fill="#C9CED6" />
        <circle cx="130" cy="168" r="8" fill="#8B93A1" />
        <circle cx="322" cy="168" r="36" fill="#1B2430" />
        <circle cx="322" cy="168" r="20" fill="#C9CED6" />
        <circle cx="322" cy="168" r="8" fill="#8B93A1" />
      </g>
      {/* wheel arches */}
      <path d="M94 168a36 36 0 0 1 72 0" fill="none" stroke="#8E1B28" strokeWidth="6" strokeLinecap="round" />
      <path d="M286 168a36 36 0 0 1 72 0" fill="none" stroke="#8E1B28" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** Small side-profile sedan used as a floating accent. */
export function CarSide({ color = 'currentColor', style }) {
  return (
    <svg viewBox="0 0 200 84" style={{ width: '100%', height: 'auto', display: 'block', ...style }} aria-hidden="true">
      <path
        d="M12 60c-5 0-9-4-9-9v-9c0-6 4-11 10-12l22-5 18-16c4-4 10-6 15-6h38c6 0 12 3 16 8l13 15 24 5c8 2 13 8 13 16v4c0 5-4 9-9 9z"
        fill={color}
        opacity="0.9"
      />
      <path d="M70 16h-8c-4 0-8 2-11 5l-13 14h32z" fill="#fff" opacity="0.55" />
      <path d="M79 16h33c4 0 8 2 11 5l11 14H79z" fill="#fff" opacity="0.55" />
      <circle cx="54" cy="60" r="15" fill="#1B2430" />
      <circle cx="54" cy="60" r="7" fill="#C9CED6" />
      <circle cx="146" cy="60" r="15" fill="#1B2430" />
      <circle cx="146" cy="60" r="7" fill="#C9CED6" />
    </svg>
  );
}

/** Exploded-view parts: a wheel, a piston and a brake disc. */
export function PartsGlyphs({ style }) {
  return (
    <svg viewBox="0 0 300 90" style={{ width: '100%', height: 'auto', display: 'block', ...style }} aria-hidden="true">
      {/* cog / wheel */}
      <g transform="translate(45 45)" stroke="currentColor" strokeWidth="3" fill="none">
        <circle r="26" />
        <circle r="10" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 26}
              y1={Math.sin(a) * 26}
              x2={Math.cos(a) * 34}
              y2={Math.sin(a) * 34}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      {/* piston */}
      <g transform="translate(150 45)" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
        <rect x="-18" y="-33" width="36" height="30" rx="4" />
        <path d="M-18 -25h36M-18 -18h36" />
        <path d="M0 -3v11" />
        <circle cx="0" cy="19" r="11" />
        <circle cx="0" cy="19" r="4" />
      </g>
      {/* brake disc */}
      <g transform="translate(255 45)" stroke="currentColor" strokeWidth="3" fill="none">
        <circle r="28" />
        <circle r="9" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          return <circle key={i} cx={Math.cos(a) * 18} cy={Math.sin(a) * 18} r="3.2" />;
        })}
      </g>
    </svg>
  );
}

/**
 * The hero car facing right, for the drive-across transition. The artwork is
 * mirrored (the hero faces left) and gains an exhaust pipe at the rear plus
 * wheels that spin while it drives.
 */
export function CarRunning({ style }) {
  return (
    <svg
      viewBox="0 0 520 240"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', ...style }}
      role="img"
      aria-label="A car driving past"
    >
      <defs>
        <linearGradient id="runBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8546A" />
          <stop offset="55%" stopColor="#C4293A" />
          <stop offset="100%" stopColor="#8E1B28" />
        </linearGradient>
        <linearGradient id="runGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D8E4F2" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7E96B4" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="runShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="262" cy="206" rx="196" ry="16" fill="url(#runShadow)" />

      {/* Mirrored so the car faces the direction of travel. */}
      <g transform="scale(-1,1) translate(-520,0)">
        {/* exhaust pipe, at what is now the trailing edge */}
        <rect x="414" y="150" width="20" height="10" rx="5" fill="#12161C" />

        <path
          d="M52 168c-10 0-18-7-18-16v-22c0-12 8-22 20-25l52-13 40-38c9-9 21-14 34-14h84c14 0 27 6 36 17l30 36 52 12c17 4 28 18 28 35v12c0 9-8 16-18 16z"
          fill="url(#runBody)"
        />
        <path d="M34 146v6c0 9 8 16 18 16h340c10 0 18-7 18-16v-6z" fill="#000" opacity="0.16" />

        <path d="M168 62h-18c-9 0-17 4-23 11l-28 31h69z" fill="url(#runGlass)" />
        <path d="M184 62h80c10 0 19 4 25 12l24 30h-129z" fill="url(#runGlass)" />
        <path d="M176 62v42" stroke="#8E1B28" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <path
          d="M146 54c9-9 21-14 34-14h84c14 0 27 6 36 17"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.3"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M176 110v54M268 104v60" stroke="#000" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M196 132h26" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <path d="M288 132h26" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />

        <path d="M34 128h26c6 0 10 5 10 11s-4 11-10 11H34z" fill="#FFD48A" />
        <path d="M420 130h-22c-6 0-10 4-10 10s4 10 10 10h22z" fill="#FF6B6B" />

        <g className="wheel-spin" style={{ transformOrigin: '130px 168px' }}>
          <circle cx="130" cy="168" r="36" fill="#1B2430" />
          <circle cx="130" cy="168" r="20" fill="#C9CED6" />
          <circle cx="130" cy="168" r="8" fill="#8B93A1" />
          <path d="M130 148v40M110 168h40M116 154l28 28M144 154l-28 28" stroke="#8B93A1" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="wheel-spin" style={{ transformOrigin: '322px 168px' }}>
          <circle cx="322" cy="168" r="36" fill="#1B2430" />
          <circle cx="322" cy="168" r="20" fill="#C9CED6" />
          <circle cx="322" cy="168" r="8" fill="#8B93A1" />
          <path d="M322 148v40M302 168h40M308 154l28 28M336 154l-28 28" stroke="#8B93A1" strokeWidth="3" strokeLinecap="round" />
        </g>

        <path d="M94 168a36 36 0 0 1 72 0" fill="none" stroke="#8E1B28" strokeWidth="6" strokeLinecap="round" />
        <path d="M286 168a36 36 0 0 1 72 0" fill="none" stroke="#8E1B28" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
