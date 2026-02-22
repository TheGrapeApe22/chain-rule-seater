"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import type Konva from "konva";
import { useSeatingStore } from "@/lib/store";
import type { Table, Seat } from "@/lib/types";

const SEAT_W = 72;
const SEAT_H = 36;
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

  // Top row
  const topTotalW = topCount * SEAT_W + (topCount - 1) * SEAT_GAP;
  const topStartX = (w - topTotalW) / 2;
  for (let i = 0; i < topCount; i++) {
    positions.push({
      x: topStartX + i * (SEAT_W + SEAT_GAP),
      y: TABLE_PADDING_Y,
      index: i,
    });
  }

  // Bottom row
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

interface ContextMenu {
  x: number;
  y: number;
  tableId: string;
}

export function SeatingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [dragStudentId, setDragStudentId] = useState<string | null>(null);
  const [dragSourceSeatId, setDragSourceSeatId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

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
    getStudentById,
  } = useSeatingStore();

  // Resize canvas
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

  // Zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.08;
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.2, Math.min(3, newScale));

      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };

      setScale(clampedScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    },
    [scale, stagePos]
  );

  // Handle HTML drag (from roster) -> canvas drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const studentId = e.dataTransfer.getData("studentId");
      if (!studentId) return;

      const stage = stageRef.current;
      if (!stage) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pointerX = (e.clientX - rect.left - stagePos.x) / scale;
      const pointerY = (e.clientY - rect.top - stagePos.y) / scale;

      // Check if dropped on a seat
      for (const table of tables) {
        const positions = getSeatPositions(table.capacity);
        for (let i = 0; i < table.seats.length; i++) {
          const pos = positions[i];
          const sx = table.x + pos.x;
          const sy = table.y + pos.y;
          if (
            pointerX >= sx &&
            pointerX <= sx + SEAT_W &&
            pointerY >= sy &&
            pointerY <= sy + SEAT_H
          ) {
            const seat = table.seats[i];
            if (!seat.locked) {
              assignStudentToSeat(studentId, seat.id);
            }
            return;
          }
        }
      }
    },
    [tables, stagePos, scale, assignStudentToSeat]
  );

  // Right-click context menu
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault();
      const target = e.target;
      const group = target.findAncestor(".table-group");
      if (group) {
        const tableId = group.getAttr("data-table-id");
        // Check if click was directly on table body (not on a seat)
        const isSeat = target.getAttr("data-seat-id") || target.parent?.getAttr("data-seat-id");
        if (!isSeat && tableId) {
          setContextMenu({
            x: e.evt.clientX,
            y: e.evt.clientY,
            tableId,
          });
        }
      }
    },
    []
  );

  // Close context menu on click elsewhere
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
    }
    setContextMenu(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-muted relative overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          {tables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              onDragEnd={(x, y) => moveTable(table.id, x, y)}
              onSeatClick={(seatId) => toggleSeatLock(seatId)}
              getStudentById={getStudentById}
              onSeatDragStart={(studentId, seatId) => {
                setDragStudentId(studentId);
                setDragSourceSeatId(seatId);
              }}
              onSeatDragMove={(pos) => setDragPos(pos)}
              onSeatDragEnd={(endPos) => {
                if (!dragStudentId || !dragSourceSeatId) {
                  setDragStudentId(null);
                  setDragSourceSeatId(null);
                  setDragPos(null);
                  return;
                }
                // Find if dropped on another seat
                let foundSeat = false;
                for (const t of tables) {
                  const positions = getSeatPositions(t.capacity);
                  for (let i = 0; i < t.seats.length; i++) {
                    const pos = positions[i];
                    const sx = t.x + pos.x;
                    const sy = t.y + pos.y;
                    if (
                      endPos.x >= sx &&
                      endPos.x <= sx + SEAT_W &&
                      endPos.y >= sy &&
                      endPos.y <= sy + SEAT_H
                    ) {
                      const targetSeat = t.seats[i];
                      if (targetSeat.id !== dragSourceSeatId && !targetSeat.locked) {
                        if (targetSeat.studentId) {
                          swapSeats(dragSourceSeatId, targetSeat.id);
                        } else {
                          assignStudentToSeat(dragStudentId, targetSeat.id);
                        }
                        foundSeat = true;
                      }
                      break;
                    }
                  }
                  if (foundSeat) break;
                }
                // If not dropped on a seat, remove student from source seat
                if (!foundSeat) {
                  removeStudentFromSeat(dragSourceSeatId);
                }
                setDragStudentId(null);
                setDragSourceSeatId(null);
                setDragPos(null);
              }}
              mouseDownPos={mouseDownPos}
              hasMoved={hasMoved}
            />
          ))}

          {/* Drag ghost */}
          {dragStudentId && dragPos && (
            <Group x={dragPos.x} y={dragPos.y} listening={false}>
              <Rect
                width={SEAT_W}
                height={SEAT_H}
                fill="#3b82f6"
                opacity={0.7}
                cornerRadius={4}
              />
              <Text
                text={getStudentById(dragStudentId)?.name || ""}
                fill="#ffffff"
                fontSize={10}
                width={SEAT_W}
                height={SEAT_H}
                align="center"
                verticalAlign="middle"
              />
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm px-2 py-1">
        <button
          onClick={() => setScale((s) => Math.min(3, s * 1.2))}
          className="text-xs font-medium px-2 py-1 hover:bg-accent rounded transition-colors"
        >
          +
        </button>
        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.max(0.2, s / 1.2))}
          className="text-xs font-medium px-2 py-1 hover:bg-accent rounded transition-colors"
        >
          -
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 text-sm min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-accent text-popover-foreground transition-colors"
            onClick={() => handleContextAction("lock", contextMenu.tableId)}
          >
            Lock all seats
          </button>
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-accent text-popover-foreground transition-colors"
            onClick={() => handleContextAction("unlock", contextMenu.tableId)}
          >
            Unlock all seats
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-accent text-popover-foreground transition-colors"
            onClick={() => handleContextAction("capacity", contextMenu.tableId)}
          >
            Edit capacity
          </button>
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-destructive hover:text-white text-destructive transition-colors"
            onClick={() => handleContextAction("remove", contextMenu.tableId)}
          >
            Remove table
          </button>
        </div>
      )}
    </div>
  );
}

