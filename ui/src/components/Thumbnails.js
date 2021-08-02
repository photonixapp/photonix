import React, { useState } from 'react'
import { useLongPress, LongPressDetectEvents } from 'use-long-press'
import styled from '@emotion/styled'
import { useHistory } from 'react-router-dom'

import Thumbnail from './Thumbnail'
import FabMenu from '../components/FabMenu'
import { ReactComponent as AlbumIcon } from '../static/images/album_outlined.svg'
import { ReactComponent as DeleteIcon } from '../static/images/delete_outlined.svg'
import { ReactComponent as TagIcon } from '../static/images/tag_outlined.svg'

const Container = styled('ul')`
  margin: 0;
  padding: 0;
  padding: 40px;

  & > h2 {
    display: block;
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

const Thumbnails = ({ photoSections, refetchPhotoList }) => {
  const history = useHistory()
  const [selected, setSelected] = useState([])

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

  return (
    <>
      <Container>
        {photoSections
          ? photoSections.map((section) => (
              <div className="section" id={section.id} key={section.id}>
                {section.title ? (
                  <SectionHeading>{section.title}</SectionHeading>
                ) : null}
                <div className="thumbnails">
                  {section.segments.map((segment) =>
                    segment.photos.map((photo) => {
                      return (
                        <Thumbnail
                          key={photo.id}
                          id={photo.id}
                          imageUrl={photo.thumbnail}
                          starRating={photo.starRating}
                          selected={selected.indexOf(photo.id) > -1}
                          selectable={selected.length > 0}
                          {...bind}
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
          options={[
            {
              label: 'Tag',
              icon: <TagIcon />,
            },
            {
              label: 'Album',
              icon: <AlbumIcon />,
            },
            {
              label: 'Delete',
              icon: <DeleteIcon />,
            },
          ]}
          photoIds={selected}
          refetchPhotoList={refetchPhotoList}
        />
      )}
    </>
  )
}

export default Thumbnails
