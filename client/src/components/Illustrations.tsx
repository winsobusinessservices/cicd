import React from 'react';

// Doodle Sparks: \ | /
export const DoodleSparks: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 30L16 16" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 34V10" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 30L24 16" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Corner Background Blobs for that playful Neobrutalist canvas
export const BackgroundDecorations: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden max-w-full">
    {/* Bottom Left Yellow Curve */}
    <div
      className="absolute -bottom-16 -left-16 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-[#FDE047] opacity-90 border-2 sm:border-4 border-black"
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
    />
    {/* Bottom Center-Right Sky Blue Blob */}
    <div className="hidden sm:block absolute -bottom-24 right-1/4 w-96 h-56 rounded-t-full bg-[#38BDF8] border-4 border-black" />
    {/* Bottom Right Coral/Pink Accent */}
    <div className="absolute -bottom-12 -right-12 w-40 h-40 sm:w-64 sm:h-64 rounded-tl-full bg-[#FB7185] border-2 sm:border-4 border-black" />
    {/* Subtle Top Right Blue/Pink Glow */}
    <div className="absolute -top-16 -right-16 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-[#FECDD3] opacity-40" />
  </div>
);

// Hero 1: Laptop + Server Stack + Padlock (Weightment Header & Environment)
export const HeroServerPadlock: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background accent pill */}
    <path d="M40 140C40 100 120 70 200 70C280 70 320 100 320 140H40Z" fill="#38BDF8" />
    
    {/* Server Stack on Left */}
    {/* Bottom block */}
    <rect x="70" y="110" width="70" height="32" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="85" cy="126" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="98" cy="126" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    
    {/* Middle block */}
    <rect x="70" y="74" width="70" height="32" rx="6" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
    <circle cx="85" cy="90" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="98" cy="90" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    {/* Top block */}
    <rect x="70" y="38" width="70" height="32" rx="6" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
    <circle cx="85" cy="54" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="98" cy="54" r="4" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    {/* Laptop in Center */}
    {/* Laptop screen */}
    <rect x="135" y="30" width="100" height="74" rx="8" fill="#FFE4E6" stroke="#000000" strokeWidth="3" />
    <rect x="142" y="38" width="86" height="58" rx="4" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
    {/* Window dots */}
    <circle cx="148" cy="44" r="1.5" fill="#EF4444" />
    <circle cx="153" cy="44" r="1.5" fill="#FACC15" />
    <circle cx="158" cy="44" r="1.5" fill="#22C55E" />
    {/* Code text: {...} */}
    <text x="185" y="74" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="18" fontWeight="bold">{"{...}"}</text>
    {/* Laptop base */}
    <path d="M120 106L135 106H235L250 106C254 106 256 109 253 112L246 122C244 125 240 127 236 127H134C130 127 126 125 124 122L117 112C114 109 116 106 120 106Z" fill="#F1F5F9" stroke="#000000" strokeWidth="3" />

    {/* Big Padlock on Right */}
    {/* Padlock shackle */}
    <path d="M215 78V58C215 44 227 34 241 34C255 34 267 44 267 58V78" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
    <path d="M215 78V58C215 44 227 34 241 34C255 34 267 44 267 58V78" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
    {/* Padlock body */}
    <rect x="198" y="74" width="86" height="66" rx="14" fill="#FACC15" stroke="#000000" strokeWidth="3.5" />
    {/* Keyhole */}
    <circle cx="241" cy="98" r="6" fill="#000000" />
    <path d="M238 98L236 114H246L244 98Z" fill="#000000" />

    {/* Pink Doodle Sparks above */}
    <path d="M255 24L261 14" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M266 28L276 22" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M246 22L244 10" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Hero 2: Laptop + Rocket blasting off (Applications Hero & History Header)
