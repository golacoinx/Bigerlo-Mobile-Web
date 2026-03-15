import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
  }

  interface TextInputProps {
    className?: string;
  }
}

declare module "react-native-safe-area-context" {
  interface NativeSafeAreaViewProps {
    className?: string;
  }
}
