import React, { Component } from "react";
export class Handle extends Component {
  state = {
    showTooltip: false
  };

  floatToVal = (available, selected) => {
    const pos = selected * 10;
    return available[pos];
  }
  
  render() {
    const {
      domain: [min, max],
      handle: { id, value, percent },
      getHandleProps,
      from,
      listedItems
    } = this.props;
    const { showTooltip } = this.state;
    const values = this.floatToVal(listedItems,value)
    return (
      <React.Fragment>
        {showTooltip ? (
          <div
            style={{
              left: `${percent}%`,
              position: "absolute",
              marginLeft: "-11px",
              marginTop: "40px"
            }}
          >
            <div className="tooltip">
              <span className="tooltiptext">Value: {values}</span>
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
            position: "absolute",
            marginLeft: "-11px",
            marginTop: "-9px",
            zIndex: 2,
            width: 24,
            height: 24,
            cursor: "pointer",
            borderRadius: "50%",
            boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.4)",
            backgroundColor: "darkgray"
          }}
          {...getHandleProps(id, {
            onMouseLeave: () => {
              this.setState({
                showTooltip: false
              });
            },
            onMouseOver: () => {
              this.setState({
                showTooltip: true
              });
            }
          })}
        />
      </React.Fragment>
    );
  }
}


export function Track({ source, target, getTrackProps }) {
    return (
      <div
        style={{
          position: "absolute",
          height: 8,
          zIndex: 1,
          backgroundColor: "darkgrey",
          borderRadius: 4,
          cursor: "pointer",
          left: `${source.percent}%`,
          width: `${target.percent - source.percent}%`
        }}
        {...getTrackProps()}
      />
    );
  }
