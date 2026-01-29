import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import {
  getCachedDimensions,
  markImageLoaded,
  getPhotoThumbnailUrl,
} from '../../lib/photos/image-cache-store'

interface PhotoViewerProps {
  photoId: string
  rotation: number
  isCurrent: boolean
  onClick?: () => void
  onZoomChange?: (isZoomed: boolean) => void
}

const SPINNER_DELAY_MS = 100
const TILE_SIZE = 256
// Switch to tiles when zoom exceeds this threshold (where 4K thumbnail gets pixelated)
const TILE_ZOOM_THRESHOLD = 2

// ImageOverlay as a semi-transparent reference layer
// Used to verify that tiles align correctly
function PhotoImageLayer({ photoId, bounds, opacity = 1 }: {
  photoId: string
  bounds: L.LatLngBounds
  opacity?: number
}) {
  const map = useMap()

  useEffect(() => {
    // Use the 3840x3840 thumbnail for good quality at all zoom levels
    const imageUrl = `/thumbnailer/photo/3840x3840_contain_q75/${photoId}/`

    const imageOverlay = L.imageOverlay(imageUrl, bounds, { opacity })
    imageOverlay.addTo(map)

    return () => {
      map.removeLayer(imageOverlay)
    }
  }, [map, photoId, bounds, opacity])

  return null
}

// Custom TileLayer that handles Y coordinate transformation for CRS.Simple
// CRS.Simple has Y increasing upward, but our backend expects Y=0 at top
const PhotoTileLayerClass = L.TileLayer.extend({
  getTileUrl: function(coords: L.Coords) {
    const z = coords.z
    const x = coords.x
    const numTiles = Math.pow(2, z)
    // CRS.Simple Y is negative when viewport is in the positive Y coordinate space
    // (because Leaflet's tile origin is at pixel 0,0 which maps to Y=0 in CRS.Simple,
    // but our image is placed at Y=0 to Y=256 which is "above" the tile origin)
    // Transform: url_y = numTiles + internal_y
    // Example at zoom 2 (4 tiles): internal_y=-4 → url_y=0, internal_y=-1 → url_y=3
    const y = numTiles + coords.y

    return `/thumbnailer/tile/${(this.options as { photoId: string }).photoId}/${z}/${x}/${y}.jpg`
  }
})

// Tile layer for high-resolution deep zoom
// Uses a NORMALIZED coordinate system where largest dimension = TILE_SIZE (256)
// This ensures all images appear the same size initially, regardless of pixel dimensions
function PhotoTileLayer({ photoId, bounds }: {
  photoId: string
  bounds: L.LatLngBounds
}) {
  const map = useMap()

  useEffect(() => {
    // Custom tile layer with Y transformation for CRS.Simple
    const tileLayer = new (PhotoTileLayerClass as new (url: string, options?: L.TileLayerOptions & { photoId: string }) => L.TileLayer)(
      '', // URL template not used - we override getTileUrl
      {
        tileSize: TILE_SIZE,
        minZoom: 0,
        maxZoom: 5,
        noWrap: true,
        bounds: bounds,
        photoId: photoId,
      } as L.TileLayerOptions & { photoId: string }
    )

    tileLayer.addTo(map)

    return () => {
      map.removeLayer(tileLayer)
    }
  }, [map, photoId, bounds])

  return null
}

// Component to handle map events and sync zoom state
function MapEventHandler({
  onZoomChange,
  onClick,
  minZoom,
}: {
  onZoomChange?: (isZoomed: boolean) => void
  onClick?: () => void
  minZoom: number
}) {
  const map = useMap()
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useMapEvents({
    zoomend: () => {
      const currentZoom = map.getZoom()
      onZoomChange?.(currentZoom > minZoom)
    },
    click: () => {
      // Delay click to distinguish from double-click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
        return
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        onClick?.()
      }, 250)
    },
    dblclick: () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
    },
  })

  return null
}

// Component to reset view when photo changes or becomes non-current
function ViewResetter({
  isCurrent,
  bounds,
  minZoom,
}: {
  isCurrent: boolean
  bounds: L.LatLngBounds
  minZoom: number
}) {
  const map = useMap()
  const prevIsCurrent = useRef(isCurrent)

  useEffect(() => {
    // Reset view when becoming non-current
    if (prevIsCurrent.current && !isCurrent) {
      map.fitBounds(bounds, { animate: false })
      map.setZoom(minZoom, { animate: false })
    }
    prevIsCurrent.current = isCurrent
  }, [isCurrent, map, bounds, minZoom])

  return null
}

