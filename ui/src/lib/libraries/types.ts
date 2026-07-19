export interface Library {
  id: string
  name: string
  classificationClipEnabled?: boolean
}

export interface AllLibrariesResponse {
  allLibraries: Library[]
}
