import { useRef, useState, useCallback, useEffect } from "react";
import { useSeatingStore } from "@/lib/store";
import type { Table, Seat } from "@/lib/types";
import s from "./seating-canvas.module.css";

const SEAT_W = 72;
const SEAT_H = 64;
const SEAT_GAP = 6;
const TABLE_PADDING_X = 10;
const TABLE_PADDING_Y = 4;
const TABLE_INNER_H = 20;

function getTableDimensions(capacity: number) {
  const topCount = Math.ceil(capacity / 2);
  const w = TABLE_PADDING_X * 2 + topCount * SEAT_W + (topCount - 1) * SEAT_GAP;
  const h = TABLE_PADDING_Y * 2 + SEAT_H + TABLE_INNER_H + SEAT_H;
  return { w, h, topCount };
}

function getSeatPositions(capacity: number) {
  const topCount = Math.ceil(capacity / 2);
  const bottomCount = capacity - topCount;
  const { w } = getTableDimensions(capacity);
  const positions: { x: number; y: number; index: number }[] = [];

  const topTotalW = topCount * SEAT_W + (topCount - 1) * SEAT_GAP;
  const topStartX = (w - topTotalW) / 2;
  for (let i = 0; i < topCount; i++) {
    positions.push({
      x: topStartX + i * (SEAT_W + SEAT_GAP),
      y: TABLE_PADDING_Y,
      index: i,
    });
  }

  const bottomTotalW = bottomCount * SEAT_W + (bottomCount - 1) * SEAT_GAP;
  const bottomStartX = (w - bottomTotalW) / 2;
  for (let i = 0; i < bottomCount; i++) {
    positions.push({
      x: bottomStartX + i * (SEAT_W + SEAT_GAP),
      y: TABLE_PADDING_Y + SEAT_H + TABLE_INNER_H,
      index: topCount + i,
    });
  }

  return positions;
}

interface HitResult {
  type: "table" | "seat";
  tableId: string;
  seatId?: string;
  seatIndex?: number;
}

function hitTest(
  worldX: number,
  worldY: number,
  tables: Table[]
): HitResult | null {
  // Check in reverse so topmost drawn table (last in array) is hit first
  for (let ti = tables.length - 1; ti >= 0; ti--) {
    const table = tables[ti];
    const { w, h } = getTableDimensions(table.capacity);
    const positions = getSeatPositions(table.capacity);

    // Check seats first (they're on top of the table)
    for (let i = 0; i < table.seats.length; i++) {
      const pos = positions[i];
      const sx = table.x + pos.x;
      const sy = table.y + pos.y;
      if (worldX >= sx && worldX <= sx + SEAT_W && worldY >= sy && worldY <= sy + SEAT_H) {
        return { type: "seat", tableId: table.id, seatId: table.seats[i].id, seatIndex: i };
      }
    }

    // Check table body
    if (
      worldX >= table.x &&
      worldX <= table.x + w &&
      worldY >= table.y &&
      worldY <= table.y + h
    ) {
      return { type: "table", tableId: table.id };
    }
  }
  return null;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  table: Table,
  getStudentName: (id: string) => string | undefined
) {
  const { w, h } = getTableDimensions(table.capacity);
  const positions = getSeatPositions(table.capacity);

  // Table body background
  roundRect(ctx, table.x, table.y, w, h, 8);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Table inner area
  const innerX = table.x + TABLE_PADDING_X;
  const innerY = table.y + TABLE_PADDING_Y + SEAT_H;
  const innerW = w - TABLE_PADDING_X * 2;
  roundRect(ctx, innerX, innerY, innerW, TABLE_INNER_H, 4);
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();

  // Table label
  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    table.name,
    table.x + w / 2,
    innerY + TABLE_INNER_H / 2
  );

  // Draw each seat
  for (let i = 0; i < table.seats.length; i++) {
    const seat = table.seats[i];
    const pos = positions[i];
    if (!pos) continue;

    const sx = table.x + pos.x;
    const sy = table.y + pos.y;

    const studentName = seat.studentId ? getStudentName(seat.studentId) : undefined;

    let fillColor = "#ffffff";
    let strokeColor = "#94a3b8";
    let strokeWidth = 1;

    if (seat.locked) {
      fillColor = studentName ? "#fde68a" : "#fef3c7";
      strokeColor = "#f59e0b";
      strokeWidth = 2;
    } else if (studentName) {
      fillColor = "#bfdbfe";
      strokeColor = "#3b82f6";
    }

    roundRect(ctx, sx, sy, SEAT_W, SEAT_H, 4);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    // Seat text
    const label = studentName || (seat.locked ? "Locked" : "");
    if (label) {
      ctx.fillStyle = studentName ? "#1e293b" : "#94a3b8";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxWidth = SEAT_W - 8;
      const lineHeight = 13;
      const maxLines = Math.floor((SEAT_H - 10) / lineHeight);

      // Word wrap
      const words = label.split(/\s+/);
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Clamp to maxLines and truncate last line if needed
      const clipped = lines.length > maxLines;
      const displayLines = lines.slice(0, maxLines);
      const lastIdx = displayLines.length - 1;
      if (lastIdx >= 0) {
        let last = displayLines[lastIdx];
        if (clipped || ctx.measureText(last).width > maxWidth) {
          while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
            last = last.slice(0, -1);
          }
          displayLines[lastIdx] = last + "…";
        }
      }

      // Render lines centered vertically in seat
      const totalH = displayLines.length * lineHeight;
      const startY = sy + (SEAT_H - totalH) / 2 + lineHeight / 2;
      for (let li = 0; li < displayLines.length; li++) {
        ctx.fillText(displayLines[li], sx + SEAT_W / 2, startY + li * lineHeight);
      }
    }

    // Lock indicator - lock icon
    if (seat.locked) {
      const lockW = 6;   // body width
      const lockH = 5;   // body height (excludes shackle arc above)
      const shackleR = 2; // radius of the shackle arc

      const lx = sx + SEAT_W - lockW - 2;
      const ly = sy + 3;

      // Body
      roundRect(ctx, lx, ly + shackleR, lockW, lockH, 1);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();

      // Shackle arc
      ctx.beginPath();
      ctx.arc(lx + lockW / 2, ly + shackleR, shackleR, Math.PI, 0);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
}

