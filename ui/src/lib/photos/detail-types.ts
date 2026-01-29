// Camera and Lens types
export interface Camera {
  id: string
  make: string
  model: string
}

export interface Lens {
  id: string
  name: string
}

// Tag types
export interface Tag {
  id: string
  name: string
  parent?: { id: string } | null
}

export interface PhotoTag {
  id: string
  tag: Tag
  confidence?: number
  significance?: number
}

// Bounding box tags (face/object detection)
export interface BoundingBoxTag extends PhotoTag {
  positionX: number
  positionY: number
  sizeX: number
  sizeY: number
}

export interface PersonTag extends BoundingBoxTag {
  verified: boolean
  deleted: boolean
  showVerifyIcon: boolean
}

export type ObjectTag = BoundingBoxTag

// Color tag with significance
export interface ColorTag {
  tag: { name: string }
  significance: number
}

// Location tag with hierarchy
export interface LocationTag {
  tag: Tag
}

// Style/Event tags (simple)
export interface StyleTag {
  tag: { name: string }
}

export interface EventTag {
  tag: { name: string }
}

// Generic user tag
export interface GenericTag {
  tag: Tag
}

// Photo file (multiple versions possible)
export interface PhotoFile {
  id: string
  path: string
}

// Full photo detail
export interface PhotoDetail {
  id: string
  width: number
  height: number
  rotation: number
  userRotation: number
  downloadUrl: string | null
  location: [number, number] | null
  takenAt: string | null
  aperture: number | null
  exposure: string | null
  isoSpeed: number | null
  focalLength: number | null
  flash: boolean | null
  meteringMode: string | null
  driveMode: string | null
  shootingMode: string | null
  starRating: number
  camera: Camera | null
  lens: Lens | null
  locationTags: LocationTag[]
  objectTags: ObjectTag[]
  personTags: PersonTag[]
  colorTags: ColorTag[]
  styleTags: StyleTag[]
  eventTags: EventTag[]
  genericTags: GenericTag[]
  photoFile: PhotoFile[]
  baseFileId: string | null
}

// GraphQL response types
export interface GetPhotoResponse {
  photo: PhotoDetail | null
}

export interface SaveRotationResponse {
  savePhotofileRotation: {
    ok: boolean
    rotation: number
  }
}

export interface EditFaceTagResponse {
  editFaceTag: {
    ok: boolean
  }
}

export interface BlockFaceTagResponse {
  blockFaceTag: {
    ok: boolean
  }
}

export interface VerifyFaceTagResponse {
  verifyPhoto: {
    ok: boolean
  }
}

export interface CreateGenericTagResponse {
  createGenericTag: {
    ok: boolean
    photoTagId: string
    tagId: string
    name: string
  }
}

export interface RemoveGenericTagResponse {
  removeGenericTag: {
    ok: boolean
  }
}

// Photos around response for navigation
export interface PhotosAroundData {
  photoIds: string[]
  rotations: Record<string, number>
  currentIndex: number
}

export interface PhotosAroundResponse {
  photosAround: PhotosAroundData | null
}