export const HeroServerRocket: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background hill */}
    <path d="M40 140C40 90 120 60 210 60C280 60 320 95 320 140H40Z" fill="#38BDF8" />

    {/* Server Stack */}
    <rect x="230" y="110" width="64" height="28" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="242" cy="124" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="254" cy="124" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="230" y="78" width="64" height="28" rx="6" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
    <circle cx="242" cy="92" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="254" cy="92" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="230" y="46" width="64" height="28" rx="6" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
    <circle cx="242" cy="60" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="254" cy="60" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    {/* Laptop */}
    <rect x="80" y="52" width="105" height="74" rx="8" fill="#FFE4E6" stroke="#000000" strokeWidth="3" />
    <rect x="87" y="60" width="91" height="58" rx="4" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
    {/* Window dots */}
    <circle cx="93" cy="66" r="1.5" fill="#EF4444" />
    <circle cx="98" cy="66" r="1.5" fill="#FACC15" />
    <circle cx="103" cy="66" r="1.5" fill="#22C55E" />
    {/* Code text: </> */}
    <text x="132" y="96" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="20" fontWeight="bold">{"</>"}</text>
    {/* Laptop base */}
    <path d="M65 128H200L210 144H55L65 128Z" fill="#F1F5F9" stroke="#000000" strokeWidth="3" />

    {/* Cloud puffs behind rocket */}
    <circle cx="175" cy="120" r="16" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="195" cy="114" r="20" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="215" cy="124" r="14" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />

    {/* Rocket */}
    <g transform="translate(170, 10) rotate(15)">
      {/* Rocket fins */}
      <path d="M10 65L0 85L20 80Z" fill="#EF4444" stroke="#000000" strokeWidth="2.5" />
      <path d="M45 65L55 85L35 80Z" fill="#EF4444" stroke="#000000" strokeWidth="2.5" />
      {/* Rocket flame */}
      <path d="M20 80Q27 102 35 80Z" fill="#FACC15" stroke="#000000" strokeWidth="2" />
      {/* Rocket body */}
      <path d="M12 75C12 75 12 30 27 10C42 30 42 75 42 75H12Z" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
      {/* Nose cone */}
      <path d="M17 25C20 18 27 10 27 10C27 10 34 18 37 25H17Z" fill="#EF4444" stroke="#000000" strokeWidth="2.5" />
      {/* Window */}
      <circle cx="27.5" cy="42" r="7.5" fill="#38BDF8" stroke="#000000" strokeWidth="2.5" />
      <circle cx="25.5" cy="40" r="2" fill="#FFFFFF" />
    </g>

    {/* Sparks */}
    <path d="M165 30L155 20" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M152 42L138 36" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M170 18L172 6" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Hero 3: Conveyor Belt "SOURCE", "BUILD", "DEPLOY" with Monitor (Image 10)
export const ConveyorBelt3D: React.FC<{ className?: string }> = ({ className = 'w-72 h-32' }) => (
  <svg viewBox="0 0 460 190" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background hill */}
    <path d="M180 160L460 60V160H180Z" fill="#38BDF8" />

    {/* Conveyor track */}
    <path d="M220 148L370 110L420 124L265 166Z" fill="#CBD5E1" stroke="#000000" strokeWidth="3" />
    <path d="M220 148L220 160L265 178L265 166Z" fill="#94A3B8" stroke="#000000" strokeWidth="3" />
    <path d="M265 178L420 136L420 124L265 166Z" fill="#64748B" stroke="#000000" strokeWidth="3" />
    {/* Conveyor rollers */}
    <line x1="245" y1="142" x2="265" y2="166" stroke="#000000" strokeWidth="2.5" />
    <line x1="275" y1="134" x2="295" y2="158" stroke="#000000" strokeWidth="2.5" />
    <line x1="305" y1="126" x2="325" y2="150" stroke="#000000" strokeWidth="2.5" />
    <line x1="335" y1="118" x2="355" y2="142" stroke="#000000" strokeWidth="2.5" />

    {/* Block 1: SOURCE (Left Laptop / Monitor) */}
    <g transform="translate(190, 80)">
      <rect x="0" y="0" width="46" height="24" rx="4" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
      <text x="23" y="16" textAnchor="middle" fill="#000000" fontFamily="sans-serif" fontSize="10" fontWeight="900">SOURCE</text>
      {/* Box under */}
      <rect x="-6" y="24" width="58" height="56" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
      <rect x="0" y="32" width="46" height="40" rx="3" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
      <text x="23" y="58" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="14" fontWeight="bold">{"</>"}</text>
    </g>

    {/* Block 2: BUILD (Yellow Station with Blue Pill on top) */}
    <g transform="translate(270, 36)">
      {/* Blue pill: BUILD */}
      <rect x="8" y="0" width="54" height="22" rx="11" fill="#38BDF8" stroke="#000000" strokeWidth="2.5" />
      <text x="35" y="15" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontSize="10" fontWeight="900">BUILD</text>
      <circle cx="35" cy="27" r="4.5" fill="#F97316" stroke="#000000" strokeWidth="2" />
      {/* Yellow Machine */}
      <rect x="0" y="32" width="70" height="74" rx="8" fill="#FACC15" stroke="#000000" strokeWidth="3" />
      {/* Gear on machine */}
      <circle cx="35" cy="68" r="16" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
      <circle cx="35" cy="68" r="6" fill="#FACC15" stroke="#000000" strokeWidth="2" />
    </g>

    {/* Block 3: DEPLOY (Pink Station with Red Pill on top) */}
    <g transform="translate(345, 30)">
      {/* Red/Pink pill: DEPLOY */}
      <rect x="12" y="0" width="56" height="22" rx="11" fill="#FB7185" stroke="#000000" strokeWidth="2.5" />
      <text x="40" y="15" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontSize="10" fontWeight="900">DEPLOY</text>
      {/* Pink Arch */}
      <rect x="0" y="26" width="60" height="68" rx="8" fill="#FDA4AF" stroke="#000000" strokeWidth="3" />
      <rect x="10" y="44" width="40" height="50" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
      {/* Cloud & Arrow */}
      <path d="M22 68C22 64 26 60 30 60C34 58 40 60 41 64C44 64 46 67 46 70C46 73 44 76 40 76H22C19 76 17 74 17 71C17 68 19 68 22 68Z" fill="#38BDF8" stroke="#000000" strokeWidth="1.5" />
      <path d="M30 76V68M27 71L30 68L33 71" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Block 4: Target Monitor with Green Checkmark */}
    <g transform="translate(400, 52)">
      <rect x="0" y="0" width="54" height="44" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
      <circle cx="8" cy="8" r="1.5" fill="#EF4444" />
      <circle cx="13" cy="8" r="1.5" fill="#FACC15" />
      {/* Screen Checkmark */}
      <circle cx="27" cy="22" r="12" fill="#22C55E" stroke="#000000" strokeWidth="2" />
      <path d="M22 22L25 25L32 18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stand */}
      <path d="M24 44V56H30V44" fill="#000000" />
      <rect x="16" y="56" width="22" height="4" rx="2" fill="#000000" />
    </g>
  </svg>
);

