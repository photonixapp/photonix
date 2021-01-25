import React, {useState} from 'react'
import '../static/css/SearchInput.css'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'
import { ReactComponent as ObjectsIcon } from '../static/images/label.svg'
import { ReactComponent as LocationsIcon} from '../static/images/location_on.svg'
import { ReactComponent as ColorsIcon } from '../static/images/color_lens.svg'
import { ReactComponent as StylesIcon } from '../static/images/style.svg'
import { ReactComponent as CamerasIcon } from '../static/images/photo_camera.svg'
import { ReactComponent as StarIcon } from '../static/images/star_outline.svg'

const GROUP_ICONS = {
  'Objects':        ObjectsIcon,
  'Generic Tags':   ObjectsIcon,
  'Locations':      LocationsIcon,
  'Colors':         ColorsIcon,
  'Styles':         StylesIcon,
  'Cameras':        CamerasIcon,
  'Lenses':         CamerasIcon,
  'Aperture':       CamerasIcon,
  'Exposure':       CamerasIcon,
  'ISO Speed':      CamerasIcon,
  'Focal Length':   CamerasIcon,
  'Flash':          CamerasIcon,
  'Metering Mode':  CamerasIcon,
  'Drive Mode':     CamerasIcon,
  'Shooting Mode':  CamerasIcon,
  'Rating':         StarIcon
}

const SearchInput = ({ selectedFilters, onFilterToggle, onClearFilters, search, updateSearchText }) => {

  return (
    <div className="SearchInput">
      <ul>
        {
          selectedFilters.map((filter) => {
            let icon = React.createElement(
              GROUP_ICONS[filter.group],
              {className: 'groupIcon', alt: filter.group}
            )
            return (
              <li className="filter" key={filter.id}>
                {icon}
                {filter.name}
                <span onClick={() => onFilterToggle(filter.id)}>
                  <CloseIcon className="removeIcon" alt="Remove" />
                </span>
              </li>
            )
          })
        }
        <input type="text" placeholder="Search" value={search} onChange={updateSearchText} />
      </ul>
      <CloseIcon className="clearAll" onClick={onClearFilters} />
    </div>
  )
}

export default SearchInput
