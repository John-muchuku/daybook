import Head from "expo-router/head";
import { Stack } from "expo-router";
import { DaybookProvider } from "../hooks/useDaybook";
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DaybookProvider>
        <Head>
          <title>Daybook — A little more space</title>
          <meta
            name="description"
            content="Your tasks, notes, and a little more space for what matters. A private, local-first workspace."
          />
        </Head>
        <Stack screenOptions={{ headerShown: false }} />
      </DaybookProvider>
    </SafeAreaProvider>
  );
}