// Environment Tab Left Card Illustration: Folder with padlock and </>
export const FolderPadlockIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-28' }) => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Lavender backdrop blob */}
    <path d="M30 110C30 50 80 20 140 20C190 20 200 70 190 120C180 150 120 160 70 150C40 145 30 130 30 110Z" fill="#EDE9FE" />

    {/* Pink doodle sparks */}
    <path d="M145 28L150 16" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M158 32L170 24" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M136 34L126 22" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />

    {/* Folder back */}
    <path d="M45 45L75 45L88 56L160 56C164 56 168 60 168 64V125C168 129 164 133 160 133H45C41 133 37 129 37 125V53C37 49 41 45 45 45Z" fill="#FACC15" stroke="#000000" strokeWidth="3" />
    
    {/* White sheet coming out */}
    <rect x="52" y="58" width="102" height="60" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    {/* </> badge on sheet */}
    <text x="103" y="94" textAnchor="middle" fill="#000000" fontFamily="monospace" fontSize="20" fontWeight="900">{"</>"}</text>

    {/* Folder front flap */}
    <path d="M37 72L50 133H170L178 72H37Z" fill="#FDE047" stroke="#000000" strokeWidth="3" />

    {/* Padlock on right */}
    <path d="M130 92V78C130 70 137 64 145 64C153 64 160 70 160 78V92" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
    <path d="M130 92V78C130 70 137 64 145 64C153 64 160 70 160 78V92" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="120" y="90" width="50" height="42" rx="10" fill="#FACC15" stroke="#000000" strokeWidth="3" />
    <circle cx="145" cy="106" r="4" fill="#000000" />
    <path d="M143 106L141 118H149L147 106Z" fill="#000000" />
  </svg>
);

