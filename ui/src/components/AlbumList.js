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
  }, [setExpanded])

  const params = new URLSearchParams(window.location.search)
  const albumName = params.get('album_name')
  if (albumName) photoSections[0].title = albumName

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
      {/* TODO: Add the DateHistogram feature back here */}
    </Container>
  )
}

export default AlbumList
