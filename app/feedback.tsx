import React from "react";
import { Stack } from "expo-router";
import { MenuScreenScaffold } from "@/components/menu/MenuScreenScaffold";

export default function FeedbackScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Send Feedback" }} />
      <MenuScreenScaffold
        title="Send Feedback / Report a Bug"
        description="We value your feedback. In-app submission and bug reporting integrations will be added in a future release."
      />
    </>
  );
}
