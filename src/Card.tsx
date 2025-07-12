import * as React from "react";
import { useRef } from "react";
import "./Card.css";

interface CardProps {
    value: number;
    id: string | number;
    isDraggable?: boolean;
    isPile?: boolean;
    pileType?: 'up' | 'down';
    style?: React.CSSProperties;
    [key: string]: any;
}

const Card: React.FC<CardProps> = ({ 
    value, 
    id, 
    isDraggable = false, 
    isPile = false,
    pileType,
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
        
        // Log which card is being dragged
        console.log(`Dragging card ${value}`);
    };
    
    // Handle drag end event
    const handleDragEnd = () => {
        // Remove the dragging class
        if (cardRef.current) {
            cardRef.current.classList.remove("dragging");
        }
    };
    // Determine card color based on pile type or default to blue for hand cards
    const getCardColor = () => {
        if (isPile) {
            return pileType === 'up' ? 'var(--card-color-1)' : 'var(--card-color-2)';
        }
        return 'var(--card-color-1)';
    };

    // Determine if the card is a special value (like deck count)
    const isSpecialCard = value > 100 || value < 1;

    return (
        <div 
            ref={cardRef}
            id={id.toString()} 
            className={`card ${isDraggable ? 'draggable' : ''} ${isPile ? 'pile' : ''}`}
            style={{
                backgroundColor: isSpecialCard ? 'var(--neutral-color)' : getCardColor(),
                cursor: isDraggable ? 'grab' : 'default',
                ...props.style
            }}
            data-card-value={value}
            data-card-type={isPile ? (pileType || 'none') : 'hand'}
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onDragEnd={isDraggable ? handleDragEnd : undefined}
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
