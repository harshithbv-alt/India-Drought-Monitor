'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearchDistricts } from '@/hooks/use-drought-data'

interface DistrictSearchProps {
  onSelect: (district: string) => void
  selectedDistrict?: string | null
}

export function DistrictSearch({ onSelect, selectedDistrict }: DistrictSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: suggestions, isLoading } = useSearchDistricts(searchTerm)

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          placeholder="Search for a district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        {selectedDistrict && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSelect('')
              setSearchTerm('')
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {searchTerm.length >= 2 && suggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
          {suggestions.map((district) => (
            <button
              key={district}
              onClick={() => {
                onSelect(district)
                setSearchTerm(district)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            >
              {district}
            </button>
          ))}
        </div>
      )}

      {searchTerm.length >= 2 && isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {searchTerm.length >= 2 && !isLoading && suggestions?.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
          <span className="text-sm text-muted-foreground">No districts found</span>
        </div>
      )}
    </div>
  )
}
