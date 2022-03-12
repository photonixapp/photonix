import React, { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import styled from '@emotion/styled'
import useViewport from '../hooks/useViewport'
import { ReactComponent as SearchIcon } from '../static/images/search.svg'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { ReactComponent as ObjectsIcon } from '../static/images/label.svg'
import { ReactComponent as LocationsIcon } from '../static/images/location_on.svg'
import { ReactComponent as ColorsIcon } from '../static/images/color_lens.svg'
import { ReactComponent as StylesIcon } from '../static/images/style.svg'
import { ReactComponent as PeopleIcon } from '../static/images/person.svg'
import { ReactComponent as EventsIcon } from '../static/images/event.svg'
import { ReactComponent as CamerasIcon } from '../static/images/photo_camera.svg'
import { ReactComponent as StarIcon } from '../static/images/star_outline.svg'

const Container = styled('div')`
  position: relative;

  ul {
    position: relative;
    margin: -3px 0 0 0;
    padding: 0;
    list-style: none;
    padding: 0 25px 10px 35px;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  li.filter {
    background: #444;
    border-radius: 30px;
    margin: 3px 5px 3px 0;
    padding: 5px 8px 2px 15px;
    display: inline-block;
    font-size: 14px;
    svg.groupIcon {
      filter: invert(0.9);
      display: inline-block;
      margin: -3px 7px 0 -6px;
      vertical-align: middle;
    }
    svg.removeIcon {
      filter: invert(0.9);
      cursor: pointer;
      vertical-align: middle;
      margin: 0 0 3px 7px;
      opacity: 0.4;
    }
    svg.removeIcon:hover {
      opacity: 0.6;
    }
  }

  input {
    width: 100%;
    min-width: 100px;
    height: 30px;
    flex: 1;
    font-size: 20px;
    margin: 6px 0 4px 0;
    padding: 0 50px 2px 5px;
    background: none;
    border: 0;
    color: #fff;
    line-height: 1;
    caret-color: #888;
    &::placeholder {
      /* Chrome, Firefox, Opera, Safari 10.1+ */
      color: rgba(255, 255, 255, 0.6);
      opacity: 1; /* Firefox */
    }
  }

  svg.searchIcon {
    filter: invert(0.7);
    cursor: pointer;
    position: absolute;
    left: 5px;
    bottom: 17px;
  }
  svg.clearAll {
    filter: invert(0.7);
    cursor: pointer;
    position: absolute;
    right: 25px;
    bottom: 17px;
  }
  svg.clearAll:hover {
    opacity: 0.6;
  }

  ul.options {
    display: block;
    list-style: none;
    transition: width 0.3s;
    margin: auto;
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    padding: 0;
    background: #444;
    max-height: 300px;
    overflow-y: auto;
    z-index: 2;

    li {
      display: flex;
      margin: 0;
      padding: 10px;
      font-size: 14px;
      width: 100%;
      transition: 0.3s all;
      cursor: pointer;
      color: white;
      justify-content: space-between;
      align-items: center;
      svg {
        display: inline-block;
        vertical-align: middle;
        margin-right: 5px;
        filter: invert(0.9);
      }
      &:hover {
        background-color: #545454;
      }
      &.option-active {
        background-color: #545454;
      }
    }
  }

  .no-options {
    color: white;
  }
`

const GROUP_ICONS = {
  'Generic Tags': ObjectsIcon,
  Objects: ObjectsIcon,
  Locations: LocationsIcon,
  People: PeopleIcon,
  Colors: ColorsIcon,
  Styles: StylesIcon,
  Events: EventsIcon,
  Cameras: CamerasIcon,
  Lenses: CamerasIcon,
  Aperture: CamerasIcon,
  Exposure: CamerasIcon,
  'ISO Speed': CamerasIcon,
  'Focal Length': CamerasIcon,
  Flash: CamerasIcon,
  'Metering Mode': CamerasIcon,
  'Drive Mode': CamerasIcon,
  'Shooting Mode': CamerasIcon,
  Rating: StarIcon,
}

const BACKSPACE_KEY = 8
const TAB_KEY = 9
const ENTER_KEY = 13
const ESCAPE_KEY = 27
const UP_KEY = 38
const DOWN_KEY = 40

const SearchInput = ({
  selectedFilters,
  search,
  onFilterToggle,
  onClearFilters,
  onSearchTextChange,
  filters,
  minHeightChanged,
  mode,
}) => {
  const [activeOption, setActiveOption] = useState(0)
  const [filteredOptions, setFilteredOptions] = useState([])
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState([])
  const container = useRef()
  const input = useRef()
  const { width: viewportWidth } = useViewport()

  const prepareOptions = useCallback(() => {
    let searchOptions = []
    filters.map((f) => {
      f.items.map((i) => {
        i['type'] = f.name
        searchOptions.push(i)
        return i
      })
      return f
    })
    setOptions(searchOptions)
  }, [filters, setOptions])

  useEffect(() => {
    if (filters.length) prepareOptions()
  }, [filters, prepareOptions])

  useEffect(() => {
    minHeightChanged(container.current.offsetHeight + 5)
  }, [search, selectedFilters, viewportWidth, minHeightChanged])
  const handleOnChange = (e) => {
    onSearchTextChange(e.target.value)
    const userInput = e.currentTarget.value
    if (mode !== 'ALBUMS') {
      const filteredOptions = options.filter(
        (optionName) =>
          optionName.name.toLowerCase().indexOf(userInput.toLowerCase()) > -1
      )
      setActiveOption(0)
      setFilteredOptions(filteredOptions)
      setShowOptions(true)
    }
  }

  const onKeyDown = (e) => {
    if (e.keyCode === ENTER_KEY || e.keyCode === TAB_KEY) {
      e.preventDefault()
      if (showOptions) {
        onSearchTextChange('')
        setActiveOption(0)
        setShowOptions(false)
        filteredOptions[activeOption] &&
          onFilterToggle(
            filteredOptions[activeOption].id,
            filteredOptions[activeOption].type,
            filteredOptions[activeOption].name
          )
      }
    } else if (e.keyCode === BACKSPACE_KEY) {
      search.length === 0 &&
        selectedFilters.length > 0 &&
        onFilterToggle(selectedFilters[selectedFilters.length - 1].id)
      focusInput()
    } else if (e.keyCode === ESCAPE_KEY) {
      showOptions && setShowOptions(false)
    } else if (e.keyCode === UP_KEY) {
      if (activeOption === 0) return
      setActiveOption(activeOption - 1)
    } else if (e.keyCode === DOWN_KEY) {
      if (activeOption === filteredOptions.length - 1) return
      setActiveOption(activeOption + 1)
    }
  }

  const handleOnClick = (index) => {
    onSearchTextChange('')
    setActiveOption(0)
    setFilteredOptions([])
    setShowOptions(false)
    onFilterToggle(
      filteredOptions[index].id,
      filteredOptions[index].type,
      filteredOptions[index].name
    )
    focusInput()
  }

  const focusInput = () => {
    input.current.focus()
  }

  let optionList = null
  if (showOptions && search) {
    if (filteredOptions.length) {
      optionList = (
        <ul className="options">
          {filteredOptions.map((opt, index) => {
            let className
            if (index === activeOption) className = 'option-active'

            let icon = React.createElement(GROUP_ICONS[opt.type], {
              className: 'groupIcon',
              alt: opt.group,
            })
            return (
              <li
                tabIndex={index}
                className={className}
                key={opt.id}
                onClick={() => handleOnClick(index)}
              >
                <div>
                  {icon}
                  {opt.name}
                </div>
                {opt.type}
              </li>
            )
          })}
        </ul>
      )
    }
  }

  const hasContent = search || selectedFilters.length > 0
  const showSearchIcon = !hasContent || window.innerWidth > 700

  useEffect(() => {
    if (mode === 'ALBUMS') setShowOptions(false)
  }, [mode])

  return (
    <Container ref={container}>
      <ul style={{ paddingLeft: !showSearchIcon ? 0 : null }}>
        {selectedFilters.map((filter) => {
          let icon = ObjectsIcon
          if (GROUP_ICONS[filter.group]) {
            icon = GROUP_ICONS[filter.group]
          }
          icon = React.createElement(icon, {
            className: 'groupIcon',
            alt: filter.group,
          })
          return (
            <li className="filter" key={filter.id}>
              {icon}
              {filter.name}
              <span onClick={() => onFilterToggle(filter.id)}>
                <CloseIcon className="removeIcon" alt="Remove" />
              </span>
            </li>
          )
        })}
        <input
          type="text"
          value={search}
          onChange={handleOnChange}
          onKeyDown={onKeyDown}
          ref={input}
        />
        {optionList}
      </ul>

      {showSearchIcon && (
        <SearchIcon className="searchIcon" onClick={focusInput} />
      )}
      {hasContent && (
        <CloseIcon className="clearAll" onClick={onClearFilters} />
      )}
    </Container>
  )
}

SearchInput.propTypes = {
  selectedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      group: PropTypes.string,
    })
  ),
  search: PropTypes.string,
  onFilterToggle: PropTypes.func,
  onClearFilters: PropTypes.func,
  onSearchTextChange: PropTypes.func,
}

export default SearchInput
