import React from 'react'
import { StateMachineProvider, createStore } from 'little-state-machine'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import '../static/css/Onboarding.css'
import Step1AdminUser from './onboarding/Step1AdminUser'
import Step2AdminCreated from './onboarding/Step2AdminCreated'
import Step3CreateLibrary from './onboarding/Step3CreateLibrary'
import Step4PhotoImporting from './onboarding/Step4PhotoImporting'
import Step5Search from './onboarding/Step5Search'
import Result from './onboarding/Result'

createStore({
  data: {},
})

export default function Onboarding() {
  return (
    <StateMachineProvider>
      <Router>
        <Route exact path="/onboarding" component={Step1AdminUser} />
        <Route path="/onboarding/step2" component={Step2AdminCreated} />
        <Route path="/onboarding/step3" component={Step3CreateLibrary} />
        <Route path="/onboarding/step4" component={Step4PhotoImporting} />
        <Route path="/onboarding/step5" component={Step5Search} />
        <Route path="/onboarding/result" component={Result} />
      </Router>
    </StateMachineProvider>
  )
}
