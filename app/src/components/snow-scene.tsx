import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

// Hero illustration: a plow truck clearing a snowy driveway. Says "snow plowing" at a glance.
// Flat style, drawn in a 640×400 box and scaled to whatever width it's given.
const FLAKES: [number, number, number][] = [
  [40, 40, 3], [110, 70, 2], [170, 30, 2.5], [240, 60, 3], [300, 25, 2], [360, 80, 2.5], [420, 40, 3], [480, 70, 2],
  [540, 30, 2.5], [600, 60, 3], [70, 120, 2], [200, 110, 2.5], [330, 130, 2], [460, 115, 3], [590, 140, 2], [20, 180, 2.5],
  [140, 165, 2], [395, 175, 2.5], [520, 190, 2], [620, 210, 2.5],
];

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const t = (dx: number, dy: number) => `${x + dx * s},${y + dy * s}`;
  return (
    <G>
      <Rect x={x - 5 * s} y={y + 92 * s} width={10 * s} height={18 * s} fill="#5B4636" />
      <Polygon points={[t(0, 0), t(-34, 58), t(34, 58)].join(' ')} fill="#2E5E54" />
      <Polygon points={[t(0, 30), t(-44, 100), t(44, 100)].join(' ')} fill="#2E5E54" />
      {/* snow on the boughs */}
      <Path d={`M${t(0, 0)} L${t(-16, 27)} Q${t(-6, 22)} ${t(0, 27)} Q${t(6, 22)} ${t(16, 27)} Z`} fill="#FFFFFF" />
      <Path d={`M${t(-30, 52)} Q${t(-14, 46)} ${t(0, 52)} Q${t(14, 46)} ${t(30, 52)} L${t(34, 58)} L${t(-34, 58)} Z`} fill="#FFFFFF" />
      <Path d={`M${t(-40, 94)} Q${t(-20, 86)} ${t(0, 94)} Q${t(20, 86)} ${t(40, 94)} L${t(44, 100)} L${t(-44, 100)} Z`} fill="#FFFFFF" />
    </G>
  );
}

