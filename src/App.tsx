import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Feed } from "./components/Feed";
import { Onboarding } from "./components/Onboarding";

function hasOnboarded(): boolean {
  try {
    return localStorage.getItem("serendipity-onboarded") === "true";
  } catch {
    return true; // localStorage unavailable — don't block the app on it
  }
}

function App() {
  const [onboarded, setOnboarded] = useState(hasOnboarded);

  return (
    <div className="h-dvh w-full bg-black">
      {onboarded ? (
        <Feed />
      ) : (
        <Onboarding onComplete={() => setOnboarded(true)} />
      )}
      <Analytics />
    </div>
  );
}

export default App;