// ID Badge on Lanyard Illustration (Create Member Modal - Image 5)
export const IdBadgeIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-48' }) => (
  <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue blob backdrop */}
    <path d="M80 180C50 160 50 100 90 80C140 60 190 100 180 160C170 210 110 210 80 180Z" fill="#38BDF8" />

    {/* Yellow Lanyard Straps */}
    <path d="M70 0L98 75L108 75L136 0" fill="#FACC15" stroke="#000000" strokeWidth="3" />
    {/* Metal clip */}
    <rect x="94" y="70" width="18" height="18" rx="4" fill="#CBD5E1" stroke="#000000" strokeWidth="2.5" />
    <circle cx="103" cy="79" r="3" fill="#000000" />

    {/* White ID Card */}
    <rect x="52" y="86" width="102" height="140" rx="14" fill="#FFFFFF" stroke="#000000" strokeWidth="3.5" />
    
    {/* Slot at top of card */}
    <rect x="88" y="94" width="30" height="6" rx="3" fill="#000000" />

    {/* Photo container with pink background */}
    <rect x="68" y="108" width="70" height="64" rx="8" fill="#FECDD3" stroke="#000000" strokeWidth="2" />
    {/* Avatar girl */}
    {/* Hair */}
    <path d="M92 124C85 124 82 130 82 138C82 146 87 148 92 148H114C119 148 124 146 124 138C124 130 121 124 114 124H92Z" fill="#000000" />
    {/* Face */}
    <circle cx="103" cy="138" r="10" fill="#FED7AA" />
    {/* Yellow shirt */}
    <path d="M88 172C88 158 94 152 103 152C112 152 118 158 118 172H88Z" fill="#FACC15" stroke="#000000" strokeWidth="1.5" />

    {/* Card text lines */}
    <rect x="68" y="184" width="46" height="6" rx="3" fill="#000000" />
    <rect x="68" y="196" width="30" height="5" rx="2.5" fill="#94A3B8" />

    {/* Green Checkmark Badge at bottom right of card */}
    <circle cx="144" cy="204" r="18" fill="#86EFAC" stroke="#000000" strokeWidth="3" />
    <path d="M136 204L141 209L152 198" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Doodle sparks on left */}
    <path d="M48 108L38 100" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M52 120L40 122" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M54 96L46 86" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Inbox Paper Tray with Approved Document (Team View - Image 6)
export const InboxApprovedTrayIllustration: React.FC<{ className?: string }> = ({ className = 'w-32 h-24' }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue circle backdrop */}
    <circle cx="80" cy="65" r="45" fill="#38BDF8" />

    {/* Document */}
    <rect x="50" y="24" width="56" height="74" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    {/* User silhouette on document */}
    <circle cx="78" cy="46" r="6" fill="#EF4444" />
    <path d="M70 60C70 54 74 52 78 52C82 52 86 54 86 60H70Z" fill="#EF4444" />
    {/* Text lines */}
    <rect x="60" y="66" width="36" height="4" rx="2" fill="#000000" />
    <rect x="60" y="74" width="24" height="4" rx="2" fill="#94A3B8" />

    {/* Yellow Paper Tray */}
    <path d="M30 78L45 116H115L130 78H106L100 92H60L54 78H30Z" fill="#FACC15" stroke="#000000" strokeWidth="3" />

    {/* Green Checkmark Badge at top right */}
    <circle cx="106" cy="36" r="14" fill="#86EFAC" stroke="#000000" strokeWidth="2.5" />
    <path d="M100 36L104 40L112 32" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

    {/* Sparks on left */}
    <path d="M42 45L32 38" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M46 54L34 56" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Magnifying Glass + Checklist Document + Clock (Audit Logs Header - Image 7)
export const AuditMagnifierChecklist: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 240 150" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Yellow Clock on Left */}
    <rect x="40" y="45" width="56" height="56" rx="14" fill="#FACC15" stroke="#000000" strokeWidth="3" />
    <circle cx="68" cy="73" r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    <path d="M68 62V73H76" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Rolled Paper / Checklist Document */}
    {/* Roll top */}
    <path d="M100 24C100 16 112 12 126 12C140 12 170 14 175 22C178 28 172 34 162 34H110C104 34 100 30 100 24Z" fill="#FDA4AF" stroke="#000000" strokeWidth="3" />
    {/* Document body */}
    <rect x="100" y="24" width="75" height="106" rx="8" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    {/* Roll bottom */}
    <path d="M90 120H160C165 120 170 125 170 130C170 135 165 140 160 140H90C85 140 80 135 80 130C80 125 85 120 90 120Z" fill="#FDA4AF" stroke="#000000" strokeWidth="3" />

    {/* Checkboxes & lines */}
    <rect x="114" y="42" width="12" height="12" rx="3" fill="#BBF7D0" stroke="#000000" strokeWidth="1.5" />
    <path d="M116 48L119 51L124 45" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="132" y1="48" x2="160" y2="48" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

    <rect x="114" y="62" width="12" height="12" rx="3" fill="#BBF7D0" stroke="#000000" strokeWidth="1.5" />
    <path d="M116 68L119 71L124 65" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="132" y1="68" x2="155" y2="68" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

    <rect x="114" y="82" width="12" height="12" rx="3" fill="#BBF7D0" stroke="#000000" strokeWidth="1.5" />
    <path d="M116 88L119 91L124 85" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="132" y1="88" x2="158" y2="88" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

    {/* Big Magnifying Glass */}
    <g transform="translate(140, 50)">
      {/* Red Handle */}
      <path d="M48 48L72 72C76 76 76 82 72 86C68 90 62 90 58 86L34 62" fill="#EF4444" stroke="#000000" strokeWidth="3.5" />
      {/* Glass frame */}
      <circle cx="26" cy="26" r="28" fill="#E0F2FE" stroke="#000000" strokeWidth="4" />
      {/* Glare line */}
      <path d="M14 16C18 12 28 10 36 14" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
    </g>

    {/* Sparks */}
    <path d="M185 45L195 38" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M190 56L202 58" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Gear + Laptop + Servers Illustration (Project Settings Header - Image 8)
