import React from 'react'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import styled from '@emotion/styled'

import Spinner from '../components/Spinner'

const Container = styled('div')`
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
`

const GET_PHOTO_METADATA = gql`
  query PhotoFileMetadata($id: UUID) {
    photoFileMetadata(photoFileId: $id) {
      data
      ok
    }
  }
`

const PhotoExtraData = ({ id }) => {
  const { loading, data } = useQuery(GET_PHOTO_METADATA, {
    variables: {
      id: id,
    },
  })
  if (loading) return <Spinner />
  if (!data?.photoFileMetadata.ok) return `Something went wrong!`

  return (
    <Container>
      {Object.entries(data.photoFileMetadata.data).map((entry) => (
        <li key={entry[0]}>
          <span className="key">{entry[0]}:</span> {entry[1]}
        </li>
      ))}
    </Container>
  )
}

export default PhotoExtraData
