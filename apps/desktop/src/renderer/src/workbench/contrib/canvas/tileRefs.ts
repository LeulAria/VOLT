/**
 * Registry for tile DOM elements and drag state.
 * Used for high-performance multi-drag without React re-renders.
 */

export const tileRefs = new Map<string, HTMLElement>();

export interface DragStartPos {
  x: number;
  y: number;
}

export const dragStartPositions = new Map<string, DragStartPos>();
