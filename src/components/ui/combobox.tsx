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

type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
};

type ComboboxProps = {
  value: string | null;
  options: ComboboxOption[];
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noneLabel?: string;
};

function matchesSearch(option: ComboboxOption, query: string) {
  const value = query.trim().toLowerCase();

  if (!value) {
    return true;
  }

  const keywords = option.keywords?.join(" ").toLowerCase() ?? "";
  return (
    option.label.toLowerCase().includes(value) ||
    option.value.toLowerCase().includes(value) ||
    keywords.includes(value)
  );
}

function Combobox({
  value,
  options,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  noneLabel = "No preference",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesSearch(option, query)),
    [options, query],
  );

  function closeAndReset() {
    setOpen(false);
    setQuery("");
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
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? placeholder}
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

        <ul className="max-h-60 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              onClick={() => {
                onValueChange(null);
                closeAndReset();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Check
                className={cn(
                  "size-4",
                  value === null ? "opacity-100" : "opacity-0",
                )}
              />
              <span>{noneLabel}</span>
            </button>
          </li>

          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    closeAndReset();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{option.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export type { ComboboxOption };
export { Combobox };
