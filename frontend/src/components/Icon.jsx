/** Single-path line icons, matching the 24×24 stroke set used in the design. */
export const PATHS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  search: 'M21 21l-4.3-4.3M11 3a8 8 0 1 0 0 16 8 8 0 1 0 0-16z',
  upload: 'M12 3v12M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  analytics: 'M3 3v18h18M7 15l4-4 4 3 5-6',
  history: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M12 13v4',
  panel: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 3v18',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
  back: 'M19 12H5M12 19l-7-7 7-7',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6 6 18M6 6l12 12',
  bill: 'M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h4',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A10.5 10.5 0 0 1 12 5c7 0 11 7 11 7a18 18 0 0 1-3.2 4M6.2 6.2A18 18 0 0 0 1 12s4 7 11 7a10.8 10.8 0 0 0 3.6-.6',
  check: 'M20 6 9 17l-5-5',
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, style, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', ...style }}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
