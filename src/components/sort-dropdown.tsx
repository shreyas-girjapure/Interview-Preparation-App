"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SortOption = {
  label: string;
  value: string;
};

interface SortDropdownProps {
  options: SortOption[];
  defaultSort: string;
}

export function SortDropdown({ options, defaultSort }: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Read current sort from URL, fallback to provided default
  const currentSort = searchParams.get("sort") || defaultSort;

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultSort) {
        // Remove param if it's the default to keep URLs clean
        params.delete("sort");
      } else {
        params.set("sort", value);
      }

      // Keep page reset logic: reset pagination to page 1
      params.delete("page");

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      setOpen(false);
    },
    [pathname, router, searchParams, defaultSort],
  );

  const activeLabel =
    options.find((o) => o.value === currentSort)?.label ||
    options.find((o) => o.value === defaultSort)?.label ||
    "Sort";

  return (
    <div className="flex items-center gap-2 text-sm justify-end">
      <span className="text-muted-foreground hidden sm:inline-block">
        Sorted by
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="font-medium flex items-center gap-1 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm">
          {activeLabel}
          <ChevronDown className="size-3" />
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors",
                currentSort === opt.value
                  ? "bg-accent font-medium text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground",
              )}
            >
              {opt.label}
              {currentSort === opt.value && <Check className="size-4" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
