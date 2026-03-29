import React, { useState, useRef, useEffect, ReactNode, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 0 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && anchorRef.current && tooltipRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;
      const spacing = 8;

      switch (position) {
        case "top":
          top = anchorRect.top - tooltipRect.height - spacing;
          left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
          break;
        case "bottom":
          top = anchorRect.bottom + spacing;
          left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
          break;
        case "left":
          top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
          left = anchorRect.left - tooltipRect.width - spacing;
          break;
        case "right":
          top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2;
          left = anchorRect.right + spacing;
          break;
      }

      // Basic bounds checking
      if (top < spacing) top = spacing;
      if (left < spacing) left = spacing;
      if (left + tooltipRect.width > window.innerWidth - spacing) {
        left = window.innerWidth - tooltipRect.width - spacing;
      }
      if (top + tooltipRect.height > window.innerHeight - spacing) {
        top = window.innerHeight - tooltipRect.height - spacing;
      }

      setCoords({ top, left });
    }
  }, [isVisible, position, content]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const child = isValidElement(children) ? children : <span>{children}</span>;

  return (
    <>
      {cloneElement(child as React.ReactElement<any>, {
        ref: anchorRef,
        onMouseEnter: (e: React.MouseEvent) => {
          showTooltip();
          if (child.props.onMouseEnter) child.props.onMouseEnter(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          hideTooltip();
          if (child.props.onMouseLeave) child.props.onMouseLeave(e);
        },
        onFocus: (e: React.FocusEvent) => {
          showTooltip();
          if (child.props.onFocus) child.props.onFocus(e);
        },
        onBlur: (e: React.FocusEvent) => {
          hideTooltip();
          if (child.props.onBlur) child.props.onBlur(e);
        },
      })}
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className="absolute z-[9999999] rounded-sm border border-white/[0.12] bg-[#1e1e1e] px-[10px] py-[6px] text-xs font-medium text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] [animation:tooltip-in_0.08s_cubic-bezier(0.16,1,0.3,1)_forwards] [pointer-events:none] whitespace-nowrap"
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
