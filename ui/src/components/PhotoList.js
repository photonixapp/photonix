import React from 'react'
import styled from '@emotion/styled'

import Thumbnails from './Thumbnails'
import useInfiniteScroll from './InfiniteScroll'

const Container = styled('div')`
  height: 100%;
  overflow-y: auto;
`

const PhotoList = ({
  photoSections,
  refetchPhotos,
  refetchPhotoList,
  refetchAlbumList,
  mapPhotosRefetch,
  mode,
}) => {
  const [scrollerRef, sentinelRef] = useInfiniteScroll(refetchPhotos)

  return (
    <Container ref={scrollerRef}>
      <Thumbnails
        photoSections={photoSections}
        refetchPhotoList={refetchPhotoList}
        refetchAlbumList={refetchAlbumList}
        mapPhotosRefetch={mapPhotosRefetch}
        mode={mode}
        rateable={mode !== 'ALBUMS'}
      />
      {/* #TODO: Add the DateHistogram feature back here */}
      <div ref={sentinelRef} style={{ height: '1px' }} />
    </Container>
  )
}

export default PhotoList
