import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from './utils';

interface HybridSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  onNewItem?: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function HybridSelect({
  value,
  onValueChange,
  onNewItem,
  options,
  placeholder = "Select or type...",
  disabled = false,
  className = ""
}: HybridSelectProps) {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setIsCustomMode(false);
    setCustomValue('');
    setSearchValue('');
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      const trimmedValue = customValue.trim();
      onValueChange(trimmedValue);
      if (onNewItem) {
        onNewItem(trimmedValue);
      }
      setOpen(false);
      setIsCustomMode(false);
      setCustomValue('');
      setSearchValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customValue.trim()) {
      e.preventDefault();
      handleCustomSubmit();
    }
    if (e.key === 'Escape') {
      setIsCustomMode(false);
      setCustomValue('');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      e.preventDefault();
      // Check if search value matches an existing option
      const exactMatch = options.find(option => 
        option.toLowerCase() === searchValue.toLowerCase()
      );
      
      if (exactMatch) {
        handleSelect(exactMatch);
      } else {
        // Add as new item
        const trimmedValue = searchValue.trim();
        onValueChange(trimmedValue);
        if (onNewItem) {
          onNewItem(trimmedValue);
        }
        setOpen(false);
        setSearchValue('');
      }
    }
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  const exactMatch = options.find(option => 
    option.toLowerCase() === searchValue.toLowerCase()
  );

  const showAddNewOption = searchValue.trim() && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          {!isCustomMode ? (
            <>
              <CommandInput 
                placeholder="Search or type new item..." 
                value={searchValue}
                onValueChange={setSearchValue}
                onKeyDown={handleSearchKeyDown}
                className="h-9"
              />
              <CommandList>
                {filteredOptions.length === 0 && !showAddNewOption ? (
                  <CommandEmpty>
                    <div className="p-2 text-center">
                      <p className="text-sm text-muted-foreground mb-2">No items found.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCustomMode(true)}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add new item
                      </Button>
                    </div>
                  </CommandEmpty>
                ) : (
                  <>
                    {showAddNewOption && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            const trimmedValue = searchValue.trim();
                            onValueChange(trimmedValue);
                            if (onNewItem) {
                              onNewItem(trimmedValue);
                            }
                            setOpen(false);
                            setSearchValue('');
                          }}
                          className="text-blue-600"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add "{searchValue.trim()}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                    
                    <CommandGroup>
                      {filteredOptions.map((option) => (
                        <CommandItem
                          key={option}
                          onSelect={() => handleSelect(option)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === option ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    
                    {filteredOptions.length > 0 && (
                      <CommandGroup>
                        <CommandItem onSelect={() => setIsCustomMode(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add new item...
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <Input
                placeholder="Enter new item name..."
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-9"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customValue.trim()}
                  className="flex-1"
                >
                  Add Item
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCustomMode(false);
                    setCustomValue('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}