export function SnowScene({ width = 560 }: { width?: number }) {
  return (
    <Svg width={width} height={(width * 400) / 640} viewBox="0 0 640 400" accessibilityLabel="A plow truck clearing a snowy driveway">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CFE4FA" />
          <Stop offset="1" stopColor="#F4F9FF" />
        </LinearGradient>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF7A45" />
          <Stop offset="1" stopColor="#F04E14" />
        </LinearGradient>
      </Defs>

      {/* sky + distant hills */}
      <Rect x="0" y="0" width="640" height="400" rx="28" fill="url(#sky)" />
      <Path d="M0 250 Q120 200 240 238 T480 228 T640 236 V400 H0 Z" fill="#E4EFFA" />
      <Pine x={520} y={120} s={1} />
      <Pine x={590} y={150} s={0.8} />
      <Pine x={40} y={150} s={0.8} />

      {/* house */}
      <Rect x="80" y="178" width="200" height="110" fill="#34507A" />
      <Polygon points="58,184 180,104 302,184" fill="#1F2F47" />
      {/* snow on the roof, with drips */}
      <Path d="M54 186 L180 100 L306 186 Q296 196 286 188 Q276 198 262 189 Q248 199 234 190 Q220 200 206 190 Q192 199 178 190 Q164 200 150 190 Q136 199 122 189 Q108 198 94 188 Q80 197 70 188 Q62 194 54 186 Z" fill="#FFFFFF" />
      <Rect x="226" y="118" width="22" height="38" fill="#1F2F47" />
      <Rect x="222" y="112" width="30" height="10" rx="5" fill="#FFFFFF" />
      {/* warm window + door */}
      <Rect x="100" y="206" width="46" height="38" rx="3" fill="#FFD27A" />
      <Rect x="121" y="206" width="4" height="38" fill="#34507A" />
      <Rect x="100" y="223" width="46" height="4" fill="#34507A" />
      <Rect x="100" y="200" width="46" height="7" rx="3" fill="#FFFFFF" />
      <Rect x="160" y="232" width="26" height="56" rx="2" fill="#1F2F47" />
      <Circle cx="181" cy="262" r="2.5" fill="#FFD27A" />
      {/* garage */}
      <Rect x="200" y="222" width="70" height="66" fill="#DCE8F4" />
      {[234, 246, 258, 270].map((y) => (
        <Rect key={y} x="200" y={y} width="70" height="2" fill="#B9CDE2" />
      ))}

      {/* ground snow */}
      <Path d="M0 282 Q160 272 320 282 T640 280 V400 H0 Z" fill="#FFFFFF" />
      {/* driveway: still snowy by the garage, cleared asphalt behind the truck */}
      <Rect x="196" y="290" width="444" height="30" fill="#F1F6FB" />
      <Rect x="470" y="290" width="170" height="30" fill="#5E6B78" />
      <Rect x="470" y="303" width="170" height="3" fill="#7C8996" />
      {/* banks of plowed snow along the cleared edge */}
      <Ellipse cx="540" cy="324" rx="70" ry="10" fill="#FFFFFF" />
      <Ellipse cx="610" cy="326" rx="40" ry="9" fill="#FFFFFF" />

      {/* snow pushed ahead of the blade */}
      <Ellipse cx="300" cy="300" rx="34" ry="18" fill="#FFFFFF" />
      <Ellipse cx="276" cy="306" rx="22" ry="12" fill="#FFFFFF" />
      <Circle cx="300" cy="270" r="5" fill="#FFFFFF" />
      <Circle cx="286" cy="258" r="3.5" fill="#FFFFFF" />
      <Circle cx="314" cy="262" r="3" fill="#FFFFFF" />

      {/* plow truck, facing left toward the garage */}
      <G>
        {/* blade */}
        <Path d="M318 262 L340 258 L344 316 L322 320 Z" fill="#B7C3CF" />
        <Path d="M318 262 L324 261 L328 319 L322 320 Z" fill="#8795A3" />
        <Rect x="342" y="292" width="20" height="6" fill="#55626F" />
        {/* box + cab */}
        <Rect x="420" y="236" width="104" height="62" rx="8" fill="url(#body)" />
        <Path d="M362 298 L362 262 Q362 246 378 244 L416 240 L420 240 L420 298 Z" fill="url(#body)" />
        <Path d="M376 250 L414 246 L414 270 L370 270 Q370 256 376 250 Z" fill="#CFE4FA" />
        <Rect x="430" y="248" width="84" height="6" rx="3" fill="#FFFFFF" opacity="0.35" />
        {/* beacon */}
        <Rect x="388" y="232" width="18" height="8" rx="3" fill="#FFB020" />
        <Circle cx="397" cy="234" r="14" fill="#FFB020" opacity="0.18" />
        {/* snow on the roof */}
        <Rect x="420" y="232" width="104" height="7" rx="3.5" fill="#FFFFFF" />
        {/* wheels */}
        {[388, 494].map((cx) => (
          <G key={cx}>
            <Circle cx={cx} cy="300" r="20" fill="#1F2F47" />
            <Circle cx={cx} cy="300" r="8" fill="#B7C3CF" />
          </G>
        ))}
      </G>

      {/* foreground snow drifts */}
      <Path d="M0 352 Q90 330 180 350 T360 348 T540 352 T640 346 V400 H0 Z" fill="#FFFFFF" />
      <Path d="M0 360 Q120 346 240 362 T480 360 T640 356" stroke="#DCE8F4" strokeWidth="3" fill="none" />

      {/* falling snow */}
      {FLAKES.map(([cx, cy, r]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#FFFFFF" opacity={0.95} />
      ))}
    </Svg>
  );
}
