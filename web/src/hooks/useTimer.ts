import { useEffect, useState } from "react";

export function useTimer() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);
}

export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
