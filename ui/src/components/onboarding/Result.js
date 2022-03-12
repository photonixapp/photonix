import React from 'react'

const Result = () => {
  localStorage.setItem('isSignin', true)
  sessionStorage.removeItem('__STATE_MACHINE__');
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
