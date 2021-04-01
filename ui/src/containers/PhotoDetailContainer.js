import React, { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks'
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
      photoFile{
        id
        path
      }
      baseFileId
      baseFilePath
      width
      height
    }
  }
`
const UPDATE_PREFERRED_PHOTOFILE = gql`
  mutation changePreferredPhotoFile($id: ID!) {
    changePreferredPhotoFile(selectedPhotoFileId: $id) {
      ok
    }
  }
`

const PhotoDetailContainer = (props) => {
  const { loading, data, refetch } = useQuery(GET_PHOTO, {
    variables: {
      id: props.match.params.photoId,
    },
  })
  const [updataPreferredPhotoFile] = useMutation(UPDATE_PREFERRED_PHOTOFILE)
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

  const updataPhotoFile = (id) => {
    updataPreferredPhotoFile({
      variables: { id }
    })
    .then((res) => {
      if (res.data.changePreferredPhotoFile.ok) {
        window.location.reload()
      }
    })
    .catch((e) => {})
  }

  return (
    <PhotoDetail
      photoId={props.match.params.photoId}
      photo={data?.photo}
      refetch={refetch}
      updataPhotoFile={updataPhotoFile}
    />
  )
}

export default PhotoDetailContainer
