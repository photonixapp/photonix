import React from 'react'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'

import PhotoExtraData from '../components/PhotoExtraData'
import Spinner from '../components/Spinner'

const GET_PHOTO_METADATA = gql`
  query PhotoFileMetadata($id: UUID) {
    photoFileMetadata(photoFileId: $id) {
      exiftoolVersionNumber
      fileName
      directory
      fileSize
      fileType
      filePermissions
      fileTypeExtension
      fileAccessDateTime
      fileInodeChangeDateTime
      fileModificationDateTime
      mimeType
      jfifVersion
      resolutionUnit
      xResolution
      yResolution
      imageWidth
      imageHeight
      encodingProcess
      bitsPerSample
      colorComponents
      yCbCrSubSampling
      imageSize
      megapixels
      ok
    }
  }
`

const PhotoExtraDataContainer = (props) => {
  const { loading, data } = useQuery(GET_PHOTO_METADATA, {
    variables: {
      id: props.id,
    },
  })
  if (loading) return <Spinner />
  if (!data?.photoFileMetadata.ok) return `Something went wrong!`

  return (
    <PhotoExtraData
      data={data?.photoFileMetadata}
    />
  )
}

export default PhotoExtraDataContainer
