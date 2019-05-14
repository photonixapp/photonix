import React from 'react'

import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'

import '../static/css/Filters.css'


const Filters = ({ data, onToggle, onScroll, onMouseDown, onTouchStart, containerRef, scrollbarHandleRef, displayScrollbar }) => {
  return (
    <section className="Filters" onScroll={onScroll} ref={containerRef}>
      <div className="FiltersContent">
        {
          data.map((group) => {
            let items = ''

            if (group.name === 'Colors') {
              items = <ColorTags tags={group.items.map((item) => {
                item.onClick = () => onToggle(item.id, group.name, item.name)
                return item
              })} />
            }

            else if (group.name === 'Locations') {
              items = <HierarchicalTagsContainer tags={group.items} />
            }

            else {
              items = group.items.map((item) => {
                if (item.id) {
                  return <li key={item.id} onClick={() => onToggle(item.id, group.name, item.name)}>{item.name}</li>
                }
                else {
                  return <li key={item} onClick={() => onToggle(item, group.name, item)}>{item}</li>
                }
              })
            }

            return (
              <div className="FilterGroup" key={group.name}>
                <h2>{group.name}</h2>
                {items}
              </div>
            )
          })
        }
        <div className="filterGradient"></div>
      </div>
      <div className="scrollbar" ref={scrollbarHandleRef} style={{opacity: displayScrollbar ? 1 : null}} onMouseDown={onMouseDown} onTouchStart={onTouchStart}></div>
    </section>
  )
}

export default Filters
