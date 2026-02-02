import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import {
  getCachedDimensions,
  markImageLoaded,
  getPhotoThumbnailUrl,
  type ThumbnailResolution,
} from '../../lib/photos/image-cache-store'
import { BoundingBoxes } from './BoundingBoxes'
import { useOptimalResolution } from './hooks/useOptimalResolution'
import type { PersonTag, ObjectTag } from '../../lib/photos/detail-types'

interface PhotoViewerProps {
  photoId: string
  rotation: number
  isCurrent: boolean
  onClick?: () => void
  onZoomChange?: (isZoomed: boolean) => void
  // Bounding box props
  personTags?: PersonTag[]
  objectTags?: ObjectTag[]
  showPeopleBoxes?: boolean
  showObjectBoxes?: boolean
  onRefetch?: () => void
}

const SPINNER_DELAY_MS = 100
const MIN_SCALE = 1
const MAX_SCALE = 16
// Opacity for TileViewer - set to 1 for production
const TILE_VIEWER_OPACITY = 1

// Shared view state for synchronizing ImageViewer and TileViewer
interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

// Tile coordinate
interface TileCoord {
  z: number
  x: number
  y: number
}

// Calculate which tiles are visible at current view state
// The backend uses a SQUARE tile grid where tiles cover [0, 256] x [0, 256] normalized space
// The image is scaled to fit within this square (largest dimension = 256)
function getVisibleTiles(
  viewState: ViewState,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  rotation: number
): TileCoord[] {
  const { scale } = viewState

  // For tiles, we use rotated dimensions (tiles are pre-rotated on backend)
  const isRotated90or270 = rotation === 90 || rotation === 270
  const tileImageWidth = isRotated90or270 ? imageHeight : imageWidth
  const tileImageHeight = isRotated90or270 ? imageWidth : imageHeight

  // Calculate fit scale (how the image fits the viewport at scale=1)
  const fitScale = Math.min(
    viewportWidth / tileImageWidth,
    viewportHeight / tileImageHeight
  )

  // The tile grid is SQUARE based on max dimension
  const maxDim = Math.max(tileImageWidth, tileImageHeight)

  // At zoom z, the square grid has 2^z tiles per side
  // Each tile is 256x256 pixels covering (maxDim / 2^z) image pixels
  // Display size of tile = (maxDim / 2^z) * fitScale * scale screen pixels
  // We want display size ≈ 256 (tile's natural size) for sharp rendering
  // So: (maxDim / 2^z) * fitScale * scale ≈ 256
  // => 2^z ≈ maxDim * fitScale * scale / 256
  // => z ≈ log2(maxDim * fitScale * scale / 256)
  const displayedGridSize = maxDim * fitScale * scale
  const z = Math.max(0, Math.min(5, Math.ceil(Math.log2(displayedGridSize / 256))))

  const numTiles = Math.pow(2, z)

  // Return ALL tiles at this zoom level (let the renderer filter what's visible)
  const tiles: TileCoord[] = []
  for (let x = 0; x < numTiles; x++) {
    for (let y = 0; y < numTiles; y++) {
      tiles.push({ z, x, y })
    }
  }

  return tiles
}

