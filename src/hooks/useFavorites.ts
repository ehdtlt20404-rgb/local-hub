'use client'
import { useState, useEffect } from 'react'

export interface FavoritePlace {
  id: string
  name: string
  lat: number
  lng: number
  sido: string
}

const KEY = 'dongnehub_favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePlace[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setFavorites(JSON.parse(saved))
    } catch {}
  }, [])

  function save(list: FavoritePlace[]) {
    setFavorites(list)
    localStorage.setItem(KEY, JSON.stringify(list))
  }

  function add(place: Omit<FavoritePlace, 'id'>) {
    const id = `${place.lat.toFixed(4)}_${place.lng.toFixed(4)}`
    const next = [{ ...place, id }, ...favorites.filter(f => f.id !== id)].slice(0, 10)
    save(next)
  }

  function remove(id: string) {
    save(favorites.filter(f => f.id !== id))
  }

  function isSaved(lat: number, lng: number) {
    const id = `${lat.toFixed(4)}_${lng.toFixed(4)}`
    return favorites.some(f => f.id === id)
  }

  return { favorites, add, remove, isSaved }
}
