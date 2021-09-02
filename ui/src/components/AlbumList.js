import React, { useEffect } from 'react'
import styled from '@emotion/styled'

import Thumbnails from './Thumbnails'
import useInfiniteScroll from './InfiniteScroll'

const Container = styled('div')`
  height: 100%;
  overflow-y: auto;
`

const AlbumList = ({
  photoSections,
  refetchPhotos,
  refetchPhotoList,
  refetchAlbumList,
  mapPhotosRefetch,
  setExpanded,
  mode,
}) => {
  const [scrollerRef, handleScroll] = useInfiniteScroll(refetchPhotos)
  useEffect(() => {
    setExpanded(true)
  }, [])

  return (
    <Container ref={scrollerRef} onScroll={handleScroll}>
      <Thumbnails
        photoSections={photoSections}
        refetchPhotoList={refetchPhotoList}
        refetchAlbumList={refetchAlbumList}
        mapPhotosRefetch={mapPhotosRefetch}
        mode={mode}
        rateable
      />
      {/* #TODO: Add the DateHistogram feature back here */}
    </Container>
  )
}

export default AlbumList
