import { useState, useEffect, useRef, useCallback } from 'react'

type HistogramMode = 'MULTI' | 'SINGLE'

interface ImageHistogramProps {
  imageUrl: string
}

interface HistogramData {
  rVals: number[]
  gVals: number[]
  bVals: number[]
  multiChannelMax: number
  singleChannelMax: number
}

const initArray = (): number[] => {
  return new Array(256).fill(0)
}

export function ImageHistogram({ imageUrl }: ImageHistogramProps) {
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null)
  const [mode, setMode] = useState<HistogramMode>(() => {
    const saved = localStorage.getItem('imageHistogramChannels')
    return (saved === 'SINGLE' || saved === 'MULTI') ? saved : 'MULTI'
  })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const calculateHistogram = useCallback((img: HTMLImageElement) => {
    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw image to canvas
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // Initialize value arrays
    const rVals = initArray()
    const gVals = initArray()
    const bVals = initArray()

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    // Collect RGB values
    for (let i = 0; i < pixels.length / 4; i++) {
      const r = pixels[i * 4]
      const g = pixels[i * 4 + 1]
      const b = pixels[i * 4 + 2]
      rVals[r]++
      gVals[g]++
      bVals[b]++
    }

    // Calculate max values
    const rMax = Math.max(...rVals)
    const gMax = Math.max(...gVals)
    const bMax = Math.max(...bVals)
    const multiChannelMax = Math.max(rMax, gMax, bMax)

    const singleChannelMax = Math.max(
      ...rVals.map((val, index) => val + gVals[index] + bVals[index])
    )

    setHistogramData({
      rVals,
      gVals,
      bVals,
      multiChannelMax,
      singleChannelMax,
    })
  }, [])

  useEffect(() => {
    setHistogramData(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      calculateHistogram(img)
    }
    img.src = imageUrl
  }, [imageUrl, calculateHistogram])

  const toggleMode = () => {
    const newMode = mode === 'SINGLE' ? 'MULTI' : 'SINGLE'
    setMode(newMode)
    localStorage.setItem('imageHistogramChannels', newMode)
  }

  return (
    <div
      onClick={toggleMode}
      className="relative w-full h-[150px] cursor-pointer border border-neutral-500 bg-[#1b1b1b]"
      style={{
        backgroundImage: `
          repeating-linear-gradient(rgba(255, 255, 255, 0.05) 0 1px, transparent 2px 100%),
          repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 2px 100%)
        `,
        backgroundSize: '25% 25%',
        backgroundPosition: 'bottom right',
      }}
    >
      {histogramData && (
        <>
          {mode === 'MULTI' ? (
            <>
              {/* Red channel */}
              <div className="absolute inset-0 flex items-end justify-between mix-blend-difference">
                {histogramData.rVals.map((val, index) => (
                  <span
                    key={index}
                    className="flex-1 w-px"
                    style={{
                      height: `${(100 / histogramData.multiChannelMax) * val}%`,
                      backgroundColor: '#f00',
                    }}
                  />
                ))}
              </div>
              {/* Green channel */}
              <div className="absolute inset-0 flex items-end justify-between mix-blend-difference">
                {histogramData.gVals.map((val, index) => (
                  <span
                    key={index}
                    className="flex-1 w-px"
                    style={{
                      height: `${(100 / histogramData.multiChannelMax) * val}%`,
                      backgroundColor: '#0f0',
                    }}
                  />
                ))}
              </div>
              {/* Blue channel */}
              <div className="absolute inset-0 flex items-end justify-between mix-blend-difference">
                {histogramData.bVals.map((val, index) => (
                  <span
                    key={index}
                    className="flex-1 w-px"
                    style={{
                      height: `${(100 / histogramData.multiChannelMax) * val}%`,
                      backgroundColor: '#00f',
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            /* Single channel (combined) */
            <div className="absolute inset-0 flex items-end justify-between mix-blend-difference">
              {histogramData.rVals.map((val, index) => {
                const totalVal =
                  val + histogramData.gVals[index] + histogramData.bVals[index]
                return (
                  <span
                    key={index}
                    className="flex-1 w-px bg-white"
                    style={{
                      height: `${(100 / histogramData.singleChannelMax) * totalVal}%`,
                    }}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
