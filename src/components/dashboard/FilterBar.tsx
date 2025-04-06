
import { useState } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (status: string) => void;
  clearAllFilters: () => void;
}

const FilterBar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  onStatusFilterChange,
  clearAllFilters
}: FilterBarProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files or recipients..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            {statusFilter.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {statusFilter.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={statusFilter.includes("pending")}
            onCheckedChange={() => onStatusFilterChange("pending")}
          >
            Pending
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilter.includes("sent")}
            onCheckedChange={() => onStatusFilterChange("sent")}
          >
            Sent
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilter.includes("failed")}
            onCheckedChange={() => onStatusFilterChange("failed")}
          >
            Failed
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm font-normal"
            onClick={clearAllFilters}
          >
            Clear all filters
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterBar;
