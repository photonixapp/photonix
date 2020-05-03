import React from 'react'
import { useStateMachine } from 'little-state-machine'
import updateAction from './updateAction'

const Result = (props) => {
  const { state } = useStateMachine(updateAction)

  return (
    <div className="formContainer">
      <h2>Result</h2>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}

export default Result
