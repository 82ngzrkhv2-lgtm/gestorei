'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

const PrivacyContext = createContext({
  isPrivate: false,
  togglePrivacy: () => {},
})

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('gestorei_privacy')
    if (stored === 'true') {
      setIsPrivate(true)
      document.body.classList.add('privacy-active')
    }
  }, [])

  const togglePrivacy = () => {
    setIsPrivate(prev => {
      const val = !prev
      localStorage.setItem('gestorei_privacy', String(val))
      if (val) {
        document.body.classList.add('privacy-active')
      } else {
        document.body.classList.remove('privacy-active')
      }
      return val
    })
  }

  // To prevent hydration mismatch, we don't render until mounted, or we just provide false initially
  // CSS will handle the blur/hide instantly since we add the class to body
  return (
    <PrivacyContext.Provider value={{ isPrivate: mounted ? isPrivate : false, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export const usePrivacy = () => useContext(PrivacyContext)
