import React, { useState, useEffect } from 'react'
import styled from '@emotion/styled'
import useLocalStorageState from 'use-local-storage-state'

const Chart = styled('div')`
  position: relative;
  width: 100%;
  height: 150px;
  cursor: pointer;
  border: 1px solid #888;
  background: #1b1b1b;
  background-image: repeating-linear-gradient(
      rgba(255, 255, 255, 0.05) 0 1px,
      transparent 2px 100%
    ),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0 1px,
      transparent 2px 100%
    );
  background-size: 25% 25%;
  background-position: bottom right;
`
const Bars = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  mix-blend-mode: difference;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  span {
    flex: 1;
    width: 1px;
    background: #fff;
    display: inline-block;
  }
  &.red span {
    background: #f00;
  }
  &.green span {
    background: #0f0;
  }
  &.blue span {
    background: #00f;
  }
`

let rVals = null
let gVals = null
let bVals = null
let multiChannelMax = 0
let singleChannelMax = 0

let canvas = document.createElement('canvas')
let ctx = canvas.getContext('2d')

let image = null

const initArray = (defaultVal) => {
  let arr = []
  for (let i = 0; i < 256; i++) {
    arr[i] = defaultVal
  }
  return arr
}

const drawImageToCanvas = () => {
  canvas.width = image.width
  canvas.height = image.height
  ctx.drawImage(image, 0, 0)
}

const eachPixel = (r, g, b) => {
  rVals[r]++
  gVals[g]++
  bVals[b]++
}

const collectRgbVals = (pixels) => {
  for (let i = 0; i < pixels.length / 4; i++) {
    eachPixel(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2])
  }
}

const calcMax = () => {
  let rMax = Math.max.apply(null, rVals)
  let gMax = Math.max.apply(null, gVals)
  let bMax = Math.max.apply(null, bVals)
  multiChannelMax = Math.max(rMax, gMax, bMax)
  singleChannelMax = Math.max.apply(
    null,
    rVals.map((val, index) => {
      return val + gVals[index] + bVals[index]
    })
  )
}

const initVals = () => {
  rVals = initArray(0)
  gVals = initArray(0)
  bVals = initArray(0)
}

const calculateHistogram = () => {
  drawImageToCanvas()
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  collectRgbVals(imageData.data)
  calcMax()
}

const ImageHistogram = ({ imageUrl }) => {
  const [calculated, setCalculated] = useState(false)
  const [mode, setMode] = useLocalStorageState(
    'imageHistogramChannels',
    'MULTI'
  )

  useEffect(() => {
    initVals()

    setCalculated(false)
    image = new Image()
    image.onload = () => {
      calculateHistogram()
      setCalculated(true)
    }
    image.src = imageUrl
  }, [imageUrl])

  return (
    <Chart onClick={() => setMode(mode === 'SINGLE' ? 'MULTI' : 'SINGLE')}>
      {calculated && (
        <>
          {mode === 'MULTI' ? (
            <>
              <Bars className="red">
                {rVals.map((val, index) => (
                  <span
                    style={{ height: (100 / multiChannelMax) * val + '%' }}
                    key={index}
                  />
                ))}
              </Bars>
              <Bars className="green">
                {gVals.map((val, index) => (
                  <span
                    style={{ height: (100 / multiChannelMax) * val + '%' }}
                    key={index}
                  />
                ))}
              </Bars>
              <Bars className="blue">
                {bVals.map((val, index) => (
                  <span
                    style={{ height: (100 / multiChannelMax) * val + '%' }}
                    key={index}
                  />
                ))}
              </Bars>
            </>
          ) : (
            <Bars>
              {rVals.map((val, index) => {
                let totalVal = val + gVals[index] + bVals[index]
                return (
                  <span
                    style={{
                      height: (100 / singleChannelMax) * totalVal + '%',
                    }}
                    key={index}
                  />
                )
              })}
            </Bars>
          )}
        </>
      )}
    </Chart>
  )
}

export default ImageHistogram
