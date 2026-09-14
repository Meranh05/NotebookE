"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface CheckboxListItem {
  id: string
  title: string
  description?: string
}

interface CheckboxListProps {
  items: CheckboxListItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function CheckboxList({
  items,
  selectedIds,
  onToggle,
  loading = false,
  emptyMessage = "No items found.",
  className
}: CheckboxListProps) {
  if (loading) {
    return (
      <div className={cn('border-2 border-border rounded-2xl p-4 bg-card', className)}>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 bg-muted rounded-md" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-lg w-3/4 mb-1.5" />
                <div className="h-3 bg-muted rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={cn('border-2 border-border rounded-2xl p-4 bg-card', className)}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      
      </div>
    )
  }

  return (
    <div className={cn('border-2 border-border rounded-2xl bg-card overflow-hidden', className)}>
      <div className="max-h-48 overflow-y-auto p-3">
        <div className="space-y-1.5">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                htmlFor={`checkbox-${item.id}`}
                className={cn(
                  "flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-all border-2",
                  isSelected
                    ? "bg-primary/8 border-primary/30"
                    : "bg-transparent border-transparent hover:bg-muted/60 hover:border-border"
                )}
              >
                <Checkbox
                  id={`checkbox-${item.id}`}
                  name={`checkbox-${item.id}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggle(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-[13px] font-semibold block transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                    {item.title}
                  </span>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
