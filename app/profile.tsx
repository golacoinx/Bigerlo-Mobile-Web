import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Profile & Account" }} />
      <MenuScreenScaffold
        title="Profile & Account"
        description="Manage account preferences and identity details here. Sign-in and account syncing will be added in a future release."
      />
    </>
  );
}