// Custom TileViewer that renders tiles with CSS transforms
function CustomTileViewer({
  photoId,
  rotation,
  viewState,
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  opacity = 1,
  onTilesReady,
  isGestureActive = false,
}: {
  photoId: string
  rotation: number
  viewState: ViewState
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
  opacity?: number
  onTilesReady?: (ready: boolean) => void
  isGestureActive?: boolean
}) {
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(new Set())
  // Debounced view state - only update after zoom/pan stops
  const [stableViewState, setStableViewState] = useState(viewState)
  // Stable zoom level - only load tiles at this zoom level (debounced)
  const [stableZoomLevel, setStableZoomLevel] = useState<number | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track current zoom level to cancel old tile requests
  const currentZoomLevelRef = useRef<number | null>(null)

  const { scale, offsetX, offsetY } = viewState

  // Debounce view state changes - wait 400ms after zoom stops before loading tiles
  // Don't load tiles at all while gesture is active (fingers on screen)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    // Don't start loading tiles while gesture is active
    if (isGestureActive) {
      return
    }
    debounceTimerRef.current = setTimeout(() => {
      // Calculate target zoom level for this view state
      const tiles = getVisibleTiles(viewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation)
      const targetZ = tiles.length > 0 ? tiles[0].z : null
      setStableZoomLevel(targetZ)
      setStableViewState(viewState)
    }, 400)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [viewState, isGestureActive, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation])

  // Tiles are pre-rotated on the backend, so they're already in the final orientation
  // But we need to match the ImageViewer's positioning exactly
  const isRotated90or270 = rotation === 90 || rotation === 270

  // Use ROTATED dimensions for tile coordinate calculations
  const tileImageWidth = isRotated90or270 ? imageHeight : imageWidth
  const tileImageHeight = isRotated90or270 ? imageWidth : imageHeight

  // Reset loaded tiles when photo changes
  useEffect(() => {
    setLoadedTiles(new Set())
  }, [photoId])

  // MUST match SyncedImageViewer VISUAL position exactly
  // ImageViewer uses original dimensions and CSS rotation
  // We need to calculate where the image VISUALLY appears after CSS rotation

  // Use layout dimensions (swapped if rotated) for fitScale, matching ImageViewer
  const layoutWidth = isRotated90or270 ? imageHeight : imageWidth
  const layoutHeight = isRotated90or270 ? imageWidth : imageHeight

  const fitScale = Math.min(
    viewportWidth / layoutWidth,
    viewportHeight / layoutHeight
  )

  // ImageViewer element size (before CSS rotation)
  const imgElemWidth = imageWidth * fitScale * scale
  const imgElemHeight = imageHeight * fitScale * scale

  // ImageViewer element position - element is centered, CSS rotation preserves center
  const imgElemLeft = (viewportWidth - imgElemWidth) / 2 + offsetX
  const imgElemTop = (viewportHeight - imgElemHeight) / 2 + offsetY

  // The element center = visual center (rotation preserves center)
  const imgCenterX = imgElemLeft + imgElemWidth / 2
  const imgCenterY = imgElemTop + imgElemHeight / 2

  // IMPORTANT: Backend uses a SQUARE tile grid based on max(width, height)
  // The image is centered within this square, with padding on shorter dimension
  const maxDim = Math.max(tileImageWidth, tileImageHeight)

  // The square grid size in screen pixels
  const squareGridSize = maxDim * fitScale * scale

  // Padding to center the image within the square grid
  const paddingX = (maxDim - tileImageWidth) / 2 * fitScale * scale
  const paddingY = (maxDim - tileImageHeight) / 2 * fitScale * scale

  // The image's visual dimensions (for positioning within the grid)
  const scaledWidth = tileImageWidth * fitScale * scale
  const scaledHeight = tileImageHeight * fitScale * scale

  // Position tiles so their center matches the ImageViewer's center
  const imageLeft = imgCenterX - scaledWidth / 2
  const imageTop = imgCenterY - scaledHeight / 2

  // The square grid starts at this position (accounting for padding)
  const gridLeft = imageLeft - paddingX
  const gridTop = imageTop - paddingY

  // Calculate what zoom level the user is currently viewing (from live viewState)
  // This determines whether loaded tiles should stay visible during gestures
  const currentTargetZoomLevel = useMemo(() => {
    const tiles = getVisibleTiles(viewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation)
    return tiles.length > 0 ? tiles[0].z : null
  }, [viewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation])

  // Track the zoom level of tiles we're actually displaying
  const displayedZoomLevelRef = useRef<number | null>(null)

  // Calculate tiles to RENDER (from current viewState, always calculated)
  // These are rendered at current positions so tiles follow pan/zoom
  // Sort by distance from viewport center so center tiles load first (browser loads in DOM order)
  const tilesToRender = useMemo(() => {
    const tiles = getVisibleTiles(viewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation)
    if (tiles.length === 0) return tiles

    const numTiles = Math.pow(2, tiles[0].z)
    const tileSize = squareGridSize / numTiles

    // Screen center
    const screenCenterX = viewportWidth / 2
    const screenCenterY = viewportHeight / 2

    // Sort tiles by distance from screen center so they load center-first
    return tiles
      .map(tile => {
        // Tile center position on screen
        const tileCenterX = gridLeft + tile.x * tileSize + tileSize / 2
        const tileCenterY = gridTop + tile.y * tileSize + tileSize / 2

        // Distance from screen center
        const distFromCenter = Math.sqrt(
          Math.pow(tileCenterX - screenCenterX, 2) +
          Math.pow(tileCenterY - screenCenterY, 2)
        )

        return { ...tile, distFromCenter }
      })
      .sort((a, b) => a.distFromCenter - b.distFromCenter)
  }, [viewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation, squareGridSize, gridLeft, gridTop])

  // Calculate tiles to LOAD (debounced, after gesture ends)
  // Sort tiles by distance from VIEWPORT CENTER (screen center), not image center
  const tilesToLoad = useMemo(() => {
    // Don't load NEW tiles while gesture is active
    if (isGestureActive) return []

    const tiles = getVisibleTiles(stableViewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation)
    if (tiles.length === 0) return tiles

    const numTiles = Math.pow(2, tiles[0].z)
    const tileSize = squareGridSize / numTiles

    // Screen center
    const screenCenterX = viewportWidth / 2
    const screenCenterY = viewportHeight / 2

    // Calculate screen position for each tile and sort by distance from screen center
    return tiles
      .map(tile => {
        // Tile center position on screen
        const tileCenterX = gridLeft + tile.x * tileSize + tileSize / 2
        const tileCenterY = gridTop + tile.y * tileSize + tileSize / 2

        // Distance from screen center
        const distFromCenter = Math.sqrt(
          Math.pow(tileCenterX - screenCenterX, 2) +
          Math.pow(tileCenterY - screenCenterY, 2)
        )

        return { ...tile, distFromCenter }
      })
      .sort((a, b) => a.distFromCenter - b.distFromCenter)
  }, [stableViewState, imageWidth, imageHeight, viewportWidth, viewportHeight, rotation, squareGridSize, gridLeft, gridTop, isGestureActive])

  // Calculate the zoom level we're loading tiles for
  const loadingZoomLevel = tilesToLoad.length > 0 ? tilesToLoad[0].z : null

  // Update displayed zoom level when we start loading new tiles
  if (loadingZoomLevel !== null) {
    displayedZoomLevelRef.current = loadingZoomLevel
    currentZoomLevelRef.current = loadingZoomLevel
  }

  // Determine if tiles should be visible:
  // - Show tiles if the current target zoom level matches the displayed tiles' zoom level
  // - This keeps tiles visible during pan and zoom within the same z level
  const shouldShowTiles = displayedZoomLevelRef.current !== null &&
    currentTargetZoomLevel === displayedZoomLevelRef.current

  // Clear loaded tiles when zoom level changes (new tiles needed)
  const prevZoomLevelRef = useRef<number | null>(null)
  useEffect(() => {
    if (loadingZoomLevel === null) return
    if (prevZoomLevelRef.current !== null && prevZoomLevelRef.current !== loadingZoomLevel) {
      // Zoom level changed - clear old tiles
      setLoadedTiles(new Set())
    }
    prevZoomLevelRef.current = loadingZoomLevel
  }, [loadingZoomLevel])

  const handleTileLoad = useCallback((key: string) => {
    // Only add tile if it matches current zoom level (ignore stale responses)
    const tileZ = parseInt(key.split('-')[0])
    if (currentZoomLevelRef.current !== null && tileZ !== currentZoomLevelRef.current) {
      return // Ignore tile from wrong zoom level
    }
    setLoadedTiles(prev => new Set(prev).add(key))
  }, [])

  // Notify parent when tiles become active (zoomed in enough to show tiles)
  useEffect(() => {
    // Tiles are ready (active) as soon as we're zoomed in enough to show them
    onTilesReady?.(scale >= 1.5)
  }, [scale, onTilesReady])

  // Only show tiles when zoomed in enough that they provide detail
  if (scale < 1.5) {
    return null
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity }}
    >
      {tilesToRender.map(({ z, x, y }) => {
        const numTiles = Math.pow(2, z)

        // Backend uses SQUARE tile grid - each tile is a square
        // The grid covers max(width, height) on each side
        const tileSize = squareGridSize / numTiles

        // Tile position within the square grid
        const tileLeft = gridLeft + x * tileSize
        const tileTop = gridTop + y * tileSize

        // Skip tiles that are completely outside the viewport
        if (tileLeft + tileSize < 0 || tileLeft > viewportWidth ||
            tileTop + tileSize < 0 || tileTop > viewportHeight) {
          return null
        }

        const key = `${z}-${x}-${y}-r${rotation}`

        // Only set src (triggering network request) when zoom level matches stable zoom level
        // This prevents loading tiles at intermediate zoom levels during zoom gestures
        const shouldLoad = stableZoomLevel === z
        const url = shouldLoad
          ? `/thumbnailer/tile/${photoId}/${z}/${x}/${y}.jpg?rotation=${rotation}&q=75`
          : undefined

        // Only show tile as loaded if:
        // 1. The tile matches the displayed zoom level (not a stale tile from different z)
        // 2. The current target zoom level matches the displayed zoom level (hide during z transitions)
        // This keeps tiles visible during pan and zoom within same z level
        const isCorrectZoomLevel = displayedZoomLevelRef.current === z
        const isLoaded = loadedTiles.has(key) && isCorrectZoomLevel && shouldShowTiles

        return (
          <img
            key={key}
            src={url}
            alt=""
            onLoad={() => handleTileLoad(key)}
            onError={() => {/* Tile doesn't exist, ignore */}}
            style={{
              position: 'absolute',
              left: tileLeft,
              top: tileTop,
              width: tileSize,
              height: tileSize,
              maxWidth: 'none',
              maxHeight: 'none',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 150ms ease-in',
            }}
            draggable={false}
          />
        )
      })}
    </div>
  )
}

