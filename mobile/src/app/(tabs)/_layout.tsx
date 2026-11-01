import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "~/components/icon";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";

// The five signed-in sections, the same as the web phone tab bar (src/lib/nav.ts): Today, Food, Train,
// Progress and Me. The current tab's icon sits in a Fit Green pill.
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "today", title: "Today", icon: "dashboard" },
  { name: "food", title: "Food", icon: "meals" },
  { name: "train", title: "Train", icon: "workouts" },
  { name: "progress", title: "Progress", icon: "progress" },
  { name: "me", title: "Me", icon: "profile" },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.page },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.glassEdge,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
          boxShadow: colors.shadowFloat,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.accent : "transparent" }}>
                <Icon color={focused ? colors.onAccent : colors.muted} name={tab.icon} size={20} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
