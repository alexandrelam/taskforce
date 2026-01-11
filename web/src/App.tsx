import { TaskBoard } from "./components/TaskBoard";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <>
      <TaskBoard />
      <Toaster />
      <div className="fixed bottom-4 left-4 text-sm text-muted-foreground">
        Made with ❤️ by Alexandre LAM
      </div>
    </>
  );
}

export default App;
