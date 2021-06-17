import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import '../static/css/SearchInput.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { ReactComponent as ObjectsIcon } from '../static/images/label.svg'
import { ReactComponent as LocationsIcon } from '../static/images/location_on.svg'
import { ReactComponent as ColorsIcon } from '../static/images/color_lens.svg'
import { ReactComponent as StylesIcon } from '../static/images/style.svg'
import { ReactComponent as CamerasIcon } from '../static/images/photo_camera.svg'
import { ReactComponent as StarIcon } from '../static/images/star_outline.svg'

const GROUP_ICONS = {
  'Generic Tags': ObjectsIcon,
  Objects: ObjectsIcon,
  Locations: LocationsIcon,
  Colors: ColorsIcon,
  Styles: StylesIcon,
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

const SearchInput = ({
  selectedFilters,
  search,
  onFilterToggle,
  onClearFilters,
  onSearchTextChange,
  filters
}) => {
  const [activeOption, setActiveOption] = useState(0)
  const [filteredOptions, setFilteredOptions] = useState([])
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState([])

  const prepareOptions = () => {
    let searchOptions = []
    filters.map(f => {
      f.items.map(i => {
        i['type'] = f.name
        searchOptions.push(i)
        return i
      })
      return f
    })
    setOptions(searchOptions)
  }
  useEffect(() => {
    if (filters.length) prepareOptions()
  }, [filters])

  const handleOnChange = (e) => {
    onSearchTextChange(e.target.value)
    const userInput = e.currentTarget.value
    const filteredOptions = options.filter(
      (optionName) =>
        optionName.name.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    )
    setActiveOption(0)
    setFilteredOptions(filteredOptions)
    setShowOptions(true)
  }

  const onKeyDown = (e) => {
    if (e.keyCode === 13) {
      // onSearchTextChange(filteredOptions[activeOption].name)
      onSearchTextChange('')
      setActiveOption(0)
      setShowOptions(false)
      onFilterToggle(
        filteredOptions[activeOption].id,
        filteredOptions[activeOption].type,
        filteredOptions[activeOption].name
      )
    } else if (e.keyCode === 38) {
      if (activeOption === 0) return
      setActiveOption(activeOption - 1)
    } else if (e.keyCode === 40) {
      if (activeOption === filteredOptions.length - 1) return
      setActiveOption(activeOption + 1)
    }
  }

  const handleOnClick = (index) => {
    setActiveOption(0)
    setFilteredOptions([])
    setShowOptions(false)
    // onSearchTextChange(filteredOptions[index].name)
    onSearchTextChange('')
    onFilterToggle(
      filteredOptions[index].id,
      filteredOptions[index].type,
      filteredOptions[index].name
    )
  }

  let optionList;
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
              <li tabIndex={index} className={className} key={opt.id} onClick={() => handleOnClick(index)}>
                <div>{icon}{opt.name}</div>{opt.type}
              </li>
            );
          })}
        </ul>
      );
    } else {
      optionList = (
        <div className="no-options">
          <em>No Option!</em>
        </div>
      );
    }
  }

  return (
    <div className="SearchInput">
      <ul style={{position: 'relative'}}>
        {selectedFilters.map((filter) => {
          let icon = React.createElement(GROUP_ICONS[filter.group], {
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
          placeholder="Search"
          value={search}
          onChange={handleOnChange}
          onKeyDown={onKeyDown}
        />
        {optionList}
      </ul>
      <CloseIcon className="clearAll" onClick={onClearFilters} />
    </div>
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
