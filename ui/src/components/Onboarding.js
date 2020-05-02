import React from 'react'
import { StateMachineProvider, createStore } from 'little-state-machine'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import '../static/css/Onboarding.css'
import Step1AdminUser from './onboarding/Step1AdminUser'
import Step2AdminCreated from './onboarding/Step2AdminCreated'
import Step3CrateLibrary from './onboarding/Step3CrateLibrary'
import Result from './onboarding/Result'

createStore({
  data: {},
})

export default function Onboarding() {
  return (
    <StateMachineProvider>
      <div className="Onboarding">
        <Router>
          <Route exact path="/onboarding" component={Step1AdminUser} />
          <Route path="/onboarding/step2" component={Step2AdminCreated} />
          <Route path="/onboarding/step3" component={Step3CrateLibrary} />
          <Route path="/onboarding/result" component={Result} />
        </Router>
      </div>
    </StateMachineProvider>
  )
}
