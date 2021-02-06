import React, { useEffect,useState,useCallback }  from 'react'
import { useQuery,refetch } from '@apollo/react-hooks';
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
  const [photo, setPhoto] = useState()

  const { loading, error, data, refetch } = useQuery(GET_PHOTO, {
    variables: {
      id: props.match.params.photoId,
    }
  })

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

  useEffect (() => {
    refetch()
    if(!loading && data) {
      setPhoto(data)
    }
  }, [data])

  if (loading) return <Spinner />
  if (error) return `Error! ${error.message}`

  if (photo && photo.photo) {
    return <PhotoDetail photoId={props.match.params.photoId} photo={data.photo} refetch={refetch} />
  }
  return null
}

export default PhotoDetailContainer
