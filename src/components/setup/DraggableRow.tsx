import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableRowProps {
  id: number;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableRow: React.FC<DraggableRowProps> = ({ id, children, onClick, className, style }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const combinedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    ...style
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      onClick={onClick}
      className={className}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
