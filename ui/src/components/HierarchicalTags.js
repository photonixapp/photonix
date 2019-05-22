import React from 'react'

import { ReactComponent as AddIcon } from '../static/images/add.svg'
import { ReactComponent as RemoveIcon } from '../static/images/remove.svg'
import '../static/css/HierarchicalTags.css'


function displayChildren(items, expandedTags, onToggleExpand) {
  return items.map((item) => {
    let foundIndex = -1
    if (expandedTags) {
      foundIndex = expandedTags.indexOf(item.id)
    }

    let mainEl = <li key={item.id} title={item.name} onClick={item.onClick}>{item.name}</li>
    if (item.expandable) {
      let icon = <AddIcon alt="Expand" onClick={(e) => onToggleExpand(e, item.id)} />
      let classes = "expandable"
      if (foundIndex > -1) {
        icon = <RemoveIcon alt="Expand" onClick={(e) => onToggleExpand(e, item.id)} />
        classes += ' newline'
      }
      mainEl = <li key={item.id} title={item.name} onClick={item.onClick} className={classes}>{icon}{item.name}</li>
    }
    let childrenEl = null

    if (item.children && foundIndex > -1) {
      childrenEl = (
        <ul className="children">
          {displayChildren(item.children)}
        </ul>
      )
    }

    return (
      <span key={item.id}>
        {mainEl}
        {childrenEl}
      </span>
    )
  })
}


const HierarchicalTags = ({ tags, expandedTags, onToggleExpand }) => (
  <ul className="HierarchicalTags">
    {displayChildren(tags, expandedTags, onToggleExpand)}
  </ul>
)

export default HierarchicalTags