// ImageViewer that syncs with the shared view state
function SyncedImageViewer({
  photoId,
  rotation,
  viewState,
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  onImageLoad,
  debugOpacity = 1,
  resolution = '1920',
}: {
  photoId: string
  rotation: number
  viewState: ViewState
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
  onImageLoad: (dimensions: { width: number; height: number }) => void
  debugOpacity?: number
  resolution?: ThumbnailResolution
}) {
  const url = getPhotoThumbnailUrl(photoId, resolution)
  const cachedDimensions = getCachedDimensions(url)
  const [showSpinner, setShowSpinner] = useState(false)
  const [imageReady, setImageReady] = useState(() => !!cachedDimensions)
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { scale, offsetX, offsetY } = viewState

  // Handle spinner timeout for non-cached images
  useEffect(() => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current)
      spinnerTimeoutRef.current = null
    }

    if (!cachedDimensions && !imageReady) {
      spinnerTimeoutRef.current = setTimeout(() => {
        setShowSpinner(true)
      }, SPINNER_DELAY_MS)
    }

    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current)
      }
    }
  }, [photoId, cachedDimensions, imageReady])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current)
      spinnerTimeoutRef.current = null
    }

    const img = e.currentTarget
    const dimensions = { width: img.naturalWidth, height: img.naturalHeight }

    markImageLoaded(url, dimensions)
    setShowSpinner(false)
    setImageReady(true)
    onImageLoad(dimensions)
  }, [url, onImageLoad])

  // Calculate display dimensions
  // The 4K thumbnail is NOT rotated, so we apply CSS rotation
  const isRotated90or270 = rotation === 90 || rotation === 270

  // Calculate scaled size - use the image dimensions we have
  const displayWidth = imageWidth || 1920
  const displayHeight = imageHeight || 1080

  // For rotated images, we need to swap dimensions for layout calculation
  const layoutWidth = isRotated90or270 ? displayHeight : displayWidth
  const layoutHeight = isRotated90or270 ? displayWidth : displayHeight

  // Calculate the base size to fit viewport
  const fitScale = Math.min(
    viewportWidth / layoutWidth,
    viewportHeight / layoutHeight
  )

  const baseWidth = displayWidth * fitScale
  const baseHeight = displayHeight * fitScale

  // Apply zoom scale
  const scaledWidth = baseWidth * scale
  const scaledHeight = baseHeight * scale

  // Calculate position: center the ELEMENT so after CSS rotation the visual center is at viewport center
  // CSS rotation preserves the center, so centering the element centers the visual result
  const left = (viewportWidth - scaledWidth) / 2 + offsetX
  const top = (viewportHeight - scaledHeight) / 2 + offsetY

  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: scaledWidth,
    height: scaledHeight,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    opacity: imageReady ? debugOpacity : 0,
    transition: cachedDimensions ? 'none' : 'opacity 250ms ease-in',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'none',
  }

  return (
    <>
      <img
        src={url}
        alt=""
        onLoad={handleImageLoad}
        style={imageStyle}
        draggable={false}
        data-testid="photo-viewer-image"
        data-resolution={resolution}
      />

      {/* Loading spinner */}
      {!cachedDimensions && !imageReady && showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
        </div>
      )}
    </>
  )
}

