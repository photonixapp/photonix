import React from 'react'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'

import PhotoMetadataModal from '../components/PhotoMetadataModal'
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

const PhotoMetadataContainer = (props) => {
  const { loading, data } = useQuery(GET_PHOTO_METADATA, {
    variables: {
      id: props.match.params.id,
    },
  })
 
  if (loading) return <Spinner />
  if (!data?.photoFileMetadata.ok) return `Something went wrong!`

  return (
    <PhotoMetadataModal
      data={data?.photoFileMetadata}
    />
  )
}

export default PhotoMetadataContainer