// Image-based viewer for initial view (uses 4K thumbnail)
function ImageViewer({
  photoId,
  rotation,
  isCurrent,
  onClick,
  onZoomChange,
  onNeedsTiles,
}: {
  photoId: string
  rotation: number
  isCurrent: boolean
  onClick?: () => void
  onZoomChange?: (isZoomed: boolean) => void
  onNeedsTiles: (dimensions: { width: number; height: number }, scale: number) => void
}) {
  const url = getPhotoThumbnailUrl(photoId)

  // Check module-level cache directly - no React state, just a simple Map lookup
  // This is checked on EVERY render, including initial mount
  const cachedDimensions = getCachedDimensions(url)
  const isCached = !!cachedDimensions

  // Use lazy initializers to check cache at mount time
  // This ensures new component instances start with correct state
  const [showSpinner, setShowSpinner] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(
    () => getCachedDimensions(url) || null
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPhotoIdRef = useRef<string>(photoId)

  // Track if image has loaded (either from cache or fresh load)
  // Use lazy initializer to check cache at component mount
  const [imageReady, setImageReady] = useState(() => !!getCachedDimensions(url))

  // When photoId changes (same component, different photo), reset state
  if (prevPhotoIdRef.current !== photoId) {
    prevPhotoIdRef.current = photoId

    // Reset zoom/position
    if (scale !== 1) setScale(1)
    if (position.x !== 0 || position.y !== 0) setPosition({ x: 0, y: 0 })

    // Update imageReady based on new cache status
    if (isCached !== imageReady) {
      setImageReady(isCached)
    }

    // Update dimensions from cache
    if (cachedDimensions && naturalDimensions !== cachedDimensions) {
      setNaturalDimensions(cachedDimensions)
    }

    // Clear spinner
    if (showSpinner) setShowSpinner(false)
  }

  // Handle spinner timeout for non-cached images
  useEffect(() => {
    // Clear any existing timeout
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current)
      spinnerTimeoutRef.current = null
    }

    // Only show spinner if not cached and not ready
    if (!isCached && !imageReady) {
      spinnerTimeoutRef.current = setTimeout(() => {
        setShowSpinner(true)
      }, SPINNER_DELAY_MS)
    }

    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current)
      }
    }
  }, [photoId, isCached, imageReady])

  // Reset zoom when this photo is no longer current
  useEffect(() => {
    if (!isCurrent && scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [isCurrent, scale])

  // Notify parent when zoom state changes
  useEffect(() => {
    onZoomChange?.(scale > 1)
  }, [scale, onZoomChange])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current)
      spinnerTimeoutRef.current = null
    }

    const img = e.currentTarget
    const dimensions = { width: img.naturalWidth, height: img.naturalHeight }

    // Add to module-level cache
    markImageLoaded(url, dimensions)

    setNaturalDimensions(dimensions)
    setShowSpinner(false)
    setImageReady(true)
  }, [url, photoId, isCurrent])

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(scale * delta, 1), 10)

      // Switch to tiles when zooming beyond threshold
      if (newScale > TILE_ZOOM_THRESHOLD && naturalDimensions) {
        onNeedsTiles(naturalDimensions, newScale)
        return
      }

      if (newScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
      setScale(newScale)
    },
    [scale, onNeedsTiles, naturalDimensions]
  )

  // Double-click to zoom/reset
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      // If zooming to 3x, switch to tiles
      if (3 > TILE_ZOOM_THRESHOLD && naturalDimensions) {
        onNeedsTiles(naturalDimensions, 3)
      } else {
        setScale(3)
      }
    }
  }, [scale, onNeedsTiles, naturalDimensions])

  // Single click (with delay to distinguish from double-click)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      return // Double-click detected
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      onClick?.()
    }, 250)
  }, [onClick])

  // Mouse drag for panning when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true)
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          posX: position.x,
          posY: position.y,
        }
      }
    },
    [scale, position]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setPosition({
        x: dragStart.current.posX + dx,
        y: dragStart.current.posY + dy,
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handling for pinch-zoom
  const touchesRef = useRef<React.Touch[]>([])
  const initialDistanceRef = useRef(0)
  const initialScaleRef = useRef(1)

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        touchesRef.current = Array.from(e.touches) as unknown as React.Touch[]
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1])
        initialScaleRef.current = scale
      } else if (e.touches.length === 1 && scale > 1) {
        setIsDragging(true)
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          posX: position.x,
          posY: position.y,
        }
      }
    },
    [scale, position]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const currentDistance = getDistance(e.touches[0], e.touches[1])
        const scaleChange = currentDistance / initialDistanceRef.current
        const newScale = Math.min(
          Math.max(initialScaleRef.current * scaleChange, 1),
          10
        )

        // Switch to tiles when zooming beyond threshold
        if (newScale > TILE_ZOOM_THRESHOLD && naturalDimensions) {
          onNeedsTiles(naturalDimensions, newScale)
          return
        }

        setScale(newScale)
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 })
        }
      } else if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStart.current.x
        const dy = e.touches[0].clientY - dragStart.current.y
        setPosition({
          x: dragStart.current.posX + dx,
          y: dragStart.current.posY + dy,
        })
      }
    },
    [isDragging, onNeedsTiles, naturalDimensions]
  )

  const handleTouchEnd = useCallback(() => {
    touchesRef.current = []
    setIsDragging(false)
  }, [])

  // Calculate image style based on rotation
  const isRotated90or270 = rotation === 90 || rotation === 270

  // For cached images: no opacity manipulation at all - let browser show it naturally
  // For non-cached images: start hidden, fade in when imageReady becomes true
  const imageStyle: React.CSSProperties = {
    maxWidth: isRotated90or270 ? '100vh' : '100vw',
    maxHeight: isRotated90or270 ? '100vw' : '100vh',
    transform: `rotate(${rotation}deg)`,
    // Only use opacity trick for non-cached images
    ...(isCached ? {} : {
      opacity: imageReady ? 1 : 0,
      transition: 'opacity 250ms ease-in',
    }),
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      data-testid="photo-viewer"
    >
      <div
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 150ms ease-out',
        }}
      >
        <img
          src={url}
          alt=""
          onLoad={handleImageLoad}
          style={imageStyle}
          draggable={false}
        />
      </div>

      {/* Loading spinner - only show if NOT cached and NOT ready and spinner delay has passed */}
      {!isCached && !imageReady && showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
        </div>
      )}
    </div>
  )
}

