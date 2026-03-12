import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function LanguageScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Language" }} />
      <MenuScreenScaffold
        title="Language"
        description="Language selection options will be available here as multilingual support is expanded."
      />
    </>
  );
}
