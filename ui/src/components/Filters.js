import React from 'react'
import '../static/css/Filters.css'


const Filters = ({ data, onToggle, onScroll, onMouseDown, onTouchStart, containerRef, scrollbarHandleRef, displayScrollbar }) => (
  <section className="Filters" onScroll={onScroll} ref={containerRef}>
    <div className="FiltersContent">
      {
        data.map((group) => (
          <div className="FilterGroup" key={group.name}>
            <h2>{group.name}</h2>
            <ul>
              {
                group.items.map((item) => {
                  let className = ''
                  if (group.name === 'Colors') {
                    className = `Color ${item.name.replace(/ /g, '')}`
                  }
                  return <li key={item.id} className={className} onClick={() => onToggle(item.id)} title={group.name === 'Colors' ? item.name : ''}>{item.name}</li>
                })
              }
            </ul>
          </div>
        ))
      }
    </div>
    <div className="scrollbar" ref={scrollbarHandleRef} style={{opacity: displayScrollbar ? 1 : null}} onMouseDown={onMouseDown} onTouchStart={onTouchStart}></div>
  </section>
)

export default Filters
