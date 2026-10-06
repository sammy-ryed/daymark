import { Stack } from "expo-router";
import { SessionProvider } from "../src/session";
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
