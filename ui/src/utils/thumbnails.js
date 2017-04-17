const THUMBNAIL_SIZES = [
    [256, 256, 'cover', 50],
    [1920, 1080, 'contain', 75],
]

export const getThumbnail = (photoId, index) => {
  let thumbnail = THUMBNAIL_SIZES[index]
  return '/thumbnails/' + thumbnail[0] + 'x' + thumbnail[1] + '_' + thumbnail[2] + '_q' + thumbnail[3] + '/' + photoId + '.jpg'
}
