import React from 'react'
import { Box, Grid, Flex } from '@chakra-ui/core'
import '../static/css/PhotoMetadataModal.css'
import Modal from './Modal'

export default function PhotoMetadataModal({ data }) {
  return (
    <Modal className="PhotoMetadataModal" topAccent={true} width={true}>
      <div>
      <h1>Photo metadata</h1>
      <Flex direction="column" justify="space-between">
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="5"><span>ExifTool Version Number:</span></Box>
        <Box w="100%" h="5"><span>{data?.exiftoolVersionNumber}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Name:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileName}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Directory:</span></Box>
        <Box w="100%" h="7"><span>{data?.directory}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Size:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileSize}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Modification Date/Time:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileModificationDateTime}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Access Date/Time:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileAccessDateTime}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Inode Change Date/Time:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileInodeChangeDateTime}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Permissions:</span></Box>
        <Box w="100%" h="7"><span>{data?.filePermissions}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Type:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileType}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>File Type Extension:</span></Box>
        <Box w="100%" h="7"><span>{data?.fileTypeExtension}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>MIME Type:</span></Box>
        <Box w="100%" h="7"><span>{data?.mimeType}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>JFIF Version:</span></Box>
        <Box w="100%" h="7"><span>{data?.jfifVersion}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Resolution Unit:</span></Box>
        <Box w="100%" h="7"><span>{data?.resolutionUnit}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>X Resolution:</span></Box>
        <Box w="100%" h="7"><span>{data?.xResolution}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Y Resolution:</span></Box>
        <Box w="100%" h="7"><span>{data?.yResolution}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Image Width:</span></Box>
        <Box w="100%" h="7"><span>{data?.imageWidth}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Image Height:</span></Box>
        <Box w="100%" h="7"><span>{data?.imageHeight}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Encoding Process:</span></Box>
        <Box w="100%" h="7"><span>{data?.encodingProcess}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Bits Per Sample:</span></Box>
        <Box w="100%" h="7"><span>{data?.bitsPerSample}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Color Components:</span></Box>
        <Box w="100%" h="7"><span>{data?.colorComponents}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Y Cb Cr Sub Sampling:</span></Box>
        <Box w="100%" h="7"><span>{data?.yCbCrSubSampling}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Image Size:</span></Box>
        <Box w="100%" h="7"><span>{data?.imageSize}</span></Box>
      </Grid>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Box w="100%" h="7"><span>Megapixels:</span></Box>
        <Box w="100%" h="7"><span>{data?.megapixels}</span></Box>
      </Grid>
      </Flex>
      </div>
    </Modal>
  )
}
