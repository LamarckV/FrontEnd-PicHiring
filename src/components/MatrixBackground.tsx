import { useEffect, useRef } from "react";

const MATRIX_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/?;:\"[]{}\\|!@#$%^&*()_+-=";
const TILE_SIZE = 54;

function randomCharacter() {
  return MATRIX_CHARACTERS[
    Math.floor(Math.random() * MATRIX_CHARACTERS.length)
  ];
}

function MatrixBackground() {
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const background = grid.parentElement;

    let columns = 0;
    let rows = 0;
    let animationFrame = 0;
    let resizeTimeout: number | undefined;
    let pointerTrackingActive = false;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const resetIntensity = () => {
      grid.querySelectorAll<HTMLElement>(".matrix-tile").forEach((tile) => {
        tile.style.setProperty("--intensity", "0");
      });
    };

    const createGrid = () => {
      columns = Math.ceil(window.innerWidth / TILE_SIZE);
      rows = Math.ceil(window.innerHeight / TILE_SIZE);

      grid.style.setProperty("--columns", String(columns));
      grid.style.setProperty("--rows", String(rows));
      grid.replaceChildren();

      const tiles = document.createDocumentFragment();

      for (let index = 0; index < columns * rows; index += 1) {
        const tile = document.createElement("span");
        tile.className = "matrix-tile";
        tile.textContent = randomCharacter();
        tiles.appendChild(tile);
      }

      grid.appendChild(tiles);
      resetIntensity();
    };

    const updateFromPointer = (event: MouseEvent) => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const tileWidth = window.innerWidth / columns;
        const tileHeight = window.innerHeight / rows;
        const radius = Math.max(window.innerWidth, window.innerHeight) * 0.34;
        const tiles = grid.querySelectorAll<HTMLElement>(".matrix-tile");

        background?.style.setProperty("--mouse-x", `${event.clientX}px`);
        background?.style.setProperty("--mouse-y", `${event.clientY}px`);

        tiles.forEach((tile, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const tileX = (column + 0.5) * tileWidth;
          const tileY = (row + 0.5) * tileHeight;
          const distance = Math.hypot(event.clientX - tileX, event.clientY - tileY);
          const intensity = Math.max(0, 1 - distance / radius);

          tile.style.setProperty("--intensity", intensity.toFixed(3));
        });
      });
    };

    const startPointerTracking = () => {
      if (pointerTrackingActive) {
        return;
      }

      window.addEventListener("mousemove", updateFromPointer, { passive: true });
      pointerTrackingActive = true;
    };

    const stopPointerTracking = () => {
      if (!pointerTrackingActive) {
        return;
      }

      window.removeEventListener("mousemove", updateFromPointer);
      window.cancelAnimationFrame(animationFrame);
      pointerTrackingActive = false;
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
      resizeTimeout = window.setTimeout(createGrid, 120);
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
      <div ref={gridRef} className="matrix-grid" />
    </div>
  );
}

export default MatrixBackground;