export const GearLaptopIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 260 150" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background hill */}
    <path d="M40 130C60 90 120 70 200 70C240 70 260 90 260 130H40Z" fill="#38BDF8" />

    {/* Big Blue Gear on Left */}
    <g transform="translate(30, 40)">
      <circle cx="36" cy="36" r="32" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
      {/* Gear teeth */}
      <rect x="30" y="-4" width="12" height="10" rx="3" fill="#E0F2FE" stroke="#000000" strokeWidth="2.5" />
      <rect x="30" y="66" width="12" height="10" rx="3" fill="#E0F2FE" stroke="#000000" strokeWidth="2.5" />
      <rect x="-4" y="30" width="10" height="12" rx="3" fill="#E0F2FE" stroke="#000000" strokeWidth="2.5" />
      <rect x="66" y="30" width="10" height="12" rx="3" fill="#E0F2FE" stroke="#000000" strokeWidth="2.5" />
      <circle cx="36" cy="36" r="14" fill="#FAF7EE" stroke="#000000" strokeWidth="3" />
    </g>

    {/* Laptop */}
    <rect x="90" y="30" width="95" height="70" rx="8" fill="#EDE9FE" stroke="#000000" strokeWidth="3" />
    <rect x="97" y="38" width="81" height="54" rx="4" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
    <text x="137" y="72" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="18" fontWeight="bold">{"<_}"}</text>
    <path d="M78 100H200L208 114H70L78 100Z" fill="#F1F5F9" stroke="#000000" strokeWidth="3" />

    {/* Stacked servers on right */}
    <rect x="180" y="104" width="60" height="26" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="192" cy="117" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="204" cy="117" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="180" y="74" width="60" height="26" rx="6" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
    <circle cx="192" cy="87" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="204" cy="87" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="180" y="44" width="60" height="26" rx="6" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
    <circle cx="192" cy="57" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="204" cy="57" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
  </svg>
);

// Laptop with </> and Golden Shield (Project Settings Environment Card - Image 8)
export const LaptopShieldIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-20' }) => (
  <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Computer Window */}
    <rect x="10" y="15" width="75" height="55" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    <circle cx="18" cy="22" r="1.5" fill="#EF4444" />
    <circle cx="24" cy="22" r="1.5" fill="#FACC15" />
    <circle cx="30" cy="22" r="1.5" fill="#22C55E" />
    <rect x="16" y="28" width="63" height="36" rx="3" fill="#0C0D12" stroke="#000000" strokeWidth="1.5" />
    <text x="47" y="52" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="14" fontWeight="bold">{"</>"}</text>

    {/* Gold Shield with Checkmark */}
    <path d="M65 35L88 28L108 35C108 60 88 78 88 78C88 78 65 60 65 35Z" fill="#FACC15" stroke="#000000" strokeWidth="2.5" />
    <path d="M78 50L85 57L98 44" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Hero 4: Terminal Laptop + Server Stack + Clouds (Terminal Output Header - Image 3)
