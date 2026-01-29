import { useState, useMemo } from 'react'
import { Eye, EyeOff, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { StarRating } from '../thumbnails/StarRating'
import type { PhotoDetail } from '../../lib/photos/detail-types'

interface PhotoInfoSidebarProps {
  photo: PhotoDetail
  show: boolean
  showBoundingBox: boolean
  onToggleBoundingBox: () => void
  onRatingChange: (rating: number) => void
}

interface SectionProps {
  title: string
  index: number
  children: React.ReactNode
  showIcon?: React.ReactNode
}

function Section({ title, index, children, showIcon }: SectionProps) {
  // Staggered animation delay based on index
  const delay = 500 + index * 100

  return (
    <div
      className="mb-6 opacity-0"
      style={{
        animation: `fadeSlideIn 300ms ease-out ${delay}ms forwards`,
      }}
    >
      <h3 className="text-white/90 font-medium mb-2 flex items-center gap-2">
        {title}
        {showIcon}
      </h3>
      <div className="text-white/70 text-sm">{children}</div>
    </div>
  )
}

export function PhotoInfoSidebar({
  photo,
  show,
  showBoundingBox,
  onToggleBoundingBox,
  onRatingChange,
}: PhotoInfoSidebarProps) {
  const [showAllMetadata, setShowAllMetadata] = useState(false)
  let sectionIndex = 0

  // Format date
  const formattedDate = useMemo(() => {
    if (!photo.takenAt) return null
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(photo.takenAt))
    } catch {
      return photo.takenAt
    }
  }, [photo.takenAt])

  // Filter out deleted person tags
  const visiblePersonTags = useMemo(
    () => photo.personTags.filter((tag) => !tag.deleted),
    [photo.personTags]
  )

  const BoundingBoxIcon = showBoundingBox ? Eye : EyeOff

  if (!show) return null

  return (
    <div
      className="w-[350px] max-w-[80vw] bg-black/80 text-white overflow-y-auto flex-shrink-0"
      style={{
        animation: 'slideInRight 300ms ease-out',
      }}
    >
      <div className="p-6 pt-16">
        {/* Star Rating */}
        <Section title="Rating" index={sectionIndex++}>
          <StarRating
            rating={photo.starRating}
            onRatingChange={onRatingChange}
            size="lg"
          />
        </Section>

        {/* Metadata */}
        <Section title="Metadata" index={sectionIndex++}>
          <ul className="space-y-1">
            {photo.camera && (
              <li>
                <span className="text-white/50">Camera:</span>{' '}
                {photo.camera.make} {photo.camera.model}
              </li>
            )}
            {photo.lens && (
              <li>
                <span className="text-white/50">Lens:</span> {photo.lens.name}
              </li>
            )}
            {formattedDate && (
              <li>
                <span className="text-white/50">Date:</span> {formattedDate}
              </li>
            )}
            {photo.aperture && (
              <li>
                <span className="text-white/50">Aperture:</span> f/{photo.aperture}
              </li>
            )}
            {photo.exposure && (
              <li>
                <span className="text-white/50">Exposure:</span> {photo.exposure}
              </li>
            )}
            {photo.isoSpeed && (
              <li>
                <span className="text-white/50">ISO:</span> {photo.isoSpeed}
              </li>
            )}
            {photo.focalLength && (
              <li>
                <span className="text-white/50">Focal Length:</span>{' '}
                {photo.focalLength}mm
              </li>
            )}
            {photo.flash !== null && (
              <li>
                <span className="text-white/50">Flash:</span>{' '}
                {photo.flash ? 'On' : 'Off'}
              </li>
            )}

            {/* Collapsible extra metadata */}
            {showAllMetadata && (
              <>
                {photo.meteringMode && (
                  <li>
                    <span className="text-white/50">Metering:</span>{' '}
                    {photo.meteringMode}
                  </li>
                )}
                {photo.driveMode && (
                  <li>
                    <span className="text-white/50">Drive Mode:</span>{' '}
                    {photo.driveMode}
                  </li>
                )}
                {photo.shootingMode && (
                  <li>
                    <span className="text-white/50">Shooting Mode:</span>{' '}
                    {photo.shootingMode}
                  </li>
                )}
                <li>
                  <span className="text-white/50">Dimensions:</span>{' '}
                  {photo.width} x {photo.height}
                </li>
                {photo.photoFile[0]?.path && (
                  <li className="break-all">
                    <span className="text-white/50">Path:</span>{' '}
                    {photo.photoFile[0].path}
                  </li>
                )}
              </>
            )}

            <li>
              <button
                onClick={() => setShowAllMetadata(!showAllMetadata)}
                className="text-white/80 hover:text-white underline flex items-center gap-1 mt-1"
              >
                {showAllMetadata ? (
                  <>
                    Show less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show all <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </li>
          </ul>
        </Section>

        {/* Location Tags */}
        {photo.locationTags.length > 0 && (
          <Section title="Locations" index={sectionIndex++}>
            <ul className="space-y-1">
              {photo.locationTags.map((lt, i) => (
                <li key={i}>{lt.tag.name}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Map placeholder - will use Leaflet later */}
        {photo.location && (
          <Section title="Map" index={sectionIndex++}>
            <div className="w-full h-32 bg-neutral-800 rounded border border-neutral-600 flex items-center justify-center text-white/40">
              Map: {photo.location[0].toFixed(4)}, {photo.location[1].toFixed(4)}
            </div>
          </Section>
        )}

        {/* Color Tags */}
        {photo.colorTags.length > 0 && (
          <Section title="Colors" index={sectionIndex++}>
            <div className="flex flex-wrap gap-2">
              {photo.colorTags.map((ct, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: ct.tag.name.toLowerCase(),
                    color: isLightColor(ct.tag.name) ? '#000' : '#fff',
                  }}
                >
                  {ct.tag.name}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* People */}
        {visiblePersonTags.length > 0 && (
          <Section
            title="People"
            index={sectionIndex++}
            showIcon={
              <button
                onClick={onToggleBoundingBox}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={showBoundingBox ? 'Hide bounding boxes' : 'Show bounding boxes'}
              >
                <BoundingBoxIcon className="w-4 h-4" />
              </button>
            }
          >
            <ul className="space-y-1">
              {visiblePersonTags.map((pt, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{pt.tag.name}</span>
                  {pt.verified && (
                    <span className="text-xs text-green-400">(verified)</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Objects */}
        {photo.objectTags.length > 0 && (
          <Section
            title="Objects"
            index={sectionIndex++}
            showIcon={
              <button
                onClick={onToggleBoundingBox}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={showBoundingBox ? 'Hide bounding boxes' : 'Show bounding boxes'}
              >
                <BoundingBoxIcon className="w-4 h-4" />
              </button>
            }
          >
            <ul className="space-y-1">
              {photo.objectTags.map((ot, i) => (
                <li key={i}>{ot.tag.name}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Styles */}
        {photo.styleTags.length > 0 && (
          <Section title="Styles" index={sectionIndex++}>
            <ul className="space-y-1">
              {photo.styleTags.map((st, i) => (
                <li key={i}>{st.tag.name}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Events */}
        {photo.eventTags.length > 0 && (
          <Section title="Events" index={sectionIndex++}>
            <ul className="space-y-1">
              {photo.eventTags.map((et, i) => (
                <li key={i}>{et.tag.name}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Generic Tags */}
        <Section
          title="Tags"
          index={sectionIndex++}
          showIcon={
            <button
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Edit tags"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          }
        >
          {photo.genericTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photo.genericTags.map((gt, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-white/10 rounded text-xs"
                >
                  {gt.tag.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-white/40">No tags</span>
          )}
        </Section>

        {/* Multiple file versions */}
        {photo.photoFile.length > 1 && (
          <Section title="Versions" index={sectionIndex++}>
            <select className="w-full bg-neutral-700 text-white rounded px-2 py-1 text-sm">
              {photo.photoFile.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.path.split('/').pop()}
                </option>
              ))}
            </select>
          </Section>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

// Helper to determine if a color is light (for text contrast)
function isLightColor(colorName: string): boolean {
  const lightColors = [
    'white',
    'yellow',
    'cyan',
    'lime',
    'aqua',
    'beige',
    'ivory',
    'lightyellow',
    'lightcyan',
    'lightgreen',
    'pink',
    'lavender',
  ]
  return lightColors.includes(colorName.toLowerCase())
}
