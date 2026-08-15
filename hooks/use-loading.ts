"use client"

import { useState, useEffect } from "react"

export function useLoadingState(initialDelay = 3000) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, initialDelay)

    return () => clearTimeout(timer)
  }, [initialDelay])

  const reload = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), initialDelay)
  }

  return { isLoading, reload }
}