export const HeroTerminalServer: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background hill */}
    <path d="M40 140C40 90 120 60 210 60C280 60 320 95 320 140H40Z" fill="#38BDF8" />

    {/* Cloud puffs behind */}
    <circle cx="150" cy="130" r="18" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="170" cy="120" r="24" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="195" cy="128" r="16" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />

    {/* Laptop on Left with Terminal Prompt */}
    <rect x="75" y="42" width="110" height="78" rx="8" fill="#FFE4E6" stroke="#000000" strokeWidth="3" />
    <rect x="83" y="50" width="94" height="62" rx="4" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
    {/* Window dots */}
    <circle cx="90" cy="56" r="1.5" fill="#EF4444" />
    <circle cx="95" cy="56" r="1.5" fill="#FACC15" />
    <circle cx="100" cy="56" r="1.5" fill="#22C55E" />
    {/* Terminal prompt: >_ */}
    <text x="130" y="88" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="22" fontWeight="bold">&gt;_</text>
    {/* Laptop base */}
    <path d="M60 120H200L210 138H50L60 120Z" fill="#F1F5F9" stroke="#000000" strokeWidth="3" />

    {/* Server Stack on Right */}
    <rect x="220" y="106" width="70" height="30" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="234" cy="121" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="246" cy="121" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="220" y="72" width="70" height="30" rx="6" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
    <circle cx="234" cy="87" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="246" cy="87" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="220" y="38" width="70" height="30" rx="6" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
    <circle cx="234" cy="53" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="246" cy="53" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    {/* Pink Sparks above */}
    <path d="M140 25L132 15" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M152 28L156 12" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M165 24L175 16" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Hero 5: Laptop + Server Stack + Yellow 3D Cube with Gear (Pipeline Steps Header - Image 4)
export const HeroGearCubeServer: React.FC<{ className?: string }> = ({ className = 'w-48 h-28' }) => (
  <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Blue background hill */}
    <path d="M40 140C40 90 120 60 210 60C280 60 320 95 320 140H40Z" fill="#38BDF8" />

    {/* Yellow 3D Cube with Gear on Front */}
    <g transform="translate(68, 60)">
      {/* Top face */}
      <path d="M28 0L56 14L28 28L0 14Z" fill="#FDE047" stroke="#000000" strokeWidth="3" />
      {/* Left face */}
      <path d="M0 14L28 28V62L0 48Z" fill="#FACC15" stroke="#000000" strokeWidth="3" />
      {/* Right face */}
      <path d="M28 28L56 14V48L28 62Z" fill="#EAB308" stroke="#000000" strokeWidth="3" />
      {/* Gear icon on left face */}
      <circle cx="14" cy="38" r="7" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      <circle cx="14" cy="38" r="3" fill="#FACC15" stroke="#000000" strokeWidth="1" />
    </g>

    {/* Laptop in Center */}
    <rect x="110" y="36" width="100" height="74" rx="8" fill="#FFE4E6" stroke="#000000" strokeWidth="3" />
    <rect x="118" y="44" width="84" height="58" rx="4" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
    <circle cx="124" cy="50" r="1.5" fill="#EF4444" />
    <circle cx="129" cy="50" r="1.5" fill="#FACC15" />
    <circle cx="134" cy="50" r="1.5" fill="#22C55E" />
    <text x="160" y="80" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="18" fontWeight="bold">{"</>"}</text>
    <path d="M95 110H225L235 126H85L95 110Z" fill="#F1F5F9" stroke="#000000" strokeWidth="3" />

    {/* Server Stack on Right */}
    <rect x="225" y="106" width="65" height="28" rx="6" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="238" cy="120" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="250" cy="120" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="225" y="74" width="65" height="28" rx="6" fill="#E0F2FE" stroke="#000000" strokeWidth="3" />
    <circle cx="238" cy="88" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="250" cy="88" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    <rect x="225" y="42" width="65" height="28" rx="6" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
    <circle cx="238" cy="56" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />
    <circle cx="250" cy="56" r="3.5" fill="#22C55E" stroke="#000000" strokeWidth="1.5" />

    {/* Pink Sparks */}
    <path d="M150 20L145 10" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M162 22L168 8" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
    <path d="M174 20L182 12" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Purple Terminal Square with Edit Pencil Badge (Project Settings - Image 8)
export const ProjectInfoTerminalBox: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Purple Square */}
    <rect x="6" y="6" width="68" height="68" rx="16" fill="#8B5CF6" stroke="#000000" strokeWidth="3" />
    {/* Terminal >_ text */}
    <text x="36" y="48" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="24" fontWeight="bold">&gt;_</text>
    {/* Circular Pencil Badge on bottom right */}
    <circle cx="62" cy="62" r="12" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    {/* Pencil */}
    <path d="M57 65L65 57L68 60L60 68L56 68L57 65Z" fill="#000000" />
  </svg>
);

