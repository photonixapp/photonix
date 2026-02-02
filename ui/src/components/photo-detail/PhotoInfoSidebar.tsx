import { useState, useMemo, useEffect } from 'react'
import { Eye, EyeOff, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { StarRating } from '../thumbnails/StarRating'
import { ImageHistogram } from './ImageHistogram'
import { EditableTags } from './EditableTags'
import { TagList } from './TagList'
import { ColorTags } from './ColorTags'
import { getPhotoThumbnailUrl, type ThumbnailResolution } from '../../lib/photos/image-cache-store'
import type { PhotoDetail } from '../../lib/photos/detail-types'

interface PhotoInfoSidebarProps {
  photo: PhotoDetail
  show: boolean
  showPeopleBoxes: boolean
  showObjectBoxes: boolean
  onTogglePeopleBoxes: () => void
  onToggleObjectBoxes: () => void
  onRatingChange: (rating: number) => void
  onTagsUpdated: () => void
  resolution?: ThumbnailResolution
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
  showPeopleBoxes,
  showObjectBoxes,
  onTogglePeopleBoxes,
  onToggleObjectBoxes,
  onRatingChange,
  onTagsUpdated,
  resolution = '1920',
}: PhotoInfoSidebarProps) {
  const [showAllMetadata, setShowAllMetadata] = useState(false)
  const [tagEditorMode, setTagEditorMode] = useState(false)
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

  // Exit tag editor mode on Escape key
  useEffect(() => {
    if (!tagEditorMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTagEditorMode(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [tagEditorMode])

  const PeopleBoxIcon = showPeopleBoxes ? Eye : EyeOff
  const ObjectBoxIcon = showObjectBoxes ? Eye : EyeOff

  if (!show) return null

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-[350px] max-w-[80vw] bg-black/80 text-white overflow-y-auto z-40"
      style={{
        animation: 'slideInRight 300ms ease-out',
      }}
    >
      <div className="p-6 pt-16">
        {/* Star Rating */}
        <Section title="" index={sectionIndex++}>
          <StarRating
            rating={photo.starRating}
            onRatingChange={onRatingChange}
            size="lg"
            alwaysShow
          />
        </Section>

        <Section title="" index={sectionIndex++}>
          <div className="mt-4">
            <ImageHistogram
              imageUrl={getPhotoThumbnailUrl(photo.id, resolution)}
            />
          </div>
        </Section>

        {/* Metadata */}
        <Section title="" index={sectionIndex++}>
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
                className="text-white/80 hover:text-white underline flex items-center gap-1 mt-1 cursor-pointer"
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

        {/* User Tags */}
        <Section
          title="Tags"
          index={sectionIndex++}
          showIcon={
            <button
              onClick={() => setTagEditorMode(!tagEditorMode)}
              className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
              title={tagEditorMode ? 'Done editing' : 'Edit tags'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          }
        >
          <EditableTags
            tags={photo.genericTags}
            editorMode={tagEditorMode}
            photoId={photo.id}
            onTagsUpdated={onTagsUpdated}
          />
        </Section>

        {/* Location Tags */}
        {photo.locationTags.length > 0 && (
          <Section title="Locations" index={sectionIndex++}>
            <TagList tags={photo.locationTags} />
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
            <ColorTags tags={photo.colorTags} />
          </Section>
        )}

        {/* People */}
        {visiblePersonTags.length > 0 && (
          <Section
            title="People"
            index={sectionIndex++}
            showIcon={
              <button
                onClick={onTogglePeopleBoxes}
                className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                title={showPeopleBoxes ? 'Hide people boxes' : 'Show people boxes'}
              >
                <PeopleBoxIcon className="w-4 h-4" />
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
                onClick={onToggleObjectBoxes}
                className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                title={showObjectBoxes ? 'Hide object boxes' : 'Show object boxes'}
              >
                <ObjectBoxIcon className="w-4 h-4" />
              </button>
            }
          >
            <TagList tags={photo.objectTags} />
          </Section>
        )}

        {/* Styles */}
        {photo.styleTags.length > 0 && (
          <Section title="Styles" index={sectionIndex++}>
            <TagList tags={photo.styleTags} />
          </Section>
        )}

        {/* Events */}
        {photo.eventTags.length > 0 && (
          <Section title="Events" index={sectionIndex++}>
            <TagList tags={photo.eventTags} />
          </Section>
        )}

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