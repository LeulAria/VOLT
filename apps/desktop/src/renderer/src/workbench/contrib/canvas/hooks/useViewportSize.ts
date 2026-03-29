import { useEffect, useRef, MutableRefObject } from "react";

export default function useViewportSize(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  onSizeChange: (size: { width: number; height: number }) => void,
) {
  const onSizeChangeRef = useRef(onSizeChange);
  onSizeChangeRef.current = onSizeChange;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastW = -1;
    let lastH = -1;

    const updateSize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === lastW && height === lastH) return;
      lastW = width;
      lastH = height;
      onSizeChangeRef.current({ width, height });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [containerRef]);
}
