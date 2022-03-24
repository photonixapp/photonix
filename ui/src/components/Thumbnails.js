import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useMutation } from '@apollo/client'
import { useLongPress, LongPressDetectEvents } from 'use-long-press'
import styled from '@emotion/styled'
import { useHistory } from 'react-router-dom'

import Thumbnail from './Thumbnail'
import FabMenu from '../components/FabMenu'
import { REMOVE_PHOTOS_FROM_ALBUM } from '../graphql/tag'
import { SET_PHOTOS_DELETED } from '../graphql/tag'
import { ReactComponent as AlbumIcon } from '../static/images/album_outlined.svg'
import { ReactComponent as ArrowBackIcon } from '../static/images/arrow_back.svg'
import { ReactComponent as DeleteIcon } from '../static/images/delete_outlined.svg'
import { ReactComponent as TagIcon } from '../static/images/tag_outlined.svg'

const Container = styled('ul')`
  margin: 0;
  padding: 0;
  padding: 40px;

  & > h2 {
    display: block;
  }

  .backIcon {
    cursor: pointer;
    margin-right: 10px;
    vertical-align: middle;
    display: inline-block;
    svg {
      filter: invert(0.9);
    }
  }

  .section {
    .thumbnails {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      grid-column-gap: 20px;
      grid-row-gap: 20px;
      box-sizing: content-box;
    }
    h2 {
      font-size: 18px;
      display: inline-block;
      margin: 0 0 20px 0;
    }
  }

  @media all and (max-width: 1024px) {
    padding: 20px;
    .section {
      margin-bottom: 20px;
      .thumbnails {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
  }
  @media all and (max-width: 700px) {
    padding: 10px;
    .section {
      margin-bottom: 10px;
      .thumbnails {
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        grid-column-gap: 10px;
        grid-row-gap: 10px;
      }
    }
  }
`
const SectionHeading = styled('h2')`
  display: block;
`

const ESCAPE_KEY = 27
const CTRL_KEY = 17

