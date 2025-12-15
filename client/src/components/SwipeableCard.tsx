import { useState, useRef, useCallback } from "react";
import { Heart, Trash2, Share2, MoreHorizontal } from "lucide-react";

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onFavorite?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isFavorite?: boolean;
  className?: string;
}

export function SwipeableCard({
  children,
  onFavorite,
  onExport,
  onDelete,
  isFavorite = false,
  className = "",
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 180;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const clampedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setSwipeOffset(clampedDiff);
    
    if (clampedDiff < -SWIPE_THRESHOLD) {
      setIsSwipingLeft(true);
      setIsSwipingRight(false);
    } else if (clampedDiff > SWIPE_THRESHOLD) {
      setIsSwipingRight(true);
      setIsSwipingLeft(false);
    } else {
      setIsSwipingLeft(false);
      setIsSwipingRight(false);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    
    if (swipeOffset < -SWIPE_THRESHOLD) {
      // Swiped left - show right actions (delete, export)
      setSwipeOffset(-MAX_SWIPE);
      setShowActions(true);
    } else if (swipeOffset > SWIPE_THRESHOLD) {
      // Swiped right - show left action (favorite)
      setSwipeOffset(MAX_SWIPE);
      setShowActions(true);
    } else {
      // Reset
      setSwipeOffset(0);
      setShowActions(false);
    }
    
    setIsSwipingLeft(false);
    setIsSwipingRight(false);
  }, [swipeOffset]);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setShowActions(false);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    resetSwipe();
  }, [resetSwipe]);

  // Left actions (shown when swiping right) - Favorite
  const leftActions: SwipeAction[] = [
    {
      icon: <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />,
      color: "text-white",
      bgColor: "bg-amber-500",
      label: isFavorite ? "Unfavorite" : "Favorite",
      onClick: () => onFavorite && handleAction(onFavorite),
    },
  ];

  // Right actions (shown when swiping left) - Export, Delete
  const rightActions: SwipeAction[] = [
    {
      icon: <Share2 className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-blue-500",
      label: "Export",
      onClick: () => onExport && handleAction(onExport),
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-red-500",
      label: "Delete",
      onClick: () => onDelete && handleAction(onDelete),
    },
  ];

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Left actions background (favorite) */}
      <div 
        className="absolute inset-y-0 left-0 flex items-center justify-start"
        style={{ width: MAX_SWIPE }}
      >
        {leftActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center h-full px-6 ${action.bgColor} ${action.color} transition-opacity`}
            style={{ 
              opacity: swipeOffset > SWIPE_THRESHOLD ? 1 : 0.5,
              width: MAX_SWIPE / leftActions.length,
            }}
          >
            {action.icon}
            <span className="text-xs mt-1 font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Right actions background (export, delete) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end"
        style={{ width: MAX_SWIPE }}
      >
        {rightActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center h-full px-6 ${action.bgColor} ${action.color} transition-opacity`}
            style={{ 
              opacity: swipeOffset < -SWIPE_THRESHOLD ? 1 : 0.5,
              width: MAX_SWIPE / rightActions.length,
            }}
          >
            {action.icon}
            <span className="text-xs mt-1 font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main card content */}
      <div
        ref={cardRef}
        className="relative bg-white dark:bg-gray-800 transition-transform duration-200 ease-out touch-pan-y"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging.current ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (showActions) {
            resetSwipe();
          }
        }}
      >
        {children}
      </div>

      {/* Swipe hint indicator */}
      {!showActions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// Context menu for non-touch devices
interface ContextMenuProps {
  onFavorite?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isFavorite?: boolean;
  children: React.ReactNode;
}

export function ContextMenuWrapper({
  onFavorite,
  onExport,
  onDelete,
  isFavorite = false,
  children,
}: ContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleClickOutside = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    action();
    setShowMenu(false);
  }, []);

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClickOutside}
          />
          
          {/* Context menu */}
          <div
            ref={menuRef}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
            }}
          >
            {onFavorite && (
              <button
                onClick={() => handleAction(onFavorite)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-amber-500 text-amber-500" : "text-gray-500"}`} />
                <span className="text-sm">{isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
              </button>
            )}
            
            {onExport && (
              <button
                onClick={() => handleAction(onExport)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Export</span>
              </button>
            )}
            
            {onDelete && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => handleAction(onDelete)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
