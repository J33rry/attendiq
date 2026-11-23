// Line icons with rounded ends — drawn on a 24px grid, 1.8 stroke, like a neat pen sketch.
const P = {
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5" /></>,
  chart: <><path d="M5 19V9" /><path d="M10 19V5" /><path d="M15 19v-7" /><path d="M20 19v-4" /><path d="M3.5 19.5h17" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /><path d="M8 14h2M14 14h2M8 17h2" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  history: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /><path d="M12 8v4l2.5 1.5" /></>,
  compass: <><circle cx="12" cy="12" r="8" /><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z" /></>,
  sprout: <><path d="M12 20v-7" /><path d="M12 13c0-3.5-2.5-6-6.5-6 0 3.8 2.6 6 6.5 6Z" /><path d="M12 11c0-3 2-5.5 6.5-5.5 0 3.6-2.6 5.5-6.5 5.5Z" /></>,
  chat: <><path d="M5 17.5 4 21l3.8-1.6A8 8 0 1 0 5 17.5Z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.4" /></>,
  book: <><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16Z" /><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19" /><path d="M9 8h6" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 5.5a3 3 0 0 1 0 6M17.5 14a5 5 0 0 1 3 5" /></>,
  board: <><rect x="3.5" y="4.5" width="17" height="11.5" rx="2" /><path d="M8 20l2-4M16 20l-2-4" /><path d="M7 9.5c1.5-1.5 3-1.5 4 0s2.5 1.5 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  send: <><path d="M20 4 9.5 14.5" /><path d="M20 4 13.5 20l-4-5.5L4 10.5Z" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M10 5.7A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a16 16 0 0 1-2.8 3.6M6.4 7.4A15.8 15.8 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" /><path d="M9.9 10a2.8 2.8 0 0 0 4 4" /></>,
  logout: <><path d="M14 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h7" /><path d="M10.5 12H20M16.5 8l4 4-4 4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  filter: <path d="M4 5.5h16l-6.2 7.3V19l-3.6-1.6v-4.6Z" />,
  rfid: <><rect x="3.5" y="6" width="11" height="13" rx="2.5" /><path d="M7 15h4" /><path d="M17.5 8.5a5 5 0 0 1 0 7M19.8 6.3a8.2 8.2 0 0 1 0 11.4" /></>,
  wifi: <><path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.7a7.6 7.6 0 0 1 11 0M9.4 15.8a3.4 3.4 0 0 1 5.2 0" /><path d="M12 19h.01" strokeWidth="2.6" /></>,
  pencil: <><path d="M15.5 5.5l3 3L8.5 18.5 4.5 19.5l1-4Z" /><path d="M13.5 7.5l3 3" /></>,
  ban: <><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>,
  sparkle: <><path d="M12 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6Z" /><path d="M18.5 15.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" /></>,
  info: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M12 4.5 21 19.5H3Z" /><path d="M12 10v4M12 17h.01" /></>,
  refresh: <><path d="M19.5 11a7.5 7.5 0 0 0-13.3-4.2L4.5 8.5" /><path d="M4.5 4.5v4h4" /><path d="M4.5 13a7.5 7.5 0 0 0 13.3 4.2l1.7-1.7" /><path d="M19.5 19.5v-4h-4" /></>,
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.8" />,
  flag: <><path d="M5.5 20.5v-16" /><path d="M5.5 5h11l-2 3.5 2 3.5h-11" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r=".6" /></>,
  party: <><path d="M4 20 8.5 8.5l7 7Z" /><path d="M13 5.5c.8 1 .8 2 0 3M16 3.5v1.5M19 6l-1 1M18.5 10.5c1-.4 2-.3 2.5.3" /></>,
  coffee: <><path d="M5 9.5h11v5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5Z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" /></>,
};

export default function Icon({ name, size = 20, className = "", strokeWidth = 1.8, title }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 ${className}`} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
