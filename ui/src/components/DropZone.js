import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from "axios"
import { useSelector, useDispatch } from 'react-redux'
import uploadIcon from '../static/images/upload_icon.svg'
import { getActiveLibrary } from '../stores/libraries/selector'
import history from "../history";

const baseStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: 'transparent',
  borderStyle: 'dashed',
  color: 'transparent',
  transition: 'border .3s ease-in-out'
};

const activeStyle = {
  borderColor: '#2196f3'
};

const acceptStyle = {
  borderColor: 'white'
};

const rejectStyle = {
  borderColor: 'red'
};

const Dropzone = () => {
  const activeLibrary = useSelector(getActiveLibrary)
  const dispatch = useDispatch()
  const onDrop = useCallback(acceptedFiles => {
    const formData = new FormData();
    acceptedFiles.map((file, index) => {
      formData.append(index, file);
    })
    dispatch({ type: 'UPLOADING', loading: true})
    axios.post(`/upload/?library_id=${activeLibrary.id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: data => {
        //Set the progress value to show the progress bar
        dispatch({
          type: 'PROGRESS',
          progressVal: Math.round((100 * data.loaded) / data.total) })
      },
    }).then(res => {
      setTimeout(
        function () {
          dispatch({ type: 'UPLOADING', loading: false })
        },
        5000);
      !res.data.ok&& window.alert(res.data.message) 
      history.push('/');
    }).catch(err => {
      console.log(err);
      window.alert("Something went Wrong!")
    })
  }, [])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({ onDrop, accept: 'image/*' })

  const style = useMemo(() => ({
    ...baseStyle,
    ...(isDragActive ? activeStyle : {}),
    ...(isDragAccept ? acceptStyle : {}),
    ...(isDragReject ? rejectStyle : {})
  }), [
    isDragActive,
    isDragReject,
    isDragAccept
  ]);

  return (
    <div {...getRootProps({ style })}>
      <input {...getInputProps()} />
      {
        isDragActive ?
          <div style={{ textAlign: 'center' }}>
            <img src={uploadIcon} alt="Upload" style={{ filter: 'invert(0.9)', height: '100px', width: '100px' }} />
            <p style={{ color: 'white', fontWeight: 'bold', fontSize: 'large' }}>Upload to {activeLibrary.name}</p>
          </div> : <button style={{ fontWeight: 'bold', fontSize: 'large', backgroundColor: 'transparent', color: 'azure', textTransform: 'uppercase' }} >Select or Drop <br /> Photo</button>
      }

    </div>
  )
}

export default Dropzone;