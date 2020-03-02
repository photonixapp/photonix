import React, { useEffect }  from 'react'
import { useQuery } from '@apollo/react-hooks';
import gql from "graphql-tag"

import history from '../history'
import PhotoDetail from '../components/PhotoDetail'
import Spinner from '../components/Spinner'


const ESCAPE_KEY = 27
const BACKSPACE_KEY = 8

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
      }
      styleTags {
        id
        tag {
          name
        }
      }
      width
      height
    }
  }
`

const PhotoDetailContainer = props => {
  useEffect(() => {
    const handleKeyDown = event => {
      switch (event.keyCode) {
        case ESCAPE_KEY:
        case BACKSPACE_KEY:
          history.goBack()
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

  const { loading, error, data } = useQuery(GET_PHOTO, {
    variables: {
      id: props.match.params.photoId,
    }
  })

  if (loading) return <Spinner />
  if (error) return `Error! ${error.message}`

  if (data.photo) {
    return <PhotoDetail photoId={props.match.params.photoId} photo={data.photo} />
  }
  return null
}

export default PhotoDetailContainer
