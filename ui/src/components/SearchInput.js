import React from 'react'
import '../static/css/SearchInput.css'
import closeIcon from '../static/images/close.svg'
import objectsIcon from '../static/images/label.svg'
import locationsIcon from '../static/images/location_on.svg'
import colorsIcon from '../static/images/color_lens.svg'
import stylesIcon from '../static/images/style.svg'
import camerasIcon from '../static/images/photo_camera.svg'

const GROUP_ICONS = {
  'Objects':        objectsIcon,
  'Locations':      locationsIcon,
  'Colors':         colorsIcon,
  'Styles':         stylesIcon,
  'Cameras':        camerasIcon,
  'Lenses':         camerasIcon,
  'Aperture':       camerasIcon,
  'Exposure':       camerasIcon,
  'ISO Speed':      camerasIcon,
  'Focal Length':   camerasIcon,
  'Flash':          camerasIcon,
  'Metering Mode':  camerasIcon,
  'Drive Mode':     camerasIcon,
  'Shooting Mode':  camerasIcon,
}

const SearchInput = ({ selectedFilters, onFilterToggle }) => {
  return (
    <div className="SearchInput">
      <ul>
        {
          selectedFilters.map((filter) => (
            <li className="filter" key={filter.id}>
              {/* <span className={`group group-` + filter.group} /> */}
              <img className="groupIcon" src={GROUP_ICONS[filter.group]} alt={filter.group} />
              {filter.name}
              <span onClick={() => onFilterToggle(filter.id)}>
                <img className="removeIcon" src={closeIcon} alt="Remove" />
              </span>
            </li>
          ))
        }
      </ul>
      <input type="text" placeholder="Search" defaultValue="" />
    </div>
  )
}

export default SearchInput
