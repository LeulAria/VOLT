"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

export type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Props forwarded to the scrollable viewport (where overflow and scroll events occur). */
  viewportProps?: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
  ScrollAreaProps
>(function ScrollArea({ className, children, viewportProps, ...props }, ref) {
  const { className: viewportClassName, ...viewportRest } = viewportProps ?? {}
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={ref}
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName,
        )}
        {...viewportRest}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = "ScrollArea"

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "z-20 flex touch-none p-px transition-colors select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-white/[0.18] hover:bg-white/[0.28] active:bg-white/[0.35]"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