// App Card Icons (Image 9)
// 1. Storefront (Todayfix)
export const AppIconStore: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Awning */}
    <path d="M12 28L14 18H50L52 28H12Z" fill="#FACC15" stroke="#000000" strokeWidth="2.5" />
    <path d="M14 18L18 28H26L24 18" fill="#FB7185" stroke="#000000" strokeWidth="2" />
    <path d="M34 18L36 28H44L42 18" fill="#FB7185" stroke="#000000" strokeWidth="2" />
    {/* Store body */}
    <rect x="14" y="28" width="36" height="24" rx="4" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    {/* Door */}
    <rect x="26" y="36" width="12" height="16" rx="2" fill="#38BDF8" stroke="#000000" strokeWidth="2" />
    {/* Window */}
    <rect x="42" y="34" width="6" height="8" rx="1.5" fill="#FACC15" stroke="#000000" strokeWidth="1.5" />
  </svg>
);

// 2. Newspaper (Indian Rajniti)
export const AppIconNews: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Folded paper */}
    <rect x="12" y="14" width="40" height="38" rx="5" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    {/* Header banner */}
    <rect x="18" y="20" width="28" height="6" rx="1" fill="#000000" />
    {/* Photo block */}
    <rect x="18" y="30" width="12" height="14" rx="2" fill="#BAE6FD" stroke="#000000" strokeWidth="1.5" />
    {/* Lines */}
    <line x1="34" y1="32" x2="46" y2="32" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
    <line x1="34" y1="38" x2="46" y2="38" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
    <line x1="34" y1="44" x2="42" y2="44" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 3. Shopping Bag (Punyakoti)
export const AppIconBag: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Handles */}
    <path d="M24 24V16C24 12 28 8 32 8C36 8 40 12 40 16V24" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
    {/* Bag body */}
    <path d="M14 24L18 54H46L50 24H14Z" fill="#FACC15" stroke="#000000" strokeWidth="2.5" />
    {/* Fold line */}
    <path d="M22 24L24 54" stroke="#000000" strokeWidth="1.5" opacity="0.4" />
  </svg>
);

// 4. Cogwheel / Gear (WBS Admin)
export const AppIconGear: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="32" cy="32" r="16" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <circle cx="32" cy="32" r="7" fill="#38BDF8" stroke="#000000" strokeWidth="2" />
    {/* Teeth */}
    <rect x="28" y="10" width="8" height="6" rx="2" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <rect x="28" y="48" width="8" height="6" rx="2" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <rect x="10" y="28" width="6" height="8" rx="2" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <rect x="48" y="28" width="6" height="8" rx="2" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
  </svg>
);

// 5. Server Tower (Admin Panel)
export const AppIconServer: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="16" y="12" width="32" height="12" rx="3" fill="#38BDF8" stroke="#000000" strokeWidth="2" />
    <circle cx="22" cy="18" r="1.5" fill="#22C55E" />
    <circle cx="28" cy="18" r="1.5" fill="#22C55E" />

    <rect x="16" y="26" width="32" height="12" rx="3" fill="#E0F2FE" stroke="#000000" strokeWidth="2" />
    <circle cx="22" cy="32" r="1.5" fill="#22C55E" />
    <circle cx="28" cy="32" r="1.5" fill="#22C55E" />

    <rect x="16" y="40" width="32" height="12" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <circle cx="22" cy="46" r="1.5" fill="#22C55E" />
    <circle cx="28" cy="46" r="1.5" fill="#22C55E" />
  </svg>
);

// 6. Megaphone (Marketing Site)
export const AppIconMegaphone: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Horn body */}
    <path d="M18 26L38 16V48L18 38H14C12 38 10 36 10 34V30C10 28 12 26 14 26H18Z" fill="#FDA4AF" stroke="#000000" strokeWidth="2.5" />
    {/* Handle */}
    <path d="M22 38L24 50H28L26 38" fill="#FACC15" stroke="#000000" strokeWidth="2" />
    {/* Waves */}
    <path d="M44 24C48 28 48 36 44 40" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M50 20C56 26 56 38 50 44" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Isometric Laptop sitting on blocks with yellow cube (Home Page Project Card - Image 10)
