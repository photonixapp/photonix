import React, { Component } from 'react'

export class Handle extends Component {
  state = {
    showTooltip: false,
  }

  floatToVal = (available, selected) => {
    const pos = selected * 10
    return available[pos]
  }

  render() {
    const {
      domain: [min, max],
      handle: { id, value, percent },
      getHandleProps,
      listedItems,
    } = this.props
    const { showTooltip } = this.state
    const values = this.floatToVal(listedItems, Number(value.toFixed(1)))

    return (
      <>
        {showTooltip ? (
          <div
            style={{
              left: `${percent}%`,
              position: 'absolute',
              marginLeft: '-1px',
              marginTop: '45px',
            }}
          >
            <div className="tooltip">
              <span className="tooltiptext">{values}</span>
            </div>
          </div>
        ) : null}
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={values}
          style={{
            left: `${percent}%`,
            position: 'absolute',
            marginLeft: '-6px',
            marginTop: '-6px',
            zIndex: 2,
            width: 20,
            height: 20,
            cursor: 'col-resize',
            borderRadius: '50%',
            backgroundColor: '#ddd',
          }}
          {...getHandleProps(id, {
            onMouseLeave: () => {
              this.setState({
                showTooltip: false,
              })
            },
            onMouseOver: () => {
              this.setState({
                showTooltip: true,
              })
            },
          })}
        />
      </>
    )
  }
}

export function Track({ source, target, getTrackProps }) {
  return (
    <div
      style={{
        position: 'absolute',
        height: 8,
        zIndex: 1,
        backgroundColor: '#aaa',
        borderRadius: 4,
        cursor: 'pointer',
        left: `${source.percent}%`,
        width: `${target.percent - source.percent}%`,
      }}
      {...getTrackProps()}
    />
  )
}
