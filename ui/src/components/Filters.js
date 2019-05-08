import React from 'react'

import ColorTags from './ColorTags'

import '../static/css/Filters.css'


const Filters = ({ data, onToggle, onScroll, onMouseDown, onTouchStart, containerRef, scrollbarHandleRef, displayScrollbar }) => (
  <section className="Filters" onScroll={onScroll} ref={containerRef}>
    <div className="FiltersContent">
      {
        data.map((group) => (
          <div className="FilterGroup" key={group.name}>
            <h2>{group.name}</h2>
            {
              group.name === 'Colors'
              ?
                <ColorTags tags={group.items.map((item) => {
                  item.onClick = () => onToggle(item.id, group.name, item.name)
                  return item
                })} />
              :
                group.items.map((item) => (
                  <li key={item.id} onClick={() => onToggle(item.id, group.name, item.name)}>{item.name}</li>
                ))
            }
          </div>
        ))
      }
      <div className="filterGradient"></div>
    </div>
    <div className="scrollbar" ref={scrollbarHandleRef} style={{opacity: displayScrollbar ? 1 : null}} onMouseDown={onMouseDown} onTouchStart={onTouchStart}></div>
  </section>
)

export default Filters
