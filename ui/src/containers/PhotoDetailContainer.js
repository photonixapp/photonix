import React, { useEffect } from 'react'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'

import history from '../history'
import PhotoDetail from '../components/PhotoDetail'

const ESCAPE_KEY = 27

const GET_PHOTO = gql`
  query Photo($id: UUID) {
    photo(id: $id) {
      id
      takenAt
      takenBy
      aperture
      exposure
      isoSpeed
      focalLength
      flash
      meteringMode
      driveMode
      shootingMode
      starRating
      camera {
        id
        make
        model
      }
      lens {
        id
        name
      }
      location
      altitude
      url
      locationTags {
        id
        tag {
          id
          name
          parent {
            id
          }
        }
      }
      objectTags {
        id
        tag {
          name
        }
        positionX
        positionY
        sizeX
        sizeY
      }
      colorTags {
        id
        tag {
          name
        }
        significance
      }
      styleTags {
        id
        tag {
          name
        }
      }
      genericTags {
        id
        tag {
          id
          name
        }
      }
      width
      height
    }
  }
`

const PhotoDetailContainer = (props) => {
  const { loading, data, refetch } = useQuery(GET_PHOTO, {
    variables: {
      id: props.match.params.photoId,
    },
  })

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case ESCAPE_KEY:
          history.push('/')
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [data, loading, refetch])

  return (
    <PhotoDetail
      photoId={props.match.params.photoId}
      photo={data?.photo}
      refetch={refetch}
    />
  )
}

export default PhotoDetailContainer
