import React from 'react'

export default function PhotoExtraData({ data }) {
  return (
    <>
      <li>ExifTool Version Number: {data?.exiftoolVersionNumber}</li>
      <li>File Name: {data?.fileName}</li>
      <li>Directory: {data?.directory}</li>
      <li>File Size: {data?.fileSize}</li>
      <li>File Modification Date/Time: {data?.fileModificationDateTime}</li>
      <li>File Access Date/Time: {data?.fileAccessDateTime}</li>
      <li>File Inode Change Date/Time: {data?.fileInodeChangeDateTime}</li>
      <li>File Permissions: {data?.filePermissions}</li>
      <li>File Type: {data?.fileType}</li>
      <li>File Type Extension: {data?.fileTypeExtension}</li>
      <li>MIME Type: {data?.mimeType}</li>
      <li>JFIF Version: {data?.jfifVersion}</li>
      <li>Resolution Unit: {data?.resolutionUnit}</li>
      <li>X Resolution: {data?.xResolution}</li>
      <li>Y Resolution: {data?.yResolution}</li>
      <li>Image Width: {data?.imageWidth}</li>
      <li>Image Height: {data?.imageHeight}</li>
      <li>Encoding Process: {data?.encodingProcess}</li>
      <li>Bits Per Sample: {data?.bitsPerSample}</li>
      <li>Color Components: {data?.colorComponents}</li>
      <li>Y Cb Cr Sub Sampling: {data?.yCbCrSubSampling}</li>
      <li>Image Size: {data?.imageSize}</li>
      <li>Megapixels: {data?.megapixels}</li>
    </>
  )
}
