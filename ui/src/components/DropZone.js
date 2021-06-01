import React, {useCallback, useMemo} from 'react'
import {useDropzone} from 'react-dropzone'
import { useSelector } from 'react-redux'
import uploadIcon from '../static/images/upload_icon.svg'
import { getActiveLibrary } from '../stores/libraries/selector'

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
	const onDrop = useCallback(acceptedFiles => {
    // Do something with the files
    const formData = new FormData();
    acceptedFiles.map((file, index) => {
      formData.append(index, file);
    })
    fetch(`http://localhost:8888/upload/?library_id=${activeLibrary.id}`, { 
      method: 'POST',
      // headers: {
      //   //"Content-Disposition": "attachment; name='file'; filename='xml2.txt'",
      //   "Content-Type": "multipart/form-data; boundary=BbC04y " //"multipart/mixed;boundary=gc0p4Jq0M2Yt08jU534c0p" //  ή // multipart/form-data 
      // },
      body: formData // This is your file object
    }).then(
      response => response.json() // if the response is a JSON object
    ).then(
      success => console.log(success) // Handle the success response object
    ).catch(
      error => console.log(error) // Handle the error response object
    );
	}, [])

	const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({onDrop, accept:'image/*'})
	
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
		<div {...getRootProps({style})}>
		  <input {...getInputProps()} />
      {
        isDragActive?
        <div style={{textAlign: 'center'}}>
        <img src={uploadIcon} alt="Upload" style={{filter: 'invert(0.9)', height: '100px', width: '100px'}} />
        <p style={{color:'white', fontWeight: 'bold', fontSize:'large'}}>Upload to {activeLibrary.name}</p>
      </div>	: <button style={{fontWeight: 'bold', fontSize:'large', backgroundColor:'transparent', color: 'azure', textTransform: 'uppercase'}} >Select or Drop <br/> Photo</button>
      }
      
		</div>
	)
}

export default Dropzone;