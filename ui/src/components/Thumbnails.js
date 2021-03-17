import React from 'react'
import styled from '@emotion/styled'
import Thumbnail from './Thumbnail'

const Container = styled('ul')`
  margin: 0;
  padding: 0;
  & > h2 {
    display: block;
  }

  .section {
    margin-bottom: 40px;
  }

  @media all and (max-width: 1000px) {
    .section {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      grid-column-gap: 20px;
      grid-row-gap: 20px;
      box-sizing: content-box;
    }
  }
  @media all and (max-width: 700px) {
    .section {
      margin-bottom: 20px;
    }
  }
`
const SectionHeading = styled('h2')`
  display: block;
`

const Thumbnails = ({ photoSections }) => (
  <Container>
    {photoSections
      ? photoSections.map((section) => (
          <div className="section" id={section.id} key={section.id}>
            {section.title ? (
              <SectionHeading>{section.title}</SectionHeading>
            ) : null}
            {section.segments.map((segment) =>
              segment.photos.map((photo) => (
                <Thumbnail
                  key={photo.id}
                  id={photo.id}
                  imageUrl={photo.thumbnail}
                  starRating={photo.starRating}
                />
              ))
            )}
          </div>
        ))
      : null}
  </Container>
)

export default Thumbnails
