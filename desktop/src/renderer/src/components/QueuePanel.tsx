/**
 * QueuePanel — slide-in right panel showing the playback queue.
 * Drag-to-reorder via @dnd-kit/sortable, remove per entry.
 */

import React, { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Music, X } from "lucide-react";

import { usePlayer, type QueueTrack } from "@renderer/context/PlayerContext";

// ── Sortable row ──────────────────────────────────────────────────────────────

function QueueItem({
  track,
  index,
  isCurrent,
  onRemove,
}: {
  track: QueueTrack;
  index: number;
  isCurrent: boolean;
  onRemove: () => void;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id + "_" + index });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`queue-item${isCurrent ? " queue-item--current" : ""}`}
    >
      <button
        className="queue-item-grip"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical size={13} />
      </button>

      <div className="queue-item-cover">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt="" />
        ) : (
          <Music size={12} />
        )}
      </div>

      <div className="queue-item-info">
        <span className="queue-item-title">{track.title}</span>
        <span className="queue-item-artist">{track.artistName}</span>
      </div>

      <button
        className="queue-item-remove"
        onClick={onRemove}
        aria-label="Remove from queue"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function QueuePanel(): React.JSX.Element {
  const { queue, currentIndex, queueOpen, removeFromQueue, reorderQueue, toggleQueuePanel } =
    usePlayer();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Items have ids like "trackId_index"
      const oldIdx = queue.findIndex(
        (_, i) => queue[i].id + "_" + i === active.id,
      );
      const newIdx = queue.findIndex(
        (_, i) => queue[i].id + "_" + i === over.id,
      );

      if (oldIdx !== -1 && newIdx !== -1) {
        const newQueue = arrayMove(queue, oldIdx, newIdx);
        reorderQueue(newQueue);
      }
    },
    [queue, reorderQueue],
  );

  if (!queueOpen) return <></>;

  const upcoming = queue.slice(currentIndex + 1);
  const played = queue.slice(0, currentIndex);

  return (
    <>
      {/* Backdrop */}
      <div className="queue-backdrop" onClick={toggleQueuePanel} />

      <div className="queue-panel" role="complementary" aria-label="Playback queue">
        <div className="queue-panel-header">
          <span className="queue-panel-title">Queue</span>
          <span className="queue-panel-count">
            {queue.length} track{queue.length !== 1 ? "s" : ""}
          </span>
          <button
            className="queue-panel-close"
            onClick={toggleQueuePanel}
            aria-label="Close queue"
          >
            <X size={15} />
          </button>
        </div>

        <div className="queue-panel-body">
          {queue.length === 0 ? (
            <div className="queue-empty">
              <Music size={32} />
              <span>Queue is empty</span>
            </div>
          ) : (
            <>
              {/* Now playing */}
              {currentIndex >= 0 && queue[currentIndex] && (
                <div className="queue-section-label">Now playing</div>
              )}
              {currentIndex >= 0 && queue[currentIndex] && (
                <QueueItem
                  track={queue[currentIndex]}
                  index={currentIndex}
                  isCurrent
                  onRemove={() => removeFromQueue(currentIndex)}
                />
              )}

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <>
                  <div className="queue-section-label">Next up</div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={upcoming.map((t, i) => t.id + "_" + (currentIndex + 1 + i))}
                      strategy={verticalListSortingStrategy}
                    >
                      {upcoming.map((track, i) => {
                        const queueIdx = currentIndex + 1 + i;
                        return (
                          <QueueItem
                            key={track.id + "_" + queueIdx}
                            track={track}
                            index={queueIdx}
                            isCurrent={false}
                            onRemove={() => removeFromQueue(queueIdx)}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </>
              )}

              {/* Previously played */}
              {played.length > 0 && (
                <>
                  <div className="queue-section-label queue-section-label--muted">
                    History
                  </div>
                  {played.map((track, i) => (
                    <QueueItem
                      key={track.id + "_" + i}
                      track={track}
                      index={i}
                      isCurrent={false}
                      onRemove={() => removeFromQueue(i)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
