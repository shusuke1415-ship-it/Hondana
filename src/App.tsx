import { Bookshelf } from "./components/Bookshelf";

function App() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <header className="border-b border-neutral-200 px-8 py-6 text-center dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          セレンディピティ書店
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          気になる本をタップして裏返してみてください
        </p>
      </header>
      <Bookshelf />
    </div>
  );
}

export default App;
