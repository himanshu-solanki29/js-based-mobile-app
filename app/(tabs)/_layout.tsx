import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color }) => <FontAwesome5 name="calendar-alt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => <FontAwesome5 name="user-injured" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <FontAwesome5 name="cog" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
