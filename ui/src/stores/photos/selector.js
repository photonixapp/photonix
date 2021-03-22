export const getNextPrevPhotos = (state, currentPhotoId) => {
  const photos = state.photos
  let nextPrevPhotos = {
    next: [],
    prev: [],
  }
  if (photos?.length) {
    let index = photos.indexOf(currentPhotoId)
    if (index > 0) {
      nextPrevPhotos.prev.push(photos[index - 1])
    }
    if (index < photos.length - 1) {
      nextPrevPhotos.next.push(photos[index + 1])
    }
  }
  return nextPrevPhotos
}