const Thumbnails = ({
  photoSections,
  refetchPhotoList,
  refetchAlbumList,
  mapPhotosRefetch,
  mode,
  rateable,
}) => {
  const history = useHistory()
  const [selected, setSelected] = useState([])
  const [ctrlKeyPressed, setCtrlKeyPressed] = useState(false)

  const [removePhotosFromAlbum] = useMutation(REMOVE_PHOTOS_FROM_ALBUM)
  const [setPhotosDeleted] = useMutation(SET_PHOTOS_DELETED)
  const params = new URLSearchParams(window.location.search)

  const removeFromAlbum = (photoIds) => {
    removePhotosFromAlbum({
      variables: {
        photoIds: photoIds.toString(),
        albumId: params.get('album_id'),
      },
    })
      .then((res) => {
        if (res.data.removePhotosFromAlbum.ok) {
          refetchPhotoList()
          refetchAlbumList()
          mapPhotosRefetch()
        }
      })
      .catch((e) => {})
  }

  const setPhotosDeletedTrue = (photoIds) => {
    setPhotosDeleted({
      variables: {
        photoIds: photoIds.toString(),
      },
    })
      .then((res) => {
        if (res.data.setPhotosDeleted.ok) {
          refetchPhotoList()
          refetchAlbumList()
          mapPhotosRefetch()
        }
      })
      .catch((e) => {})
  }

  let options = [
    {
      label: '+ Tag',
      description: 'Add tag to selected photos',
      icon: <TagIcon />,
      onClick: () =>
        history.push(`/assign-tag`, { photoIds: selected, tagType: 'G' }),
    },
    {
      label: '+ Album',
      description: 'Add selected photos to album',
      icon: <AlbumIcon />,
      onClick: () =>
        history.push(`/assign-album`, { photoIds: selected, tagType: 'A' }),
    },
    {
      label: '− Album',
      description: 'Remove selected photos from album',
      icon: <AlbumIcon />,
      onClick: removeFromAlbum,
    },
    {
      label: 'Delete',
      description: 'Delete selected photos',
      icon: <DeleteIcon />,
      onClick: setPhotosDeletedTrue,
    },
  ]

  mode !== 'ALBUM_ID' && options.splice(2, 1)
  const getNode = (startEl) => {
    for (let el = startEl; el && el.parentNode; el = el.parentNode) {
      if (el.tagName === 'LI') return el
    }
    return null
  }

  const addRemoveItem = (id) => {
    let ids = [...selected]
    const index = ids.indexOf(id)
    index > -1 ? ids.splice(index, 1) : ids.push(id)
    setSelected(ids)
  }

  const bind = useLongPress(
    (e) => {
      const id = getNode(e.target).getAttribute('data-id')
      addRemoveItem(id)
    },
    {
      onCancel: (e) => {
        const id = getNode(e.target).getAttribute('data-id')
        selected.length > 0 ? addRemoveItem(id) : history.push(`/photo/${id}`)
      },
      threshold: 500,
      captureEvent: true,
      cancelOnMovement: false,
      detect: LongPressDetectEvents.BOTH,
    }
  )

  useEffect(() => {
    if (mode === 'ALBUMS') setSelected([])
  }, [mode])

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case ESCAPE_KEY:
          setSelected([])
          break
        case CTRL_KEY:
          setCtrlKeyPressed(true)
          break
        default:
          break
      }
    }

    const handleKeyUp = (event) => {
      switch (event.keyCode) {
        case CTRL_KEY:
          setCtrlKeyPressed(false)
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const onMouseDown = ctrlKeyPressed
    ? (e) => {
        const id = getNode(e.target).getAttribute('data-id')
        addRemoveItem(id)
      }
    : bind.onMouseDown

  return (
    <>
      <Container>
        {photoSections
          ? photoSections.map((section) => (
              <div className="section" id={section.id} key={section.id}>
                <div>
                  {mode === 'ALBUM_ID' && (
                    <div className="backIcon" title="Back to album list">
                      <ArrowBackIcon
                        onClick={() => {
                          if (document.referrer !== '' || history.length > 2) {
                            history.goBack()
                          } else {
                            history.push('/?mode=albums')
                          }
                        }}
                      />
                    </div>
                  )}
                  {section.title ? (
                    <SectionHeading>{section.title}</SectionHeading>
                  ) : null}
                </div>
                <div className="thumbnails">
                  {section.segments.map((segment) =>
                    segment.photos.map((photo) => {
                      return mode === 'ALBUMS' ? (
                        <Thumbnail
                          key={photo.albumId}
                          id={photo.id}
                          imageUrl={photo.thumbnail}
                          starRating={photo.starRating}
                          rotation={photo.rotation}
                          selected={selected.indexOf(photo.id) > -1}
                          selectable={selected.length > 0}
                          mode={mode}
                          rateable={rateable}
                          albumId={photo.albumId}
                          albumPhotosCount={photo.albumPhotosCount}
                          albumName={photo.albumName}
                        />
                      ) : (
                        <Thumbnail
                          key={photo.id}
                          id={photo.id}
                          imageUrl={photo.thumbnail}
                          starRating={photo.starRating}
                          rotation={photo.rotation}
                          selected={selected.indexOf(photo.id) > -1}
                          selectable={selected.length > 0 || ctrlKeyPressed}
                          mode={mode}
                          rateable={rateable}
                          {...bind}
                          onMouseDown={onMouseDown}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            ))
          : null}
      </Container>
      {selected.length > 0 && (
        <FabMenu
          options={options}
          photoIds={selected}
          refetchPhotoList={refetchPhotoList}
          refetchAlbumList={refetchAlbumList}
          mapPhotosRefetch={mapPhotosRefetch}
          onSuccess={() => setSelected([])}
        />
      )}
    </>
  )
}

Thumbnails.propTypes = {
  photoSections: PropTypes.array,
  refetchPhotoList: PropTypes.func,
  refetchAlbumList: PropTypes.func,
  mapPhotosRefetch: PropTypes.func,
  mode: PropTypes.string,
  rateable: PropTypes.bool,
}

Thumbnails.defaultProps = {
  photoSections: [],
  mode: 'TIMELINE',
  rateable: false,
}

export default Thumbnails
