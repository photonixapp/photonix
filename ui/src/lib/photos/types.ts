export interface Photo {
  id: string
  location: [number, number] | null
  starRating: number
  rotation: number
}

export interface PhotoEdge {
  cursor: string
  node: Photo
}

export interface PageInfo {
  endCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AllPhotosResponse {
  allPhotos: {
    pageInfo: PageInfo
    edges: PhotoEdge[]
  }
}

export interface PhotoRatingResponse {
  photoRating: {
    photo: {
      starRating: number
    }
  }
}

export interface ThumbnailPhoto {
  id: string
  thumbnailUrl: string
  starRating: number
  rotation: number
}
