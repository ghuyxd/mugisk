import React from "react";
import { usePlayer } from "../context/PlayerContext";
import { X, GripVertical, Trash2, Play } from "lucide-react";
import type { Track } from "@mugisk/shared-types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SortableQueueRowProps {
  track: Track;
  index: number;
  sortableId: string;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

function SortableQueueRow({ track, index, sortableId, isPlaying, onPlay, onRemove }: SortableQueueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderBottom: "1px solid var(--border)", 
    color: isPlaying ? "var(--primary)" : "inherit",
    backgroundColor: "var(--bg)"
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`track-row ${isPlaying ? "playing" : ""}`}
      onDoubleClick={onPlay}
    >
      <td style={{ padding: "8px", width: 30, cursor: "grab" }} {...attributes} {...listeners}>
        <GripVertical size={14} color="var(--text-muted)" />
      </td>
      <td style={{ padding: "8px", width: 30 }}>
        <div className="track-row-index">
          {isPlaying ? <Play size={12} fill="currentColor" /> : index + 1}
        </div>
        <button 
          className="track-row-play-btn"
          onClick={onPlay}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
        >
          <Play size={12} fill="currentColor" />
        </button>
      </td>
      <td style={{ padding: "8px", fontWeight: 500, fontSize: 13, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</td>
      <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 12, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist}</td>
      <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 12, textAlign: "right" }}>
        <span className="track-row-time">{formatDuration(track.duration)}</span>
        <button 
          className="track-row-menu-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "none", marginLeft: 16 }}
          title="Remove from queue"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

export default function QueuePanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const player = usePlayer();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // We need unique IDs for dnd-kit. Using index inside the sortableId.
  const items = player.queue.map((t, i) => `${t.id}-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over?.id as string);
      
      const newQueue = arrayMove(player.queue, oldIndex, newIndex);
      
      // We also need to update player.queueIndex if it was affected
      let newQueueIndex = player.queueIndex;
      if (oldIndex === player.queueIndex) {
        newQueueIndex = newIndex;
      } else if (oldIndex < player.queueIndex && newIndex >= player.queueIndex) {
        newQueueIndex--;
      } else if (oldIndex > player.queueIndex && newIndex <= player.queueIndex) {
        newQueueIndex++;
      }
      
      player.reorderQueue(newQueue, newQueueIndex);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 32, // below titlebar typically, or adjust as needed
      bottom: 80, // above now playing bar
      right: 0,
      width: 400,
      backgroundColor: "var(--bg-lighter)",
      borderLeft: "1px solid var(--border)",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.2)",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      transform: "translateX(0)",
      transition: "transform 0.3s ease"
    }}>
      <div style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, margin: 0, fontWeight: "bold" }}>Playing Queue</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {player.queue.map((track, i) => (
                  <SortableQueueRow 
                    key={items[i]} 
                    sortableId={items[i]}
                    track={track} 
                    index={i} 
                    isPlaying={i === player.queueIndex}
                    onPlay={() => player.playTrack(track, undefined, i)}
                    onRemove={() => player.removeFromQueue(i)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
        
        {player.queue.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            Queue is empty
          </div>
        )}
      </div>
    </div>
  );
}
