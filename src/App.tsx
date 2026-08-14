import { Feed } from "./components/Feed";

function App() {
  return (
    <div className="relative h-dvh w-full bg-neutral-900">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-6 py-4 text-center">
        <h1 className="text-base font-bold text-white">セレンディピティ書店</h1>
      </header>
      <Feed />
    </div>
  );
}

export default App;
