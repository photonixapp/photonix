import React, { useState, useEffect } from 'react'

import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import ScrollArea from './ScrollArea'
import { Slider, Rail, Handles, Tracks } from 'react-compound-slider'
import { Handle, Track } from './Slider'
import '../static/css/Filters.css'

const sliderStyle = {
  position: 'relative',
  width: '91.5%',
  marginLeft: '6px',
}

const railStyle = {
  position: 'absolute',
  width: '100%',
  height: 8,
  borderRadius: 4,
  cursor: 'pointer',
  backgroundColor: '#444',
}

const Filters = ({ data, selectedFilters, onToggle, searchAreaExpand }) => {
  const [values, setValues] = useState({
    'ISO Speed': [],
    'Focal Length': [],
    Aperture: [],
    Exposure: [],
    Rating: [],
  })
  const [isDomainAvail, setIsDomainAvail] = useState(false)
  useEffect(() => {
    const vals = []
    data.map((group) => {
      const domain = [0, (group.items.length - 1) / 10]
      vals[group.name] = domain
      return group
    })
    setValues(vals)
    setIsDomainAvail(true)
  }, [data])

  useEffect(() => {
    if (isDomainAvail) {
      const fields = [
        'ISO Speed',
        'Focal Length',
        'Aperture',
        'Exposure',
        'Rating',
      ]
      fields.forEach((f) => {
        const fieldPresent = selectedFilters.filter((g) => g.group === f)
        if (fieldPresent.length === 0) {
          const group = data.filter((d) => d.name === f)[0]
          const value = [0, (group?.items.length - 1) / 10]
          values[group?.name] = value
        }
      })
      setValues(values)
    }
  }, [isDomainAvail, values, selectedFilters, data])

  function floatToVal(available, selected) {
    const pos = selected * 10
    return available[pos]
  }

  function setValue(e, group, listedItems) {
    if (e.length === 0) return
    let id = group.items[0].id.slice(0, group.items[0].id.indexOf(':'))
    let groupName = group.name
    const min = Number(e[0].toFixed(1))
    const max = Number(e[1].toFixed(1))
    values[groupName] = [min, max]
    setValues(values)
    let minValue = floatToVal(listedItems, min)
    let maxValue = floatToVal(listedItems, max)
    let number = `${minValue}-${maxValue}`
    if (minValue !== undefined && maxValue !== undefined) {
      if (group.name === 'Exposure') {
        const end = max * 10 + 1
        const start = min * 10
        let selectedexposure = listedItems.slice(start, end)
        const exposureList = selectedexposure.join('-')
        let exposureId = `${id}:${exposureList}`
        if (
          selectedFilters.filter((item) => item.id === exposureId).length === 0
        ) {
          onToggle(exposureId, groupName, number)
        }
      } else {
        let mainId = `${id}:${minValue}-${maxValue}`
        if (selectedFilters.filter((item) => item.id === mainId).length === 0) {
          onToggle(mainId, groupName, number)
        }
      }
    }
  }
  function showTagSection(items, groupName) {
    if (groupName === 'Locations' || groupName === 'Colors') {
      return items && items.props.tags.length !== 0
    }
    return items && Object.keys(items).length !== 0
  }
  return (
    <ScrollArea>
      {isDomainAvail && (
        <div
          className={`FiltersContent ${
            !localStorage.getItem('filtersPeeked') &&
            searchAreaExpand &&
            'PeekAnimation'
          }`}
        >
          {data.map((group) => {
            let items = ''
            let filterGroupExtraStyles = {}

            if (group.name === 'Colors') {
              items = (
                <ColorTags
                  tags={group.items.map((item) => {
                    item.onClick = () =>
                      onToggle(item.id, group.name, item.name)
                    return item
                  })}
                />
              )
            } else if (group.name === 'Locations') {
              items = (
                <HierarchicalTagsContainer
                  tags={group.items.map((item) => {
                    item.onClick = () =>
                      onToggle(item.id, group.name, item.name)
                    return item
                  })}
                />
              )
            } else if (
              group.name === 'ISO Speed' ||
              group.name === 'Focal Length' ||
              group.name === 'Aperture' ||
              group.name === 'Exposure' ||
              group.name === 'Rating'
            ) {
              if (!values[group.name]) return []
              const listedItems = group.items.map((item) => {
                return item.name
              })
              const domain = [0, (listedItems.length - 1) / 10]
              filterGroupExtraStyles = { overflow: 'unset' } // Tooltips need this or they get cut off at the edges
              items = (
                <div>
                  <Slider
                    mode={2}
                    step={0.1}
                    domain={domain}
                    rootStyle={sliderStyle}
                    onChange={(e) => setValue(e, group, listedItems)}
                    values={values[group.name]}
                  >
                    <Rail>
                      {({ getRailProps }) => (
                        <div style={railStyle} {...getRailProps()} />
                      )}
                    </Rail>
                    <Handles>
                      {({ handles, getHandleProps }) => (
                        <div className="slider-handles">
                          {handles.map((handle) => (
                            <Handle
                              key={handle.id}
                              handle={handle}
                              domain={domain}
                              getHandleProps={getHandleProps}
                              from={group}
                              listedItems={listedItems}
                              style={{ height: 10 }}
                            />
                          ))}
                        </div>
                      )}
                    </Handles>
                    <Tracks left={false} right={false}>
                      {({ tracks, getTrackProps }) => (
                        <div className="slider-tracks">
                          {tracks.map(({ id, source, target }) => (
                            <Track
                              key={id}
                              source={source}
                              target={target}
                              getTrackProps={getTrackProps}
                            />
                          ))}
                        </div>
                      )}
                    </Tracks>
                  </Slider>
                </div>
              )
            } else {
              items = group.items.map((item) => {
                if (item.id) {
                  return (
                    <li
                      key={item.id}
                      onClick={() => onToggle(item.id, group.name, item.name)}
                    >
                      {item.name}
                    </li>
                  )
                } else {
                  return (
                    <li
                      key={item}
                      onClick={() => onToggle(item, group.name, item)}
                    >
                      {item}
                    </li>
                  )
                }
              })
            }
            return (
              <span key={group.name}>
                {showTagSection(items, group.name) && (
                  <div className="FilterGroup" style={filterGroupExtraStyles}>
                    <h2>{group.name}</h2>
                    {items}
                  </div>
                )}
              </span>
            )
          })}
        </div>
      )}
    </ScrollArea>
  )
}

export default Filters
