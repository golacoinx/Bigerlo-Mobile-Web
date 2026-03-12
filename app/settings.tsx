import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <MenuScreenScaffold
        title="Settings"
        description="General app controls live here. Use Language and Privacy pages for focused preferences."
      />
    </>
  );
}
