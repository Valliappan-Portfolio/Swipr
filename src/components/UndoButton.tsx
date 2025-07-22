import React from 'react';
import { RotateCcw } from 'lucide-react';
import { smartRecommendationEngine } from '../lib/smartRecommendations';

interface UndoButtonProps {
  onUndo: () => void;
  disabled?: boolean;
}

export function UndoButton({ onUndo, disabled }: UndoButtonProps) {
  const handleUndo = () => {
    const lastSwipe = smartRecommendationEngine.getLastSwipe();
    if (lastSwipe) {
      onUndo();
    }
  };

  const lastSwipe = smartRecommendationEngine.getLastSwipe();

  if (!lastSwipe) return null;

  return (
    <button
      onClick={handleUndo}
      disabled={disabled}
      className={`fixed bottom-24 left-4 p-3 rounded-full shadow-lg transition-all duration-200 z-40 ${
        disabled
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110'
      }`}
      title={`Undo ${lastSwipe.action} on previous movie`}
    >
      <RotateCcw className="h-5 w-5" />
    </button>
  );
}