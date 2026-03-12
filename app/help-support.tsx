import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function HelpSupportScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Help & Support" }} />
      <MenuScreenScaffold
        title="Help & Support"
        description="Find answers, troubleshooting tips, and contact paths for support. Expanded self-service help content is coming soon."
      />
    </>
  );
}
