import * as React from "react";
import { useRef } from "react";
import "./Card.css";

interface CardProps {
    value: number;
    id: string | number;
    isDraggable?: boolean;
    isPile?: boolean;
    pileType?: 'up' | 'down';
    isPlayable?: boolean;
    isSelectable?: boolean;
    isSelected?: boolean;
    onDragStartCard?: (value: number) => void;
    onDragEndCard?: (value: number) => void;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    style?: React.CSSProperties;
    [key: string]: any;
}

const Card: React.FC<CardProps> = ({ 
    value, 
    id, 
    isDraggable = false, 
    isPile = false,
    pileType,
    isPlayable = false,
    isSelectable = false,
    isSelected = false,
    onDragStartCard,
    onDragEndCard,
    onClick,
    onKeyDown,
    ...props 
}) => {
    // Create a ref to the card element
    const cardRef = useRef<HTMLDivElement>(null);
    
    // Handle drag start event
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        // Set the drag data
        e.dataTransfer.setData("text/plain", value.toString());
        
        // Set the drag image to be the card itself
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, rect.height / 2);
        }
        
        // Add a class to the card to indicate it's being dragged
        if (cardRef.current) {
            cardRef.current.classList.add("dragging");
        }

        onDragStartCard?.(value);
    };
    
    // Handle drag end event
    const handleDragEnd = () => {
        // Remove the dragging class
        if (cardRef.current) {
            cardRef.current.classList.remove("dragging");
        }
        onDragEndCard?.(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }

        onKeyDown?.(e);
    };

    // Determine if the card is a special value (like deck count)
    const isSpecialCard = value > 100 || value < 1 || id === 'deck';
    const isInteractive = Boolean(onClick);
    const className = [
        'card',
        isDraggable ? 'draggable' : '',
        isPlayable ? 'playable-card' : '',
        isSelectable ? 'selectable-card' : '',
        isSelected ? 'selected-card' : '',
        isPile ? 'pile' : '',
        pileType ? `pile-${pileType}` : '',
        isSpecialCard ? 'special-card' : ''
    ].filter(Boolean).join(' ');

    return (
        <div 
            ref={cardRef}
            id={id.toString()} 
            className={className}
            style={{
                ...props.style
            }}
            data-card-value={value}
            data-card-type={isPile ? (pileType || 'none') : 'hand'}
            draggable={isDraggable}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-pressed={isInteractive ? isSelected : undefined}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onDragEnd={isDraggable ? handleDragEnd : undefined}
            onClick={onClick}
            onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
            {...props}
        >
            <div className="card-corners">
                <span className="card-corner top-left">{value}</span>
                <span className="card-corner bottom-right">{value}</span>
            </div>
            <div className="card-center">
                <span className="card-value">{value}</span>
            </div>
            {isPile && (
                <div className="pile-indicator">
                    {pileType === 'up' ? '↑' : '↓'}
                </div>
            )}
            {isDraggable && (
                <div className="drag-indicator">
                    <span>⇆</span>
                </div>
            )}
        </div>
    );
};

export default Card;