// Leaflet-based viewer for deep zoom (uses tiles)
function TileViewer({
  photoId,
  rotation,
  isCurrent,
  imageWidth,
  imageHeight,
  initialScale = 1,
  onClick,
  onZoomChange,
  onBackToImage,
}: {
  photoId: string
  rotation: number
  isCurrent: boolean
  imageWidth: number
  imageHeight: number
  initialScale?: number
  onClick?: () => void
  onZoomChange?: (isZoomed: boolean) => void
  onBackToImage: () => void
}) {
  const mapRef = useRef<L.Map | null>(null)

  // NORMALIZED COORDINATE SYSTEM:
  //
  // Map the image to a square where largest dimension = TILE_SIZE (256 map units).
  // This ensures all images appear fitted to screen at start, regardless of pixel size.
  //
  // At zoom 0: one 256px tile covers 256 map units (the full normalized space)
  // At zoom 1: four tiles, each covering 128 map units
  //
  // CRS.Simple has Y increasing upward. We place our image at Y=0 to Y=256.
  // The custom PhotoTileLayer handles the Y transformation to map to backend coords.

  const minZoom = 0
  const maxZoom = 5

  // Calculate normalized dimensions (largest = TILE_SIZE)
  const maxDim = Math.max(imageWidth, imageHeight)
  const normScale = TILE_SIZE / maxDim
  const scaledWidth = imageWidth * normScale   // For landscape: 256
  const scaledHeight = imageHeight * normScale // For landscape: < 256

  // Center the image in the square coordinate space
  const paddingX = (TILE_SIZE - scaledWidth) / 2
  const paddingY = (TILE_SIZE - scaledHeight) / 2

  // Image bounds (where the actual image content is)
  // CRS.Simple: [[south, west], [north, east]] = [[minY, minX], [maxY, maxX]]
  // Y increases upward in CRS.Simple, so south=bottom, north=top
  const imageBounds = L.latLngBounds(
    [[paddingY, paddingX], [paddingY + scaledHeight, paddingX + scaledWidth]]
  )

  // Full tile space bounds (the entire square: 0 to TILE_SIZE)
  const tileBounds = L.latLngBounds([[0, 0], [TILE_SIZE, TILE_SIZE]])

  const center: [number, number] = [TILE_SIZE / 2, TILE_SIZE / 2]

  // Calculate initial zoom to match the scale from ImageViewer
  // In Leaflet, each zoom level doubles the scale, so zoom = log2(scale)
  // We clamp to valid zoom range
  const initialZoom = Math.min(maxZoom, Math.max(minZoom, Math.log2(initialScale)))

  // Handle rotation via CSS transform on container
  const containerStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    width: '100%',
    height: '100%',
  }

  // Handle zoom changes - switch back to image viewer if zoomed out
  const handleZoomChange = useCallback(
    (isZoomed: boolean) => {
      onZoomChange?.(isZoomed)
      if (!isZoomed) {
        // User zoomed all the way out, switch back to image viewer
        onBackToImage()
      }
    },
    [onZoomChange, onBackToImage]
  )

  // Store map reference and fit bounds
  const handleMapCreated = useCallback((map: L.Map) => {
    mapRef.current = map
    // Fit the image bounds in the view
    map.fitBounds(imageBounds)
  }, [imageBounds])

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden bg-[#1d1d1d]"
      data-testid="photo-viewer"
    >
      <div style={containerStyle}>
        <MapContainer
          center={center}
          zoom={initialZoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          crs={L.CRS.Simple}
          zoomControl={false}
          attributionControl={false}
          doubleClickZoom={true}
          scrollWheelZoom={true}
          dragging={true}
          maxBounds={tileBounds.pad(0.5)} // Add some padding for panning
          maxBoundsViscosity={0.8}
          style={{ width: '100%', height: '100%', background: '#1d1d1d' }}
          ref={(map) => {
            if (map) handleMapCreated(map)
          }}
        >
          {/* Base image layer - shows immediately as placeholder while tiles load */}
          <PhotoImageLayer photoId={photoId} bounds={imageBounds} opacity={0.25} />
          {/* Tile layer loads on top, progressively covering the base image */}
          <PhotoTileLayer photoId={photoId} bounds={tileBounds} />
          <MapEventHandler
            onZoomChange={handleZoomChange}
            onClick={onClick}
            minZoom={minZoom}
          />
          <ViewResetter
            isCurrent={isCurrent}
            bounds={imageBounds}
            minZoom={minZoom}
          />
        </MapContainer>
      </div>
    </div>
  )
}

