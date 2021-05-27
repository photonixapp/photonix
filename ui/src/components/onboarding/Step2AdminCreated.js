import React from 'react'
import { useForm } from 'react-hook-form'

import Modal from './../Modal'
import ModalForm from '../ModalForm'

const Step2AdminCreated = ({ hasPrevious, history }) => {
  const { handleSubmit, formState } = useForm()

  return (
    <Modal
      height={700}
      topAccent={true}
      allowClose={false}
      className="Onboarding"
    >
      <ModalForm
        formState={formState}
        history={history}
        handleSubmit={handleSubmit}
        previousStep="/onboarding"
        nextStep="/onboarding/step3"
      >
        <h1>Admin user created</h1>
        <div className="message">
          <p>
            Great, you are the admin of this installation and no one else can
            create an account (from this web interface anyway). You’re also
            logged in now so we can finish off the installation and get some
            photos in here.
          </p>
        </div>
      </ModalForm>
    </Modal>
  )
}

export default Step2AdminCreated
