"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

const MIN_LEFT = 200;
const MIN_MID = 280;
const MIN_RIGHT = 240;
const DEFAULT_LEFT = 260;
const DEFAULT_RIGHT = 360;
const STORAGE_KEY = "tutor-layout";

type Props = {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  showMiddle?: boolean;
};

function clamp(value: number, min: number, max: number) {
  const result = Math.min(max, Math.max(min, value));
  return result;
}

function bindDrag(onDelta: (dx: number) => void) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      onDelta(dx);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  return onMouseDown;
}

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const onMouseDown = bindDrag(onDrag);
  return (
    <div
      className="group hidden w-2 shrink-0 cursor-col-resize items-stretch justify-center lg:flex"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    >
      <div className="h-full w-px bg-border/60 transition-colors group-hover:bg-accent/60 group-active:bg-accent" />
    </div>
  );
}

export function ResizableColumns({ left, middle, right, showMiddle = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW] = useState(DEFAULT_LEFT);
  const [rightW, setRightW] = useState(DEFAULT_RIGHT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { left: number; right: number };
      setLeftW(data.left);
      setRightW(data.right);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: leftW, right: rightW }));
  }, [leftW, rightW]);

  const bounds = useCallback(() => {
    const total = ref.current?.clientWidth ?? 1200;
    const maxLeft = showMiddle ? total - rightW - MIN_MID - 16 : total - MIN_RIGHT - 16;
    const maxRight = total - leftW - MIN_MID - 16;
    const result = { maxLeft, maxRight };
    return result;
  }, [leftW, rightW, showMiddle]);

  const dragLeft = useCallback(
    (dx: number) => {
      const { maxLeft } = bounds();
      setLeftW((w) => clamp(w + dx, MIN_LEFT, maxLeft));
    },
    [bounds],
  );

  const dragRight = useCallback(
    (dx: number) => {
      const { maxRight } = bounds();
      setRightW((w) => clamp(w - dx, MIN_RIGHT, maxRight));
    },
    [bounds],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden">
        {left}
        {middle}
        {right}
      </div>
      <div ref={ref} className="hidden h-full min-h-0 flex-1 lg:flex">
        <div className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden" style={{ width: leftW }}>
          {left}
        </div>
        <ResizeHandle onDrag={dragLeft} />
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{middle}</div>
        <ResizeHandle onDrag={dragRight} />
        <div className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden" style={{ width: rightW }}>
          {right}
        </div>
      </div>
    </>
  );
}
