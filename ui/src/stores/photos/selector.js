export const getPrevNextPhotos = (state, currentPhotoId) => {
  const photos = state.photos.photos
  let prevNextPhotos = {
    next: [],
    prev: [],
  }
  if (photos?.length) {
    let index = photos.indexOf(currentPhotoId)
    if (index > 0) {
      prevNextPhotos.prev.push(photos[index - 1])
    }
    if (index < photos.length - 1) {
      prevNextPhotos.next.push(photos[index + 1])
    }
  }
  return prevNextPhotos
}
