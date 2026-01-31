import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // 0 to 5
  count?: number;
  size?: number;
  showCount?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, count, size = 12, showCount = true }) => {
  return (
    <div className="flex items-center gap-1">
      <Star size={size} className={`${rating >= 1 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      <span className="font-bold text-gray-700 text-xs">{rating.toFixed(1)}</span>
      {showCount && count !== undefined && (
        <span className="text-gray-400 text-[10px]">({count})</span>
      )}
    </div>
  );
};