// GestureHandler - captures all touch/wheel/click events and updates view state
function GestureHandler({
  viewState,
  onViewStateChange,
  onClick,
  onDoubleClick,
  onGestureActiveChange,
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  rotation,
  children,
}: {
  viewState: ViewState
  onViewStateChange: (newState: ViewState) => void
  onClick?: () => void
  onDoubleClick?: () => void
  onGestureActiveChange?: (active: boolean) => void
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
  rotation: number
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // For rotated images, swap dimensions for boundary calculations
  const isRotated90or270 = rotation === 90 || rotation === 270
  const effectiveWidth = isRotated90or270 ? imageHeight : imageWidth
  const effectiveHeight = isRotated90or270 ? imageWidth : imageHeight

  // Pinch state
  const pinchStateRef = useRef<{
    initialDistance: number
    initialScale: number
    initialCenter: { x: number; y: number }
    initialOffset: { x: number; y: number }
  } | null>(null)

  // Pan state (single finger when zoomed, or mouse drag)
  const panStateRef = useRef<{
    startX: number
    startY: number
    initialOffset: { x: number; y: number }
  } | null>(null)

  // Mouse drag state
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)

  // Calculate constraints for panning
  const getConstrainedOffset = useCallback((offsetX: number, offsetY: number, scale: number) => {
    if (scale <= MIN_SCALE) {
      return { x: 0, y: 0 }
    }

    // Calculate how much the image extends beyond viewport when zoomed
    const fitScale = Math.min(
      viewportWidth / effectiveWidth,
      viewportHeight / effectiveHeight
    )
    const scaledWidth = effectiveWidth * fitScale * scale
    const scaledHeight = effectiveHeight * fitScale * scale

    const maxOffsetX = Math.max(0, (scaledWidth - viewportWidth) / 2)
    const maxOffsetY = Math.max(0, (scaledHeight - viewportHeight) / 2)

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY)),
    }
  }, [viewportWidth, viewportHeight, effectiveWidth, effectiveHeight])

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate zoom
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewState.scale * zoomFactor))

    // Zoom toward mouse position
    const scaleRatio = newScale / viewState.scale
    const centerX = viewportWidth / 2
    const centerY = viewportHeight / 2

    const newOffsetX = (viewState.offsetX - (mouseX - centerX)) * scaleRatio + (mouseX - centerX)
    const newOffsetY = (viewState.offsetY - (mouseY - centerY)) * scaleRatio + (mouseY - centerY)

    const constrained = getConstrainedOffset(newOffsetX, newOffsetY, newScale)

    onViewStateChange({
      scale: newScale,
      offsetX: constrained.x,
      offsetY: constrained.y,
    })
  }, [viewState, viewportWidth, viewportHeight, onViewStateChange, getConstrainedOffset])

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Allow single-finger horizontal swipe to pass through to carousel when not zoomed
    if (e.touches.length === 1 && viewState.scale <= MIN_SCALE) {
      return // Let carousel handle it for swipe navigation
    }

    // Notify that gesture is active
    onGestureActiveChange?.(true)

    if (e.touches.length === 2) {
      // Pinch start
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()

      pinchStateRef.current = {
        initialDistance: distance,
        initialScale: viewState.scale,
        initialCenter: {
          x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
          y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
        },
        initialOffset: { x: viewState.offsetX, y: viewState.offsetY },
      }
      panStateRef.current = null
    } else if (e.touches.length === 1 && viewState.scale > MIN_SCALE) {
      // Pan start (only when zoomed)
      panStateRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialOffset: { x: viewState.offsetX, y: viewState.offsetY },
      }
      pinchStateRef.current = null
    }
  }, [viewState, onGestureActiveChange])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchStateRef.current) {
      e.preventDefault()

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()

      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
        y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
      }

      // Calculate new scale
      const scaleRatio = distance / pinchStateRef.current.initialDistance
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStateRef.current.initialScale * scaleRatio))

      // Calculate offset to zoom toward pinch center
      const { initialCenter, initialOffset, initialScale } = pinchStateRef.current
      const centerX = viewportWidth / 2
      const centerY = viewportHeight / 2

      // Pan from pinch center movement
      const panX = currentCenter.x - initialCenter.x
      const panY = currentCenter.y - initialCenter.y

      // Zoom toward initial pinch center
      const actualScaleRatio = newScale / initialScale
      const newOffsetX = (initialOffset.x - (initialCenter.x - centerX)) * actualScaleRatio + (initialCenter.x - centerX) + panX
      const newOffsetY = (initialOffset.y - (initialCenter.y - centerY)) * actualScaleRatio + (initialCenter.y - centerY) + panY

      const constrained = getConstrainedOffset(newOffsetX, newOffsetY, newScale)

      onViewStateChange({
        scale: newScale,
        offsetX: constrained.x,
        offsetY: constrained.y,
      })
    } else if (e.touches.length === 1 && panStateRef.current) {
      e.preventDefault()

      const deltaX = e.touches[0].clientX - panStateRef.current.startX
      const deltaY = e.touches[0].clientY - panStateRef.current.startY

      const newOffsetX = panStateRef.current.initialOffset.x + deltaX
      const newOffsetY = panStateRef.current.initialOffset.y + deltaY

      const constrained = getConstrainedOffset(newOffsetX, newOffsetY, viewState.scale)

      onViewStateChange({
        ...viewState,
        offsetX: constrained.x,
        offsetY: constrained.y,
      })
    }
  }, [viewState, viewportWidth, viewportHeight, onViewStateChange, getConstrainedOffset])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) {
      pinchStateRef.current = null
      panStateRef.current = null
      // Notify that gesture ended
      onGestureActiveChange?.(false)
    } else if (e.touches.length === 1) {
      // Transition from pinch to pan
      pinchStateRef.current = null
      if (viewState.scale > MIN_SCALE) {
        panStateRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          initialOffset: { x: viewState.offsetX, y: viewState.offsetY },
        }
      }
    }
  }, [viewState, onGestureActiveChange])

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return // Only left click
    if (viewState.scale <= MIN_SCALE) return // Only pan when zoomed

    isDraggingRef.current = true
    hasDraggedRef.current = false
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffset: { x: viewState.offsetX, y: viewState.offsetY },
    }
  }, [viewState])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !panStateRef.current) return

    const deltaX = e.clientX - panStateRef.current.startX
    const deltaY = e.clientY - panStateRef.current.startY

    // Mark as dragged if moved more than a few pixels
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasDraggedRef.current = true
    }

    const newOffsetX = panStateRef.current.initialOffset.x + deltaX
    const newOffsetY = panStateRef.current.initialOffset.y + deltaY

    const constrained = getConstrainedOffset(newOffsetX, newOffsetY, viewState.scale)

    onViewStateChange({
      ...viewState,
      offsetX: constrained.x,
      offsetY: constrained.y,
    })
  }, [viewState, onViewStateChange, getConstrainedOffset])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    panStateRef.current = null
  }, [])

  // Click handling with double-click detection
  const handleClick = useCallback((_e: React.MouseEvent) => {
    // Ignore click if we just finished dragging
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      return
    }

    if (clickTimeoutRef.current) {
      // Double-click detected
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null

      // Toggle zoom
      if (viewState.scale > MIN_SCALE) {
        // Zoom out to fit
        onViewStateChange({ scale: MIN_SCALE, offsetX: 0, offsetY: 0 })
      } else {
        // Zoom in to 3x centered
        onViewStateChange({ scale: 3, offsetX: 0, offsetY: 0 })
      }

      onDoubleClick?.()
      return
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      onClick?.()
    }, 250)
  }, [viewState, viewportWidth, viewportHeight, onClick, onDoubleClick, onViewStateChange, getConstrainedOffset])

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseUp)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      onClick={handleClick}
      style={{
        cursor: viewState.scale > MIN_SCALE ? 'grab' : 'zoom-in',
        // When not zoomed, allow horizontal touch scrolling for carousel swipe
        touchAction: viewState.scale > MIN_SCALE ? 'none' : 'pan-x',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      data-testid="photo-viewer"
    >
      {children}
    </div>
  )
}

