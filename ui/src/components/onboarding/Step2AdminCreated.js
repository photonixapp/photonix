import React from 'react'
import { useForm } from 'react-hook-form'

import ModalForm from '../ModalForm'

const Step2AdminCreated = ({ hasPrevious, history }) => {
  const { register, handleSubmit, errors, formState } = useForm()

  return (
    <ModalForm
      formState={formState}
      history={history}
      handleSubmit={handleSubmit}
      previousStep="/onboarding"
      nextStep="/onboarding/step3"
    >
      <h2>Admin user created</h2>
      <div className="message">
        <p>
          Great, you are the admin of this installation and no one else can
          create an account (from this web interface anyway). You're also logged
          in now so we can finish off the installation and get some photos in
          here.
        </p>
      </div>
    </ModalForm>
  )
}

export default Step2AdminCreated
