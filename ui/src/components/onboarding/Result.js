import React from 'react'
import { useStateMachine } from 'little-state-machine'
import updateAction from './updateAction'

const Result = (props) => {
  localStorage.setItem('isSignin', true)
  const { state } = useStateMachine(updateAction)
  setTimeout(() => {
    window.location.reload()
  }, 2000)

  return (
    <div className="formContainer">
      <h1>We’re all set</h1>
      <div className="message">
        <p>Please wait…</p>
      </div>
    </div>
  )
}

export default Result
