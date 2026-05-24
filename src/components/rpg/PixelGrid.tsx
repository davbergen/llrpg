import React from 'react';

export type PixelGridData = (string | null)[][];

interface PixelGridProps {
  grid: PixelGridData;
  scale?: number;
  tint?: string;
}

export const PixelGrid: React.FC<PixelGridProps> = ({ grid, scale = 4, tint }) => {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  return (
    <canvas
      width={w * scale}
      height={h * scale}
      style={{ imageRendering: 'pixelated', display: 'block' }}
      ref={(el) => {
        if (!el) return;
        const ctx = el.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, el.width, el.height);
        grid.forEach((row, y) =>
          row.forEach((col, x) => {
            if (!col) return;
            ctx.fillStyle = tint ?? col;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }),
        );
      }}
    />
  );
};

export default PixelGrid;
