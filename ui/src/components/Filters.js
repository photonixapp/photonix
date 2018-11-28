import React from 'react'
import '../static/css/Filters.css'

const Filters = ({ data, onToggle }) => (
  <section className="Filters">
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
                  return <li key={item.id} className={className} onClick={() => onToggle(item.id)}>{item.name}</li>
                })
              }
            </ul>
          </div>
        ))
      }
    </div>
  </section>
)

export default Filters
