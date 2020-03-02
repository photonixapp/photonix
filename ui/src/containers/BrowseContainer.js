import React, { useState }  from 'react'
import { useQuery } from '@apollo/react-hooks';
import gql from "graphql-tag"
import Browse from '../components/Browse'
import Spinner from '../components/Spinner'


const GET_PHOTOS = gql`
  query Photos($filters: String) {
    allPhotos(multiFilter: $filters) {
      edges {
        node {
          id
          location
        }
      }
    }
  }
`

const BrowseContainer = (props) => {
  const [expanded, setExpanded] = useState(true)

  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') ? params.get('mode').toUpperCase() : 'TIMELINE'
  const filtersStr = props.selectedFilters.map((filter) => (
    filter.id
  )).join(',')

  const { loading, error, data } = useQuery(GET_PHOTOS, {
    variables: {
      filters: filtersStr,
    }
  })

  if (loading) return <Spinner />
  if (error) return <p>Error :(</p>

  let photoSections = []
  let photos = []

  photos = data.allPhotos.edges.map((photo) => (
    {
      id: photo.node.id,
      thumbnail: `/thumbnails/256x256_cover_q50/${photo.node.id}/`,
      location: photo.node.location ? [photo.node.location.split(',')[0], photo.node.location.split(',')[1]] : null,
    }
  ))

  let section = {
    id: 12345,
    title: 'hello',
    segments: [
      {
        numPhotos: photos.length,
        photos: photos,
      }
    ]
  }

  photoSections.push(section)

  return <Browse
    selectedFilters={props.selectedFilters}
    mode={mode}
    loading={loading}
    error={error}
    photoSections={photoSections}
    onFilterToggle={props.onFilterToggle}
    onClearFilters={props.onClearFilters}
    expanded={expanded}
    onExpandCollapse={() => setExpanded(!expanded)}
  />
}

export default BrowseContainer