export const LaptopBlocksIllustration: React.FC<{ className?: string }> = ({ className = 'w-44 h-36' }) => (
  <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Pink base wedge */}
    <path d="M70 145L120 170L190 145L140 125Z" fill="#FDA4AF" stroke="#000000" strokeWidth="2.5" />
    <path d="M70 145V155L120 180V170Z" fill="#F43F5E" stroke="#000000" strokeWidth="2.5" />
    <path d="M120 180L190 155V145L120 170Z" fill="#E11D48" stroke="#000000" strokeWidth="2.5" />

    {/* White block behind */}
    <path d="M100 110L145 90L175 105L130 125Z" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    <path d="M100 110V130L130 145V125Z" fill="#CBD5E1" stroke="#000000" strokeWidth="2.5" />
    <path d="M130 145L175 125V105L130 125Z" fill="#94A3B8" stroke="#000000" strokeWidth="2.5" />

    {/* Yellow 3D Cube on right */}
    <g transform="translate(130, 20)">
      {/* Top face */}
      <path d="M25 0L50 15L25 30L0 15Z" fill="#FDE047" stroke="#000000" strokeWidth="2.5" />
      {/* Left face */}
      <path d="M0 15L25 30V65L0 50Z" fill="#FACC15" stroke="#000000" strokeWidth="2.5" />
      {/* Right face */}
      <path d="M25 30L50 15V50L25 65Z" fill="#EAB308" stroke="#000000" strokeWidth="2.5" />
    </g>

    {/* Laptop */}
    {/* Base/Keyboard */}
    <g transform="translate(45, 65)">
      <path d="M10 50L60 75L125 50L75 25Z" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
      <path d="M10 50V58L60 83V75Z" fill="#CBD5E1" stroke="#000000" strokeWidth="2.5" />
      <path d="M60 83L125 58V50L60 75Z" fill="#94A3B8" stroke="#000000" strokeWidth="2.5" />
      {/* Keyboard keys lines */}
      <path d="M25 48L65 68L110 50L70 30Z" fill="#0C0D12" stroke="#000000" strokeWidth="1.5" />
      {/* Trackpad */}
      <path d="M52 68L68 76L76 72L60 64Z" fill="#E2E8F0" stroke="#000000" strokeWidth="1" />

      {/* Screen upright */}
      <path d="M30 42L30 -12L90 -12L90 42Z" fill="#38BDF8" stroke="#000000" strokeWidth="3" />
      <rect x="36" y="-6" width="48" height="42" rx="3" fill="#0C0D12" stroke="#000000" strokeWidth="2" />
      <text x="60" y="22" textAnchor="middle" fill="#FFFFFF" fontFamily="monospace" fontSize="16" fontWeight="bold">{"</>"}</text>
    </g>
  </svg>
);

// Create Project Yellow Block with Plus (Home Page - Image 10)
export const CreateProjectBoxIllustration: React.FC<{ className?: string }> = ({ className = 'w-36 h-36' }) => (
  <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sparks above */}
    <path d="M80 8V18" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M68 12L74 20" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M92 12L86 20" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

    {/* White block stack at bottom */}
    <path d="M30 95L75 115L120 95L75 75Z" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
    <path d="M30 95V125L75 145V115Z" fill="#E2E8F0" stroke="#000000" strokeWidth="3" />
    <path d="M75 145L120 125V95L75 115Z" fill="#CBD5E1" stroke="#000000" strokeWidth="3" />

    {/* Small white block on right */}
    <path d="M105 118L130 130L150 120L125 108Z" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
    <path d="M105 118V135L130 147V130Z" fill="#E2E8F0" stroke="#000000" strokeWidth="2.5" />
    <path d="M130 147L150 137V120L130 130Z" fill="#CBD5E1" stroke="#000000" strokeWidth="2.5" />

    {/* Yellow 3D Block with + */}
    <g transform="translate(42, 22)">
      {/* Top face */}
      <path d="M35 0L70 18L35 36L0 18Z" fill="#FDE047" stroke="#000000" strokeWidth="3" />
      {/* Left face */}
      <path d="M0 18L35 36V76L0 58Z" fill="#FACC15" stroke="#000000" strokeWidth="3" />
      {/* Right face */}
      <path d="M35 36L70 18V58L35 76Z" fill="#EAB308" stroke="#000000" strokeWidth="3" />
      {/* Bold black + on left face */}
      <text x="16" y="55" fill="#000000" fontSize="26" fontWeight="900" fontFamily="sans-serif">+</text>
    </g>
  </svg>
);
