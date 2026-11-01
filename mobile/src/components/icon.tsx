import { Platform } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

// The web app's stroke icons (src/components/icon.tsx), copied from Lucide (https://lucide.dev), ISC License:
// Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
// All other copyright (c) for Lucide are held by Lucide Contributors 2022.
// Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee
// is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
// One style: 24px grid, stroke 2, the colour passed in.

const ICONS = {
  dashboard: (
    <>
      <Rect height="9" rx="1" width="7" x="3" y="3" />
      <Rect height="5" rx="1" width="7" x="14" y="3" />
      <Rect height="9" rx="1" width="7" x="14" y="12" />
      <Rect height="5" rx="1" width="7" x="3" y="16" />
    </>
  ),
  meals: (
    <>
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <Path d="M7 2v20" />
      <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  workouts: (
    <>
      <Path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" />
      <Path d="m2.5 21.5 1.4-1.4" />
      <Path d="m20.1 3.9 1.4-1.4" />
      <Path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" />
      <Path d="m9.6 14.4 4.8-4.8" />
    </>
  ),
  week: (
    <>
      <Path d="M8 2v4" />
      <Path d="M16 2v4" />
      <Rect height="18" rx="2" width="18" x="3" y="4" />
      <Path d="M3 10h18" />
    </>
  ),
  progress: (
    <>
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline points="16 7 22 7 22 13" />
    </>
  ),
  foods: (
    <>
      <Path d="M12 7v14" />
      <Path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </>
  ),
  preferences: (
    <>
      <Line x1="21" x2="14" y1="4" y2="4" />
      <Line x1="10" x2="3" y1="4" y2="4" />
      <Line x1="21" x2="12" y1="12" y2="12" />
      <Line x1="8" x2="3" y1="12" y2="12" />
      <Line x1="21" x2="16" y1="20" y2="20" />
      <Line x1="12" x2="3" y1="20" y2="20" />
      <Line x1="14" x2="14" y1="2" y2="6" />
      <Line x1="8" x2="8" y1="10" y2="14" />
      <Line x1="16" x2="16" y1="18" y2="22" />
    </>
  ),
  profile: (
    <>
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </>
  ),
  "log-out": (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" x2="9" y1="12" y2="12" />
    </>
  ),
  close: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  check: <Path d="M20 6 9 17l-5-5" />,
  calories: <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  // Mobile additions, also from Lucide.
  "chevron-right": <Path d="m9 18 6-6-6-6" />,
  "chevron-left": <Path d="m15 18-6-6 6-6" />,
  "chevron-down": <Path d="m6 9 6 6 6-6" />,
  plus: (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  trash: (
    <>
      <Path d="M3 6h18" />
      <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="m17.66 17.66 1.41 1.41" />
      <Path d="M2 12h2" />
      <Path d="M20 12h2" />
      <Path d="m6.34 17.66-1.41 1.41" />
      <Path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  moon: <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  info: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </>
  ),
  "wifi-off": (
    <>
      <Path d="M12 20h.01" />
      <Path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <Path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <Path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <Path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <Path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
      <Path d="m2 2 20 20" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

// Hidden from screen readers. The web preview takes the DOM attribute instead of the native props.
const hidden = Platform.OS === "web" ? { "aria-hidden": true } : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const };

/** Decorative: put it beside visible text, or give the pressable around it an accessibilityLabel. */
export function Icon({ name, color, size = 18, strokeWidth = 2 }: { name: IconName; color: string; size?: number; strokeWidth?: number }) {
  return (
    <Svg
      {...hidden}
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {ICONS[name]}
    </Svg>
  );
}
