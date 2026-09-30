'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAvailableMonths } from '@/hooks/use-drought-data'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface MonthSelectorProps {
  value?: string
  onChange: (month: string) => void
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const { data: months, isLoading } = useAvailableMonths()

  if (isLoading) {
    return <Skeleton className="h-9 w-[140px]" />
  }

  // When no data is available, show a subtle badge instead of a disabled dropdown
  if (!months || months.length === 0) {
    return (
      <Badge variant="secondary" className="text-xs">
        Upload data to begin
      </Badge>
    )
  }

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  return (
    <Select value={value || months[0]} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {months.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
