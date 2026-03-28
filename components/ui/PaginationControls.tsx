import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface PaginationControlsProps {
  currentPage: number;
  pageSize: 25 | 50 | 100;
  total: number;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageSizeChange: (size: 25 | 50 | 100) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function PaginationControls(props: PaginationControlsProps): JSX.Element {
  const {
    currentPage,
    pageSize,
    total,
    hasNextPage,
    isLoading,
    onPageSizeChange,
    onNextPage,
    onPrevPage,
  } = props;

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);
  const canGoPrev = currentPage > 1;

  return (
    <div className="flex flex-col gap-4 items-start md:items-center md:justify-between md:flex-row">
      {/* Page size tabs */}
      <div className="flex gap-2">
        {[25, 50, 100].map((size) => (
          <Button
            key={size}
            variant={pageSize === size ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageSizeChange(size as 25 | 50 | 100)}
            disabled={isLoading}
            className={pageSize === size ? 'bg-blue-600 text-white' : ''}
          >
            {size}
          </Button>
        ))}
      </div>

      {/* Info text */}
      <div className="text-sm text-slate-600">
        {total === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            Showing {startItem}-{endItem} of {total}
          </span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoPrev || isLoading}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
