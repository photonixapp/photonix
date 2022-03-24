import React, { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
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
      personTags {
        id
        tag {
          name
        }
        positionX
        positionY
        sizeX
        sizeY
        verified
        deleted
        showVerifyIcon
      }
      colorTags {
        id
        tag {
          name
        }
        significance
      }
      eventTags {
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
      photoFile {
        id
        path
      }
      baseFileId
      baseFilePath
      rotation
      downloadUrl
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
const SAVE_PHOTOFILE_ROTATION = gql`
  mutation savePhotoFileRotation($id: ID!, $rotation: Int!) {
    savePhotofileRotation(photoFileId: $id, rotation: $rotation) {
      ok
      rotation
    }
  }
`

const PhotoDetailContainer = (props) => {
  const { data, refetch } = useQuery(GET_PHOTO, {
    variables: {
      id: props.match.params.photoId,
    },
  })
  const [updataPreferredPhotoFile] = useMutation(UPDATE_PREFERRED_PHOTOFILE)
  const [saveRotationValue] = useMutation(SAVE_PHOTOFILE_ROTATION)
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case ESCAPE_KEY:
          if (event.target.name !== 'tagName') {
            if (document.referrer !== '' || history.length > 2) {
              history.goBack()
            } else {
              history.push('/')
            }
          }
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

  const updatePhotoFile = (id) => {
    updataPreferredPhotoFile({
      variables: { id },
    })
      .then((res) => {
        if (res.data.changePreferredPhotoFile.ok) {
          window.location.reload()
        }
      })
      .catch((e) => {})
  }
  const saveRotation = (rotation) => {
    const id = data?.photo.baseFileId
    saveRotationValue({
      variables: {
        id: id,
        rotation: rotation,
      },
    }).catch((e) => {
      console.log(e)
    })
    refetch()
  }

  return (
    <PhotoDetail
      photoId={props.match.params.photoId}
      photo={data?.photo}
      refetch={refetch}
      updatePhotoFile={updatePhotoFile}
      saveRotation={saveRotation}
    />
  )
}

export default PhotoDetailContainer