export function PhotoViewer({ photoId, rotation, isCurrent, onClick, onZoomChange }: PhotoViewerProps) {
  const [useTiles, setUseTiles] = useState(false)
  // Store image dimensions from the loaded thumbnail
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  // Store the scale at which we transition to tiles (for smooth handoff)
  const [transitionScale, setTransitionScale] = useState(1)

  // Reset to image mode when photo changes
  useEffect(() => {
    setUseTiles(false)
    setImageDimensions(null)
    setTransitionScale(1)
  }, [photoId])

  // Reset to image mode when becoming non-current
  useEffect(() => {
    if (!isCurrent) {
      setUseTiles(false)
    }
  }, [isCurrent])

  const handleNeedsTiles = useCallback((dimensions: { width: number; height: number }, scale: number) => {
    setImageDimensions(dimensions)
    setTransitionScale(scale)
    setUseTiles(true)
  }, [])

  const handleBackToImage = useCallback(() => {
    setUseTiles(false)
  }, [])

  if (useTiles && imageDimensions) {
    return (
      <TileViewer
        photoId={photoId}
        rotation={rotation}
        isCurrent={isCurrent}
        imageWidth={imageDimensions.width}
        imageHeight={imageDimensions.height}
        initialScale={transitionScale}
        onClick={onClick}
        onZoomChange={onZoomChange}
        onBackToImage={handleBackToImage}
      />
    )
  }

  return (
    <ImageViewer
      photoId={photoId}
      rotation={rotation}
      isCurrent={isCurrent}
      onClick={onClick}
      onZoomChange={onZoomChange}
      onNeedsTiles={handleNeedsTiles}
    />
  )
}
