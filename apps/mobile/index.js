import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

// Resolve routes beside this entry, including when dependencies live on another drive.
export function App() {
  const context = require.context("./app");
  return <ExpoRoot context={context} />;
}

registerRootComponent(App);
