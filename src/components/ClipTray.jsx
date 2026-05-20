import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function formatDuration(ms) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function SortableClip({ clip, index, onNoteChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`clip-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="clip-header">
        <span className="clip-num">Clip {index + 1}</span>
        <button
          className="clip-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(clip.id) }}
          title="Delete clip"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>

      <div className="clip-thumb">
        {clip.thumbnail
          ? <img src={clip.thumbnail} alt={`Clip ${index + 1} preview`} draggable={false} />
          : <span className="clip-thumb-placeholder">🎬</span>
        }
        <span className="clip-duration">{formatDuration(clip.duration)}</span>
      </div>

      <textarea
        className="clip-note"
        placeholder="Add a note..."
        value={clip.note}
        onChange={(e) => onNoteChange(clip.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default function ClipTray({ clips, onNoteChange, onDelete, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }))

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = clips.findIndex(c => c.id === active.id)
    const newIndex = clips.findIndex(c => c.id === over.id)
    onReorder(arrayMove(clips, oldIndex, newIndex))
  }

  return (
    <div className="clip-tray">
      {clips.length === 0 ? (
        <div className="clip-tray-empty">
          Hit ⏺ to record your first clip — then come back and record more at any point in the video.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={clips.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {clips.map((clip, i) => (
              <SortableClip
                key={clip.id}
                clip={clip}
                index={i}
                onNoteChange={onNoteChange}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
