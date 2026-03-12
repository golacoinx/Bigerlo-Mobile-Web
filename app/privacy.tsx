import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy" }} />
      <MenuScreenScaffold
        title="Privacy"
        description="Review privacy controls and data-handling details. More granular privacy settings will be added in upcoming updates."
      />
    </>
  );
}
