import React from 'react'
import { useStateMachine } from 'little-state-machine'
import { useQuery } from '@apollo/react-hooks'
import { Redirect } from 'react-router-dom'
import updateAction from './updateAction'
import {SIGN_IN,ENVIRONMENT} from '../../graphql/onboarding'
import history from '../../history'

const Result = (props) => {
  localStorage.setItem("isSignin", true);
  const { state } = useStateMachine(updateAction)
  const { data: envData } = useQuery(ENVIRONMENT)
  if (envData.environment.form === "has_configured_image_analysis") {
    setTimeout(() => {
      window.location.reload();
    }, 1000)
  }
  
  return (
    <div className="formContainer">
      <h2>Result</h2>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}

export default Result
