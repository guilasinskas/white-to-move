import { useCallback, useEffect, useRef, useState } from "react";

interface UseCountdownOptions {
  onExpire?: () => void;
}

export const useCountdown = (
  initialSeconds: number,
  { onExpire }: UseCountdownOptions = {}
) => {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(
    (seconds: number = initialSeconds) => {
      setIsRunning(false);
      setRemaining(seconds);
    },
    [initialSeconds]
  );

  return { remaining, isRunning, start, pause, reset };
};
