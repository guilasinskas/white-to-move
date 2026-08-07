import { isWasmSupported } from "@/lib/engine/shared";
import { Stockfish11 } from "@/lib/engine/stockfish11";
import { Stockfish18 } from "@/lib/engine/stockfish18";
import { UciEngine } from "@/lib/engine/uciEngine";
import { EngineName } from "@/types/enums";
import { useEffect, useRef, useState } from "react";

export const useEngine = (engineName: EngineName | undefined) => {
  const [engine, setEngine] = useState<UciEngine | null>(null);
  const engineRef = useRef<UciEngine | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    let isMounted = true;
    if (!engineName) return;

    if (engineName !== EngineName.Stockfish11 && !isWasmSupported()) {
      return;
    }

    pickEngine(engineName).then((newEngine) => {
      if (!isMounted) {
        newEngine.shutdown();
        return;
      }

      setEngine((prev) => {
        prev?.shutdown();
        return newEngine;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [engineName]);

  // Whoever renders this hook (e.g. the "/" page) can be torn down by a
  // route change — Next.js remounts it fresh under a new `key`. Without an
  // unmount-time shutdown, the still-running engine/workers from the old
  // mount keep evaluating in the background and can write stale results
  // (progress, eval) into the shared atoms after the new page has taken
  // over, which also leaves evaluationProgress stuck non-zero and blocks
  // the new game from auto-analyzing.
  useEffect(() => {
    return () => {
      engineRef.current?.shutdown();
    };
  }, []);

  return engine;
};

const pickEngine = (engine: EngineName): Promise<UciEngine> => {
  switch (engine) {
    case EngineName.Stockfish18:
      return Stockfish18.create(false);
    case EngineName.Stockfish18Lite:
      return Stockfish18.create(true);
    case EngineName.Stockfish11:
      return Stockfish11.create();
  }
};
