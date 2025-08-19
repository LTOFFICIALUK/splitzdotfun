import React from 'react';

interface FilterPillsProps {
  filters: string[];
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

const FilterPills: React.FC<FilterPillsProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  className = '',
}) => {
  const handleFilterToggle = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      onFilterChange(selectedFilters.filter(f => f !== filter));
    } else {
      onFilterChange([...selectedFilters, filter]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFilters.length === filters.length) {
      onFilterChange([]);
    } else {
      onFilterChange(filters);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={handleSelectAll}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          selectedFilters.length === filters.length
            ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
            : 'bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30'
        }`}
      >
        {selectedFilters.length === filters.length ? 'Clear All' : 'Select All'}
      </button>
      
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => handleFilterToggle(filter)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedFilters.includes(filter)
              ? 'bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark'
              : 'bg-background-dark border border-background-elevated text-text-secondary hover:text-text-primary hover:border-primary-mint/30'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default FilterPills;
