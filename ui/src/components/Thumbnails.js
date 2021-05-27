import React from 'react'
import styled from '@emotion/styled'
import Thumbnail from './Thumbnail'

const Container = styled('ul')`
  margin: 0;
  padding: 0;
  padding: 40px;

  & > h2 {
    display: block;
  }

  .section {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    grid-column-gap: 20px;
    grid-row-gap: 20px;
    box-sizing: content-box;
  }

  @media all and (max-width: 1024px) {
    padding: 20px;
    .section {
      margin-bottom: 20px;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
  }
  @media all and (max-width: 700px) {
    padding: 10px;
    .section {
      margin-bottom: 10px;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      grid-column-gap: 10px;
      grid-row-gap: 10px;
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
