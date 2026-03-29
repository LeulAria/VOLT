import { TileState } from "../store/useTileStore";

export interface AlignmentGuides {
  x: number[];
  y: number[];
}

export function calculateGuides(
  activeId: string,
  tiles: Record<string, TileState>,
  currentX: number,
  currentY: number,
  currentWidth: number,
  currentHeight: number,
  threshold: number = 5,
): AlignmentGuides {
  const guides: AlignmentGuides = { x: [], y: [] };

  const activeRect = {
    left: currentX,
    right: currentX + currentWidth,
    top: currentY,
    bottom: currentY + currentHeight,
    centerX: currentX + currentWidth / 2,
    centerY: currentY + currentHeight / 2,
  };

  const otherTiles = Object.values(tiles).filter((t) => t.id !== activeId);

  otherTiles.forEach((tile) => {
    const tileRect = {
      left: tile.x,
      right: tile.x + tile.width,
      top: tile.y,
      bottom: tile.y + tile.height,
      centerX: tile.x + tile.width / 2,
      centerY: tile.y + tile.height / 2,
    };

    // Vertical alignments
    const vPoints = [
      { active: activeRect.left, target: tileRect.left },
      { active: activeRect.left, target: tileRect.right },
      { active: activeRect.right, target: tileRect.left },
      { active: activeRect.right, target: tileRect.right },
      { active: activeRect.centerX, target: tileRect.centerX },
      { active: activeRect.centerX, target: tileRect.left },
      { active: activeRect.centerX, target: tileRect.right },
      { active: activeRect.left, target: tileRect.centerX },
      { active: activeRect.right, target: tileRect.centerX },
    ];

    vPoints.forEach((p) => {
      if (Math.abs(p.active - p.target) < threshold) {
        if (!guides.x.includes(p.target)) guides.x.push(p.target);
      }
    });

    // Horizontal alignments
    const hPoints = [
      { active: activeRect.top, target: tileRect.top },
      { active: activeRect.top, target: tileRect.bottom },
      { active: activeRect.bottom, target: tileRect.top },
      { active: activeRect.bottom, target: tileRect.bottom },
      { active: activeRect.centerY, target: tileRect.centerY },
      { active: activeRect.centerY, target: tileRect.top },
      { active: activeRect.centerY, target: tileRect.bottom },
      { active: activeRect.top, target: tileRect.centerY },
      { active: activeRect.bottom, target: tileRect.centerY },
    ];

    hPoints.forEach((p) => {
      if (Math.abs(p.active - p.target) < threshold) {
        if (!guides.y.includes(p.target)) guides.y.push(p.target);
      }
    });
  });

  return guides;
}
