import { Box } from "@mui/material";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { CC } from "@/constants";

const MIN_PCT = 30;
const MAX_PCT = 80;

export default function ResizeHandle({
  containerRef,
  onResize,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onResize: (pct: number) => void;
}) {
  const draggingRef = useRef(false);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onResize(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)));
    },
    [containerRef, onResize]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <Box
      onPointerDown={handlePointerDown}
      sx={{
        width: "10px",
        flexShrink: 0,
        cursor: "col-resize",
        alignSelf: "stretch",
        position: "relative",
        touchAction: "none",
        "&:hover::after": { backgroundColor: CC.borderHover },
        "&::after": {
          content: '""',
          position: "absolute",
          left: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "2px",
          height: "32px",
          borderRadius: "2px",
          backgroundColor: CC.border,
          transition: "background-color 120ms ease",
        },
      }}
    />
  );
}
