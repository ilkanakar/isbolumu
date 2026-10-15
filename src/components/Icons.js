import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function Icon({ name, color = '#1E1A16', size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };
  if (name === 'takvim') {
    return (
      <Svg {...common}>
        <Rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={color} strokeWidth="1.8" />
        <Path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'ev') {
    return (
      <Svg {...common}>
        <Path d="M4 11.5 12 4.5l8 7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <Path d="M7 10.5V19h10v-8.5" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'ayarlar') {
    return (
      <Svg {...common}>
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
        <Path d="M12 3.2v2.3M12 18.5v2.3M3.2 12h2.3M18.5 12h2.3M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'defter') {
    return (
      <Svg {...common}>
        <Path d="M7 4.5h10.5A1.5 1.5 0 0 1 19 6v13.5H8.5A2.5 2.5 0 0 1 6 17V6.5A2 2 0 0 1 8 4.5Z" stroke={color} strokeWidth="1.8" />
        <Path d="M9 9h6M9 12.5h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg {...common}>
      <Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1.8" />
      <Circle cx="12" cy="12" r="2.1" fill={color} />
    </Svg>
  );
}

export function Mark({ size = 72 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Rect width="72" height="72" rx="20" fill="#C65A3A" />
      <Path d="M13 47 L36 23 L59 47 V53 H13 Z" fill="#F3EDE3" />
      <Rect x="46" y="28" width="7" height="16" rx="1" fill="#F3EDE3" />
    </Svg>
  );
}