// Table Node sub-component
function TableNode({
  table,
  onDragEnd,
  onSeatClick,
  getStudentById,
  onSeatDragStart,
  onSeatDragMove,
  onSeatDragEnd,
  mouseDownPos,
  hasMoved,
}: {
  table: Table;
  onDragEnd: (x: number, y: number) => void;
  onSeatClick: (seatId: string) => void;
  getStudentById: (id: string) => { id: string; name: string } | undefined;
  onSeatDragStart: (studentId: string, seatId: string) => void;
  onSeatDragMove: (pos: { x: number; y: number }) => void;
  onSeatDragEnd: (pos: { x: number; y: number }) => void;
  mouseDownPos: React.MutableRefObject<{ x: number; y: number } | null>;
  hasMoved: React.MutableRefObject<boolean>;
}) {
  const { w, h } = getTableDimensions(table.capacity);
  const seatPositions = getSeatPositions(table.capacity);

  return (
    <Group
      x={table.x}
      y={table.y}
      draggable
      name="table-group"
      data-table-id={table.id}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "pointer";
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      }}
    >
      {/* Table body background */}
      <Rect
        width={w}
        height={h}
        fill="#e2e8f0"
        cornerRadius={8}
        stroke="#94a3b8"
        strokeWidth={1}
      />

      {/* Table inner area */}
      <Rect
        x={TABLE_PADDING_X}
        y={TABLE_PADDING_Y + SEAT_H}
        width={w - TABLE_PADDING_X * 2}
        height={TABLE_INNER_H}
        fill="#cbd5e1"
        cornerRadius={4}
      />

      {/* Table label */}
      <Text
        x={0}
        y={TABLE_PADDING_Y + SEAT_H}
        width={w}
        height={TABLE_INNER_H}
        text={table.id.replace("table-", "T")}
        fontSize={11}
        fill="#475569"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        listening={false}
      />

      {/* Seats */}
      {table.seats.map((seat, i) => {
        const pos = seatPositions[i];
        if (!pos) return null;
        return (
          <SeatNode
            key={seat.id}
            seat={seat}
            x={pos.x}
            y={pos.y}
            getStudentById={getStudentById}
            onClick={() => onSeatClick(seat.id)}
            onSeatDragStart={onSeatDragStart}
            onSeatDragMove={onSeatDragMove}
            onSeatDragEnd={onSeatDragEnd}
            tableX={table.x}
            tableY={table.y}
            mouseDownPos={mouseDownPos}
            hasMoved={hasMoved}
          />
        );
      })}
    </Group>
  );
}

