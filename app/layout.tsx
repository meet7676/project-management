"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if dark mode is enabled in local storage
    const storedDarkMode = localStorage.getItem("darkMode")
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Set initial dark mode state based on local storage or system preference
    const initialDarkMode = storedDarkMode !== null ? storedDarkMode === "true" : prefersDarkMode

    setIsDarkMode(initialDarkMode)

    // Apply dark mode class if needed
    if (initialDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    setIsLoaded(true)
  }, [])

  // Only render content after checking dark mode preference
  if (!isLoaded) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}