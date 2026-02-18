"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MultiComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
};

type MultiComboboxProps = {
  values: string[];
  options: MultiComboboxOption[];
  onValuesChange: (nextValues: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  selectedSummaryLabel?: string;
};

function matchesSearch(option: MultiComboboxOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const keywords = option.keywords?.join(" ").toLowerCase() ?? "";

  return (
    option.label.toLowerCase().includes(normalizedQuery) ||
    option.value.toLowerCase().includes(normalizedQuery) ||
    keywords.includes(normalizedQuery)
  );
}

function MultiCombobox({
  values,
  options,
  onValuesChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  selectedSummaryLabel = "selected",
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedByValue = useMemo(() => new Set(values), [values]);

  const selectedLabel = useMemo(() => {
    if (values.length === 0) {
      return placeholder;
    }

    if (values.length === 1) {
      const selectedOption = options.find(
        (option) => option.value === values[0],
      );
      return (
        selectedOption?.label ?? `${values.length} ${selectedSummaryLabel}`
      );
    }

    return `${values.length} ${selectedSummaryLabel}`;
  }, [options, placeholder, selectedSummaryLabel, values]);

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesSearch(option, query)),
    [options, query],
  );

  function closeAndReset() {
    setOpen(false);
    setQuery("");
  }

  function toggleValue(nextValue: string) {
    if (selectedByValue.has(nextValue)) {
      onValuesChange(values.filter((value) => value !== nextValue));
      return;
    }

    onValuesChange([...values, nextValue]);
  }

  function clearSelected() {
    onValuesChange([]);
  }

  function selectAllFiltered() {
    if (filteredOptions.length === 0) {
      return;
    }

    const nextValues = [...values];

    for (const option of filteredOptions) {
      if (!selectedByValue.has(option.value)) {
        nextValues.push(option.value);
      }
    }

    onValuesChange(nextValues);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between font-normal",
            values.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="border-b p-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center justify-between border-b px-2 py-1">
          <button
            type="button"
            onClick={selectAllFiltered}
            disabled={filteredOptions.length === 0}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelected}
            disabled={values.length === 0}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <ul className="max-h-64 overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "size-4",
                      selectedByValue.has(option.value)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="border-t p-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={closeAndReset}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { MultiComboboxOption };
export { MultiCombobox };
