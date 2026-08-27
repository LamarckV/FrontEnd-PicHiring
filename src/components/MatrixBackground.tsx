import { useEffect, useRef } from "react";

const MATRIX_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/?;:\"[]{}\\|!@#$%^&*()_+-=";
const TILE_SIZE = 54;
const MAX_INTERACTION_RADIUS = 540;

function randomCharacter() {
  return MATRIX_CHARACTERS[
    Math.floor(Math.random() * MATRIX_CHARACTERS.length)
  ];
}

function MatrixBackground() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const glow = glowRef.current;

    if (!grid || !glow) {
      return;
    }

    let columns = 0;
    let rows = 0;
    let animationFrame = 0;
    let resizeTimeout: number | undefined;
    let pointerTrackingActive = false;
    let framePending = false;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let tiles: HTMLElement[] = [];
    let activeTileIndexes = new Set<number>();
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const resetIntensity = () => {
      activeTileIndexes.forEach((index) => {
        tiles[index]?.style.setProperty("--intensity", "0");
      });
      activeTileIndexes.clear();
    };

    const createGrid = () => {
      columns = Math.ceil(window.innerWidth / TILE_SIZE);
      rows = Math.ceil(window.innerHeight / TILE_SIZE);

      grid.style.setProperty("--columns", String(columns));
      grid.style.setProperty("--rows", String(rows));
      grid.replaceChildren();

      const tileFragment = document.createDocumentFragment();
      const nextTiles: HTMLElement[] = [];

      for (let index = 0; index < columns * rows; index += 1) {
        const tile = document.createElement("span");
        tile.className = "matrix-tile";
        tile.textContent = randomCharacter();
        nextTiles.push(tile);
        tileFragment.appendChild(tile);
      }

      tiles = nextTiles;
      activeTileIndexes = new Set<number>();
      grid.appendChild(tileFragment);
    };

    const renderPointerInteraction = () => {
      framePending = false;

      if (columns === 0 || rows === 0) {
        return;
      }

      const tileWidth = window.innerWidth / columns;
      const tileHeight = window.innerHeight / rows;
      const radius = Math.min(
        MAX_INTERACTION_RADIUS,
        Math.max(window.innerWidth, window.innerHeight) * 0.34,
      );
      const radiusSquared = radius * radius;
      const minColumn = Math.max(0, Math.floor((pointerX - radius) / tileWidth));
      const maxColumn = Math.min(columns - 1, Math.floor((pointerX + radius) / tileWidth));
      const minRow = Math.max(0, Math.floor((pointerY - radius) / tileHeight));
      const maxRow = Math.min(rows - 1, Math.floor((pointerY + radius) / tileHeight));
      const nextActiveTileIndexes = new Set<number>();

      glow.style.setProperty("--mouse-x", `${pointerX}px`);
      glow.style.setProperty("--mouse-y", `${pointerY}px`);

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          const index = row * columns + column;
          const tile = tiles[index];
          const tileX = (column + 0.5) * tileWidth;
          const tileY = (row + 0.5) * tileHeight;
          const distanceX = pointerX - tileX;
          const distanceY = pointerY - tileY;
          const distanceSquared = distanceX * distanceX + distanceY * distanceY;

          if (!tile || distanceSquared > radiusSquared) {
            continue;
          }

          const distanceIntensity = 1 - Math.sqrt(distanceSquared) / radius;
          const intensity = Math.pow(distanceIntensity, 1.35);
          tile.style.setProperty("--intensity", intensity.toFixed(3));
          nextActiveTileIndexes.add(index);
        }
      }

      activeTileIndexes.forEach((index) => {
        if (!nextActiveTileIndexes.has(index)) {
          tiles[index]?.style.setProperty("--intensity", "0");
        }
      });

      activeTileIndexes = nextActiveTileIndexes;
    };

    const schedulePointerRender = () => {
      if (framePending) {
        return;
      }

      framePending = true;
      animationFrame = window.requestAnimationFrame(renderPointerInteraction);
    };

    const updateFromPointer = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedulePointerRender();
    };

    const startPointerTracking = () => {
      if (pointerTrackingActive) {
        return;
      }

      window.addEventListener("pointermove", updateFromPointer, { passive: true });
      pointerTrackingActive = true;
    };

    const stopPointerTracking = () => {
      if (pointerTrackingActive) {
        window.removeEventListener("pointermove", updateFromPointer);
        pointerTrackingActive = false;
      }

      window.cancelAnimationFrame(animationFrame);
      framePending = false;
      resetIntensity();
    };

    const syncMotionPreference = () => {
      if (motionPreference.matches) {
        stopPointerTracking();
      } else {
        startPointerTracking();
      }
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        createGrid();
        schedulePointerRender();
      }, 120);
    };

    createGrid();
    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      motionPreference.removeEventListener("change", syncMotionPreference);
      stopPointerTracking();
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="matrix-background" aria-hidden="true">
      <div ref={glowRef} className="matrix-glow" />
      <div ref={gridRef} className="matrix-grid" />
    </div>
  );
}

export default MatrixBackground;