// Seat Node sub-component
function SeatNode({
  seat,
  x,
  y,
  getStudentById,
  onClick,
  onSeatDragStart,
  onSeatDragMove,
  onSeatDragEnd,
  tableX,
  tableY,
  mouseDownPos,
  hasMoved,
}: {
  seat: Seat;
  x: number;
  y: number;
  getStudentById: (id: string) => { id: string; name: string } | undefined;
  onClick: () => void;
  onSeatDragStart: (studentId: string, seatId: string) => void;
  onSeatDragMove: (pos: { x: number; y: number }) => void;
  onSeatDragEnd: (pos: { x: number; y: number }) => void;
  tableX: number;
  tableY: number;
  mouseDownPos: React.MutableRefObject<{ x: number; y: number } | null>;
  hasMoved: React.MutableRefObject<boolean>;
}) {
  const student = seat.studentId ? getStudentById(seat.studentId) : null;

  let fillColor = "#ffffff";
  let strokeColor = "#94a3b8";
  if (seat.locked) {
    fillColor = "#fef3c7";
    strokeColor = "#f59e0b";
  }
  if (student) {
    fillColor = seat.locked ? "#fde68a" : "#bfdbfe";
    strokeColor = seat.locked ? "#f59e0b" : "#3b82f6";
  }

  return (
    <Group
      x={x}
      y={y}
      data-seat-id={seat.id}
      onMouseDown={(e) => {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          mouseDownPos.current = { x: pointer.x, y: pointer.y };
          hasMoved.current = false;
        }
      }}
      onMouseMove={(e) => {
        if (!mouseDownPos.current) return;
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          const dx = pointer.x - mouseDownPos.current.x;
          const dy = pointer.y - mouseDownPos.current.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            if (!hasMoved.current && seat.studentId) {
              hasMoved.current = true;
              onSeatDragStart(seat.studentId, seat.id);
            }
            if (hasMoved.current) {
              const scale = stage?.scaleX() || 1;
              const stagePos = stage?.position() || { x: 0, y: 0 };
              const worldX = (pointer.x - stagePos.x) / scale;
              const worldY = (pointer.y - stagePos.y) / scale;
              onSeatDragMove({
                x: worldX - SEAT_W / 2,
                y: worldY - SEAT_H / 2,
              });
            }
          }
        }
      }}
      onMouseUp={(e) => {
        if (!hasMoved.current) {
          // It's a click - toggle lock
          onClick();
        } else {
          // It's a drag end
          const stage = e.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (pointer) {
            const sc = stage?.scaleX() || 1;
            const sp = stage?.position() || { x: 0, y: 0 };
            const worldX = (pointer.x - sp.x) / sc;
            const worldY = (pointer.y - sp.y) / sc;
            onSeatDragEnd({ x: worldX, y: worldY });
          }
        }
        mouseDownPos.current = null;
        hasMoved.current = false;
      }}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "pointer";
      }}
      onMouseLeave={(e) => {
        if (!mouseDownPos.current) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "default";
        }
      }}
    >
      <Rect
        width={SEAT_W}
        height={SEAT_H}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={seat.locked ? 2 : 1}
        cornerRadius={4}
      />
      <Text
        text={student ? student.name : seat.locked ? "Locked" : ""}
        fontSize={10}
        fill={student ? "#1e293b" : "#94a3b8"}
        width={SEAT_W}
        height={SEAT_H}
        align="center"
        verticalAlign="middle"
        listening={false}
        ellipsis
        wrap="none"
      />
      {seat.locked && (
        <Rect
          x={SEAT_W - 10}
          y={2}
          width={8}
          height={8}
          fill="#f59e0b"
          cornerRadius={2}
          listening={false}
        />
      )}
    </Group>
  );
}
