import React from "react";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

const appVersion = Constants.expoConfig?.version ?? "Not available";

export default function AboutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "About" }} />
      <MenuScreenScaffold
        title="About BIGERLO"
        description={`BIGERLO helps you analyze products quickly with AI-assisted chat.

App version: ${appVersion}`}
      />
    </>
  );
}
