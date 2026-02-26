# Bigerlo

A minimal iOS-style mobile web application built with Expo + React Native.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js (serves landing page + API on port 5000)
- **Dev Server**: Expo Metro on port 8081

## Features

### Home Screen (`app/(tabs)/index.tsx`)
- Top header: circular profile photo (left) + "BIGERLO" title (center)
- Large gray rounded card: shows camera icon (or captured photo preview after taking a snapshot)
- Full-screen camera modal: opens on camera icon tap, X button to close, large white circular capture button at bottom
- Chat area below card: ChatGPT-style message bubbles (user: right/black, assistant: left/gray)
- Fixed chat input with send button at the bottom
- Static assistant reply (API integration pending)

### Bottom Navigation (`app/(tabs)/_layout.tsx`)
- 4 tabs: Home, Chat, History, Shop
- Active tab: black filled circle with icon
- Inactive tabs: gray icons
- iOS 26+: NativeTabs with liquid glass support
- Other platforms: Classic Tabs with BlurView (iOS) / solid white (web/Android)
- Tab bar hides on keyboard open

### Other Screens
- `app/(tabs)/chat.tsx` - Chat tab (placeholder)
- `app/(tabs)/history.tsx` - History tab (placeholder)
- `app/(tabs)/shop.tsx` - Shop tab (placeholder)

## Design System

Colors (`constants/colors.ts`):
- Background: `#F2F2F7` (light gray)
- Card: `#EBEBF0` (slightly darker gray)
- Card inner: `#E5E5EA`
- Black: `#000000` (active tab, user bubbles, send button)
- Text secondary: `#8E8E93`

## Tech Stack

- expo-router (file-based navigation)
- expo-camera (full-screen camera with capture)
- expo-blur (tab bar blur on iOS)
- expo-glass-effect + NativeTabs (iOS 26+ liquid glass)
- react-native-keyboard-controller (KeyboardAvoidingView for chat)
- @expo/vector-icons Ionicons (all icons)
- @tanstack/react-query (ready for API integration)

## Workflows

- **Start Backend**: `npm run server:dev` (port 5000)
- **Start Frontend**: `npm run expo:dev` (port 8081)