interface ContextMenu {
  x: number;
  y: number;
  tableId: string;
}

export function SeatingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const [scaleDisplay, setScaleDisplay] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Drag state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const isDraggingTableRef = useRef(false);
  const dragTableIdRef = useRef<string | null>(null);
  const dragTableStartWorldRef = useRef({ x: 0, y: 0 });
  const dragTableOrigPosRef = useRef({ x: 0, y: 0 });

  const isDraggingSeatRef = useRef(false);
  const dragSeatStudentIdRef = useRef<string | null>(null);
  const dragSeatSourceIdRef = useRef<string | null>(null);
  const dragGhostWorldRef = useRef<{ x: number; y: number } | null>(null);

  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const mouseDownHitRef = useRef<HitResult | null>(null);

  const animFrameRef = useRef<number>(0);

  const {
    tables,
    students,
    moveTable,
    toggleSeatLock,
    assignStudentToSeat,
    removeStudentFromSeat,
    swapSeats,
    lockTableSeats,
    unlockTableSeats,
    removeTable,
    setTableCapacity,
    renameTable,
    getStudentById,
  } = useSeatingStore();

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const getStudentName = useCallback(
    (id: string) => getStudentById(id)?.name,
    [getStudentById]
  );

  // Screen -> world coordinates
  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - offsetRef.current.x) / scaleRef.current,
      y: (sy - offsetRef.current.y) / scaleRef.current,
    };
  }, []);

  // Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Apply camera transform
    ctx.save();
    ctx.translate(offsetRef.current.x, offsetRef.current.y);
    ctx.scale(scaleRef.current, scaleRef.current);

    // Draw grid dots
    const scale = scaleRef.current;
    const offX = offsetRef.current.x;
    const offY = offsetRef.current.y;
    const gridSize = 40;

    const startWorldX = Math.floor(-offX / scale / gridSize) * gridSize;
    const startWorldY = Math.floor(-offY / scale / gridSize) * gridSize;
    const endWorldX = Math.ceil((w - offX) / scale / gridSize) * gridSize;
    const endWorldY = Math.ceil((h - offY) / scale / gridSize) * gridSize;

    ctx.fillStyle = "#d1d5db";
    for (let gx = startWorldX; gx <= endWorldX; gx += gridSize) {
      for (let gy = startWorldY; gy <= endWorldY; gy += gridSize) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw tables
    const currentTables = tablesRef.current;
    for (const table of currentTables) {
      drawTable(ctx, table, getStudentName);
    }

    // Draw drag ghost
    if (isDraggingSeatRef.current && dragGhostWorldRef.current && dragSeatStudentIdRef.current) {
      const ghost = dragGhostWorldRef.current;
      roundRect(ctx, ghost.x, ghost.y, SEAT_W, SEAT_H, 4);
      ctx.fillStyle = "rgba(59, 130, 246, 0.7)";
      ctx.fill();

      const name = getStudentName(dragSeatStudentIdRef.current) || "";
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, ghost.x + SEAT_W / 2, ghost.y + SEAT_H / 2);
    }

    ctx.restore();
  }, [getStudentName]);

  // Continuous render
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // Setup canvas DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = stageSize.width * dpr;
    canvas.height = stageSize.height * dpr;
  }, [stageSize]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldScale = scaleRef.current;
      const scaleBy = 1.08;
      const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.2, Math.min(3, newScale));

      const worldX = (mx - offsetRef.current.x) / oldScale;
      const worldY = (my - offsetRef.current.y) / oldScale;

      scaleRef.current = clampedScale;
      offsetRef.current = {
        x: mx - worldX * clampedScale,
        y: my - worldY * clampedScale,
      };
      setScaleDisplay(clampedScale);
    },
    []
  );

  // Mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) return; // right click handled separately
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = screenToWorld(mx, my);
      const hit = hitTest(world.x, world.y, tablesRef.current);

      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
      hasMovedRef.current = false;
      mouseDownHitRef.current = hit;

      if (hit?.type === "table" && !hit.seatId) {
        // Potential table drag
        isDraggingTableRef.current = false; // start on move
        dragTableIdRef.current = hit.tableId;
        dragTableStartWorldRef.current = world;
        const table = tablesRef.current.find((t) => t.id === hit.tableId);
        if (table) {
          dragTableOrigPosRef.current = { x: table.x, y: table.y };
        }
      } else if (!hit) {
        // Start panning
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panOffsetStartRef.current = { ...offsetRef.current };
      }
    },
    [screenToWorld]
  );

  // Mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const dx = mouseDownPosRef.current
        ? e.clientX - mouseDownPosRef.current.x
        : 0;
      const dy = mouseDownPosRef.current
        ? e.clientY - mouseDownPosRef.current.y
        : 0;
      const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3;

      if (moved && !hasMovedRef.current) {
        hasMovedRef.current = true;
      }

      // Panning
      if (isPanningRef.current) {
        offsetRef.current = {
          x: panOffsetStartRef.current.x + (e.clientX - panStartRef.current.x),
          y: panOffsetStartRef.current.y + (e.clientY - panStartRef.current.y),
        };
        return;
      }

      // Table dragging
      if (dragTableIdRef.current && hasMovedRef.current && !isDraggingSeatRef.current) {
        isDraggingTableRef.current = true;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const world = screenToWorld(mx, my);
        const ddx = world.x - dragTableStartWorldRef.current.x;
        const ddy = world.y - dragTableStartWorldRef.current.y;
        moveTable(
          dragTableIdRef.current,
          dragTableOrigPosRef.current.x + ddx,
          dragTableOrigPosRef.current.y + ddy
        );
        return;
      }

      // Seat dragging
      if (mouseDownHitRef.current?.type === "seat" && hasMovedRef.current) {
        const hit = mouseDownHitRef.current;
        const table = tablesRef.current.find((t) => t.id === hit.tableId);
        const seat = table?.seats.find((seat) => seat.id === hit.seatId);
        if (seat?.studentId && !isDraggingSeatRef.current) {
          isDraggingSeatRef.current = true;
          dragSeatStudentIdRef.current = seat.studentId;
          dragSeatSourceIdRef.current = seat.id;
        }
        if (isDraggingSeatRef.current) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const world = screenToWorld(mx, my);
          dragGhostWorldRef.current = {
            x: world.x - SEAT_W / 2,
            y: world.y - SEAT_H / 2,
          };
        }
      }
    },
    [screenToWorld, moveTable]
  );

  // Mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) return;

      // Handle seat drag end
      if (isDraggingSeatRef.current && dragSeatStudentIdRef.current && dragSeatSourceIdRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const world = screenToWorld(mx, my);
          const hit = hitTest(world.x, world.y, tablesRef.current);

          if (hit?.type === "seat" && hit.seatId === dragSeatSourceIdRef.current) {
            // Dropped back onto the source seat: keep assignment as-is
          } else if (hit?.type === "seat" && hit.seatId && hit.seatId !== dragSeatSourceIdRef.current) {
            const table = tablesRef.current.find((t) => t.id === hit.tableId);
            const targetSeat = table?.seats.find((seat) => seat.id === hit.seatId);
            if (targetSeat && !targetSeat.locked) {
              if (targetSeat.studentId) {
                swapSeats(dragSeatSourceIdRef.current, targetSeat.id);
              } else {
                assignStudentToSeat(dragSeatStudentIdRef.current, targetSeat.id);
              }
            }
          } else {
            // Dropped outside a seat -> unseat
            removeStudentFromSeat(dragSeatSourceIdRef.current);
          }
        }

        isDraggingSeatRef.current = false;
        dragSeatStudentIdRef.current = null;
        dragSeatSourceIdRef.current = null;
        dragGhostWorldRef.current = null;
        mouseDownPosRef.current = null;
        mouseDownHitRef.current = null;
        hasMovedRef.current = false;
        return;
      }

      // Handle table drag end (already committed via moveTable in handleMouseMove)
      if (isDraggingTableRef.current) {
        isDraggingTableRef.current = false;
        dragTableIdRef.current = null;
        mouseDownPosRef.current = null;
        mouseDownHitRef.current = null;
        hasMovedRef.current = false;
        return;
      }

      isPanningRef.current = false;

      // If didn't move, it's a click
      if (!hasMovedRef.current && mouseDownHitRef.current) {
        const hit = mouseDownHitRef.current;
        if (hit.type === "seat" && hit.seatId) {
          toggleSeatLock(hit.seatId);
        }
      }

      dragTableIdRef.current = null;
      mouseDownPosRef.current = null;
      mouseDownHitRef.current = null;
      hasMovedRef.current = false;
    },
    [screenToWorld, swapSeats, assignStudentToSeat, removeStudentFromSeat, toggleSeatLock]
  );

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = screenToWorld(mx, my);
      const hit = hitTest(world.x, world.y, tablesRef.current);

      if (hit?.type === "table") {
        setContextMenu({ x: e.clientX, y: e.clientY, tableId: hit.tableId });
      } else {
        setContextMenu(null);
      }
    },
    [screenToWorld]
  );

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleContextAction = (action: string, tableId: string) => {
    switch (action) {
      case "lock":
        lockTableSeats(tableId);
        break;
      case "unlock":
        unlockTableSeats(tableId);
        break;
      case "remove":
        removeTable(tableId);
        break;
      case "capacity": {
        const input = prompt("New capacity (2-6):");
        if (input) {
          const cap = parseInt(input);
          if (!isNaN(cap) && cap >= 2 && cap <= 6) {
            setTableCapacity(tableId, cap);
          }
        }
        break;
      }
      case "rename": {
        const table = tablesRef.current.find((t) => t.id === tableId);
        const input = prompt("New table name:", table?.name || "");
        if (input && input.trim()) {
          renameTable(tableId, input.trim());
        }
        break;
      }
    }
    setContextMenu(null);
  };

  // HTML drag (from roster sidebar) -> canvas drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const studentId = e.dataTransfer.getData("studentId");
      if (!studentId) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = screenToWorld(mx, my);
      const hit = hitTest(world.x, world.y, tablesRef.current);

      if (hit?.type === "seat" && hit.seatId) {
        const table = tablesRef.current.find((t) => t.id === hit.tableId);
        const seat = table?.seats.find((seat) => seat.id === hit.seatId);
        if (seat && !seat.locked) {
          assignStudentToSeat(studentId, seat.id);
        }
      }
    },
    [screenToWorld, assignStudentToSeat]
  );

  // Cursor style
  const handleMouseMoveForCursor = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current || isDraggingTableRef.current || isDraggingSeatRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = screenToWorld(mx, my);
      const hit = hitTest(world.x, world.y, tablesRef.current);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.cursor = hit ? "pointer" : "grab";
    },
    [screenToWorld]
  );

  return (
    <div
      ref={containerRef}
      className={s.container}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        width={stageSize.width}
        height={stageSize.height}
        style={{ width: stageSize.width, height: stageSize.height }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleMouseMoveForCursor(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isPanningRef.current = false;
        }}
        onContextMenu={handleContextMenu}
      />

      {/* Zoom controls */}
      <div className={s.zoomControls}>
        <button
          onClick={() => {
            scaleRef.current = Math.min(3, scaleRef.current * 1.2);
            setScaleDisplay(scaleRef.current);
          }}
          className={s.zoomBtn}
        >
          +
        </button>
        <span className={s.zoomLabel}>
          {Math.round(scaleDisplay * 100)}%
        </span>
        <button
          onClick={() => {
            scaleRef.current = Math.max(0.2, scaleRef.current / 1.2);
            setScaleDisplay(scaleRef.current);
          }}
          className={s.zoomBtn}
        >
          -
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className={s.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={s.menuItem}
            onClick={() => handleContextAction("lock", contextMenu.tableId)}
          >
            Lock all seats
          </button>
          <button
            className={s.menuItem}
            onClick={() => handleContextAction("unlock", contextMenu.tableId)}
          >
            Unlock all seats
          </button>
          <div className={s.menuDivider} />
          <button
            className={s.menuItem}
            onClick={() => handleContextAction("rename", contextMenu.tableId)}
          >
            Rename table
          </button>
          <button
            className={s.menuItem}
            onClick={() => handleContextAction("capacity", contextMenu.tableId)}
          >
            Edit capacity
          </button>
          <button
            className={s.menuDanger}
            onClick={() => handleContextAction("remove", contextMenu.tableId)}
          >
            Remove table
          </button>
        </div>
      )}
    </div>
  );
}
