import React,{useState} from 'react'

import ColorTags from './ColorTags'
import HierarchicalTagsContainer from '../containers/HierarchicalTagsContainer'
import ScrollArea from './ScrollArea'
import { Slider, Rail, Handles, Tracks } from 'react-compound-slider'
import { Handle, Track, Tick } from "./Slider"; 
import '../static/css/Filters.css'

const sliderStyle = {
  position: "relative",
  width: "90%",
  marginLeft: '12px'
};

const railStyle = {
  position: "absolute",
  width: "100%",
  height: 8,
  borderRadius: 4,
  cursor: "pointer",
  backgroundColor: "rgb(100,100,100)"
};
const Filters = ({ data, onToggle }) => {
  function floatToVal(available, selected) {
    const pos = selected * 10
    return available[pos]
  }

  function setValue (e,group,listedItems) {
    let id = group.items[0].id.slice(0, group.items[0].id.indexOf(":"))
    let groupName = group.name
    let minValue = floatToVal(listedItems,e[0])
    let maxValue = floatToVal(listedItems,e[1].toFixed(1))
    let number = `${minValue}-${maxValue}`
    if(group.name === "Exposure") {
      const max = (e[1]*10) + 1
      let selectedexposure = listedItems.slice(e[0],max)
      const exposureList = selectedexposure.join("-");
      let exposureId = `${id}:${exposureList}`
      onToggle(exposureId, groupName,number)
    } else {
      let mainId = `${id}:${minValue}-${maxValue}`
      onToggle(mainId, groupName,number)
    }
   
  }
  return (
    <ScrollArea>
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
              items = <HierarchicalTagsContainer tags={group.items.map((item) => {
                item.onClick = () => onToggle(item.id, group.name, item.name)
                return item
              })} />
            }

            else if(group.name === 'ISO Speed' || group.name === 'Focal Length' || group.name === "Aperture" || group.name === "Exposure") {
              const listedItems = group.items.map(item => {
                return item.name
              })
              const domain = [0, (listedItems.length-1)/10];
              const defaultValues = [0,0.1];
              items =<div>
              <Slider
                mode={2}
                step={0.1}
                domain={domain}
                rootStyle={sliderStyle}
                onChange={(e) =>setValue(e,group,listedItems)}
                values={defaultValues}
              >
                <Rail>
                  {({ getRailProps }) => (
                    <div style={railStyle} {...getRailProps()} />
                  )}
                </Rail>
                <Handles>
                  {({ handles, getHandleProps }) => (
                    <div className="slider-handles">
                      {handles.map(handle => (
                        <Handle
                          key={handle.id}
                          handle={handle}
                          domain={domain}
                          getHandleProps={getHandleProps}
                          from={group}
                          listedItems={listedItems}
                        />
                      ))}
                    </div>
                  )}
                </Handles>
                <Tracks left={false} right={false}>
                  {({ tracks, getTrackProps }) => (
                    <div className="slider-tracks">
                      {tracks.map(({ id, source, target }) => (
                        <Track
                          key={id}
                          source={source}
                          target={target}
                          getTrackProps={getTrackProps}
                        />
                      ))}
                    </div>
                  )}
                </Tracks>
              </Slider>
            </div>
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
    </ScrollArea>
  )
}

export default Filters