export function PhotoViewer({ photoId, rotation, isCurrent, onClick, onZoomChange, personTags, objectTags, showPeopleBoxes, showObjectBoxes, onRefetch }: PhotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [tilesReady, setTilesReady] = useState(false)
  const [isGestureActive, setIsGestureActive] = useState(false)

  // Calculate optimal resolution based on viewport and pixel density
  const resolution = useOptimalResolution()

  // Reset view state when photo changes
  useEffect(() => {
    setViewState({ scale: 1, offsetX: 0, offsetY: 0 })
    setImageDimensions(null)
    setIsLoading(true)
    setTilesReady(false)
    setIsGestureActive(false)
  }, [photoId])

  // Reset view state when becoming non-current
  useEffect(() => {
    if (!isCurrent) {
      setViewState({ scale: 1, offsetX: 0, offsetY: 0 })
    }
  }, [isCurrent])

  // Track viewport size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  // Notify parent of zoom state changes
  useEffect(() => {
    onZoomChange?.(viewState.scale > MIN_SCALE)
  }, [viewState.scale, onZoomChange])

  const handleImageLoad = useCallback((dimensions: { width: number; height: number }) => {
    setImageDimensions(dimensions)
    setIsLoading(false)
  }, [])

  const handleViewStateChange = useCallback((newState: ViewState) => {
    setViewState(newState)
  }, [])

  // Use cached dimensions if available
  const url = getPhotoThumbnailUrl(photoId)
  const cachedDimensions = getCachedDimensions(url)
  const effectiveDimensions = imageDimensions || cachedDimensions || { width: 1920, height: 1080 }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#1d1d1d]">
      {viewportSize.width > 0 && viewportSize.height > 0 && (
        <GestureHandler
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          onClick={onClick}
          onGestureActiveChange={setIsGestureActive}
          imageWidth={effectiveDimensions.width}
          imageHeight={effectiveDimensions.height}
          viewportWidth={viewportSize.width}
          viewportHeight={viewportSize.height}
          rotation={rotation}
        >
          {/* ImageViewer layer - shows 2K or 4K thumbnail based on viewport, fades when tiles ready */}
          <SyncedImageViewer
            photoId={photoId}
            rotation={rotation}
            viewState={viewState}
            imageWidth={effectiveDimensions.width}
            imageHeight={effectiveDimensions.height}
            viewportWidth={viewportSize.width}
            viewportHeight={viewportSize.height}
            onImageLoad={handleImageLoad}
            debugOpacity={tilesReady ? 0.75 : 1}
            resolution={resolution}
          />

          {/* TileViewer layer - shows high-res tiles when zoomed */}
          {!isLoading && (
            <CustomTileViewer
              photoId={photoId}
              rotation={rotation}
              viewState={viewState}
              imageWidth={effectiveDimensions.width}
              imageHeight={effectiveDimensions.height}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              opacity={TILE_VIEWER_OPACITY}
              onTilesReady={setTilesReady}
              isGestureActive={isGestureActive}
            />
          )}

          {/* Bounding boxes layer - shows face/object detection boxes */}
          {!isLoading && (
            <BoundingBoxes
              personTags={personTags || []}
              objectTags={objectTags || []}
              rotation={rotation}
              showPeopleBoxes={showPeopleBoxes ?? false}
              showObjectBoxes={showObjectBoxes ?? false}
              onRefetch={onRefetch}
              viewState={viewState}
              imageWidth={effectiveDimensions.width}
              imageHeight={effectiveDimensions.height}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
            />
          )}
        </GestureHandler>
      )}
    </div>
  )
}
