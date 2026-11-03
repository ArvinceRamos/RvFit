import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Line, Path, Polyline, Rect } from "react-native-svg";
import { useTheme } from "~/theme/theme";

// One stroke icon per roadmap stage, the same as the web's StageIcon (src/components/stage-icon.tsx), copied from
// Lucide (https://lucide.dev), ISC License:
// Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
// All other copyright (c) for Lucide are held by Lucide Contributors 2022.
// Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee
// is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

const ICONS: Record<number, ReactNode> = {
  // calculator: Know your numbers
  1: (
    <>
      <Rect height="20" rx="2" width="16" x="4" y="2" />
      <Line x1="8" x2="16" y1="6" y2="6" />
      <Line x1="16" x2="16" y1="14" y2="18" />
      <Path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
    </>
  ),
  // utensils: Fuel your day
  2: (
    <>
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <Path d="M7 2v20" />
      <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  // dumbbell: Train your week
  3: (
    <>
      <Path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" />
      <Path d="m2.5 21.5 1.4-1.4" />
      <Path d="m20.1 3.9 1.4-1.4" />
      <Path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" />
      <Path d="m9.6 14.4 4.8-4.8" />
    </>
  ),
  // trending-up: Track your trend
  4: (
    <>
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline points="16 7 22 7 22 13" />
    </>
  ),
  // sliders-horizontal: review and adjust
  5: (
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
};

// Decorative: the stage title next to it already says what the stage is. A 40-point tile, lime icon.
export function StageIcon({ stage }: { stage: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.tile, alignItems: "center", justifyContent: "center" }}
    >
      <Svg fill="none" height={20} stroke={colors.accentText} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}>
        {ICONS[stage]}
      </Svg>
    </View>
  );
}
