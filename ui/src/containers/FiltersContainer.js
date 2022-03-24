import React, { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { useSelector } from 'react-redux'
import gql from 'graphql-tag'
import Filters from '../components/Filters'
import Spinner from '../components/Spinner'
import { getActiveLibrary } from '../stores/libraries/selector'
import { isTagUpdated } from '../stores/tag/selector'

const GET_FILTERS = gql`
  query AllFilters($libraryId: UUID, $multiFilter: String) {
    allLocationTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
      parent {
        id
      }
    }
    allObjectTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allPersonTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allColorTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allStyleTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allEventTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allCameras(libraryId: $libraryId) {
      id
      make
      model
    }
    allLenses(libraryId: $libraryId) {
      id
      name
    }
    allGenericTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      name
      id
    }
    allApertures(libraryId: $libraryId)
    allExposures(libraryId: $libraryId)
    allIsoSpeeds(libraryId: $libraryId)
    allFocalLengths(libraryId: $libraryId)
    allMeteringModes(libraryId: $libraryId)
    allDriveModes(libraryId: $libraryId)
    allShootingModes(libraryId: $libraryId)
  }
`

function createFilterSelection(sectionName, data, prefix = 'tag') {
  return {
    name: sectionName,
    items: data.map((tag) => {
      let item = {
        id: prefix + ':' + tag,
        name: tag,
      }
      if (tag.toString() === '[object Object]') {
        item.name = tag.name
        item.id = prefix + ':' + tag.id
        item.parent = tag.parent ? prefix + ':' + tag.parent.id : null
      }
      return item
    }),
  }
}

const REMOVABLE_TAGS = [
  'Aperture',
  'Exposure',
  'ISO Speed',
  'Focal Length',
  'Rating',
  'Flash',
]

const FiltersContainer = ({
  selectedFilters,
  onFilterToggle,
  searchAreaExpand,
  setFilters,
}) => {
  const user = useSelector((state) => state.user) // Using user here from Redux store so we can wait for any JWT tokens to be refreshed before running GraphQL queries that require authentication
  const [isFiltersAvail, setIsFiltersAvail] = useState(false)
  const activeLibrary = useSelector(getActiveLibrary)
  let filterData = []
  const tagUpdated = useSelector(isTagUpdated)
  let filtersStr = ''
  if (activeLibrary) {
    filtersStr = `${selectedFilters.map((filter) => filter.id).join(' ')}`
  }

  let variables = {}
  variables = { libraryId: activeLibrary?.id, multiFilter: filtersStr }
  const { loading, error, data, refetch } = useQuery(
    GET_FILTERS,
    {
      variables: variables,
    },
    { skip: !user }
  )

  useEffect(() => {
    refetch()
  }, [activeLibrary, refetch, tagUpdated])

  useEffect(() => {
    if (isFiltersAvail && filterData.length) {
      const autoSuggestionFilters = filterData.filter((f) => {
        return REMOVABLE_TAGS.indexOf(f.name) === -1
      })
      setFilters(autoSuggestionFilters)
    } // eslint-disable-next-line
  }, [isFiltersAvail, setFilters])

  const getFilterdData = (type, array) => {
    const filterArr = selectedFilters.filter((s) => s.group === type)
    let data = []
    if (type === 'Locations' && filterArr.length > 0) {
      const id = array.filter((c) =>
        filterArr.find((rm) => rm.name === c.name)
      )[0].id
      data = array.filter((c) => !filterArr.find((rm) => rm.name === c.name))
      data = data.filter((d) => d?.parent?.id !== id)
    } else {
      data = array.filter((c) => !filterArr.find((rm) => rm.name === c.name))
    }
    return data
  }
  if (loading) return <Spinner />
  if (error) return `Error! ${error.message}`

  if (data) {
    if (data.allGenericTags.length) {
      filterData.push(
        createFilterSelection('Generic Tags', data.allGenericTags)
      )
    }
    if (data.allObjectTags.length) {
      const objectsTags = getFilterdData('Objects', data.allObjectTags)
      filterData.push(createFilterSelection('Objects', objectsTags))
    }
    if (data.allLocationTags.length) {
      const locationsTags = getFilterdData('Locations', data.allLocationTags)
      filterData.push(createFilterSelection('Locations', locationsTags))
    }
    if (data.allColorTags.length) {
      const colorsTags = getFilterdData('Colors', data.allColorTags)
      filterData.push(createFilterSelection('Colors', colorsTags))
    }
    if (data.allStyleTags.length) {
      const stylesTags = getFilterdData('Styles', data.allStyleTags)
      filterData.push(createFilterSelection('Styles', stylesTags))
    }
    if (data.allEventTags.length) {
      const eventsTags = getFilterdData('Events', data.allEventTags)
      filterData.push(createFilterSelection('Events', eventsTags))
    }
    if (data.allPersonTags.length) {
      const peopleTags = getFilterdData('People', data.allPersonTags)
      filterData.push(createFilterSelection('People', peopleTags))
    }
    if (data.allCameras.length) {
      filterData.push({
        name: 'Cameras',
        items: data.allCameras.map((camera) => ({
          id: 'camera:' + camera.id,
          name: `${camera.make} ${camera.model}`,
        })),
      })
    }
    if (data.allLenses.length) {
      filterData.push(createFilterSelection('Lenses', data.allLenses, 'lens'))
    }
    if (data.allApertures.length) {
      filterData.push(
        createFilterSelection('Aperture', data.allApertures, 'aperture')
      )
    }
    if (data.allExposures.length) {
      filterData.push(
        createFilterSelection('Exposure', data.allExposures, 'exposure')
      )
    }
    if (data.allIsoSpeeds.length) {
      filterData.push(
        createFilterSelection('ISO Speed', data.allIsoSpeeds, 'isoSpeed')
      )
    }
    if (data.allFocalLengths.length) {
      filterData.push(
        createFilterSelection(
          'Focal Length',
          data.allFocalLengths,
          'focalLength'
        )
      )
    }
    filterData.push({
      name: 'Rating',
      items: [
        { id: 'rating:1', name: 1 },
        { id: 'rating:2', name: 2 },
        { id: 'rating:3', name: 3 },
        { id: 'rating:4', name: 4 },
        { id: 'rating:5', name: 5 },
      ],
    })
    filterData.push({
      name: 'Flash',
      items: [
        { id: 'flash:on', name: 'On' },
        { id: 'flash:off', name: 'Off' },
      ],
    })
    if (data.allMeteringModes.length) {
      filterData.push(
        createFilterSelection(
          'Metering Mode',
          data.allMeteringModes,
          'meeteringMode'
        )
      )
    }
    if (data.allDriveModes.length) {
      filterData.push(
        createFilterSelection('Drive Mode', data.allDriveModes, 'driveMode')
      )
    }
    if (data.allShootingModes.length) {
      filterData.push(
        createFilterSelection(
          'Shooting Mode',
          data.allShootingModes,
          'shootingMode'
        )
      )
    }
    if (!isFiltersAvail) setIsFiltersAvail(true)
  }

  return (
    <Filters
      data={filterData}
      searchAreaExpand={searchAreaExpand}
      selectedFilters={selectedFilters}
      onToggle={onFilterToggle}
    />
  )
}

export default FiltersContainer
