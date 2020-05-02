import React, { useState, useEffect } from 'react'

import '../static/css/Onboarding.css'
import Step1AdminUser from './onboarding/Step1AdminUser'

export default function Onboarding() {
  const [stepIndex, setStep] = useState(0)

  let steps = [Step1AdminUser]
  const [stepCompleted, setStepComplete] = useState(-1)

  let step = steps[stepIndex]
  const onPrevious = () => {}

  return (
    <div className="Onboarding">
      {React.createElement(
        steps[stepCompleted + 1],
        { hasPrevious: stepIndex > 0, onPrevious: onPrevious },
        null
      )}
    </div>
  )
}
