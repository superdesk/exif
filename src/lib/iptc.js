/* eslint-disable no-console */
import { getStringFromDB } from './'

const debug = false

/**
 * @param {ArrayBuffer} file
 */
export default function findIPTCinJPEG(file) {
  const dataView = new DataView(file)

  if (debug) console.log('Got file of length %s', file.byteLength)
  if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
    if (debug) console.log('Not a valid JPEG')
    return false // not a valid jpeg
  }

  let offset = 2,
    length = file.byteLength

  while (offset < length) {
    if (isFieldSegmentStart(dataView, offset )){
      // Get the length of the name header (which is padded to an even number of bytes)
      var nameHeaderLength = dataView.getUint8(offset+7)
      if(nameHeaderLength % 2 !== 0) nameHeaderLength += 1
      // Check for pre photoshop 6 format
      if(nameHeaderLength === 0) {
        // Always 4
        nameHeaderLength = 4
      }

      var startOffset = offset + 8 + nameHeaderLength
      var sectionLength = dataView.getUint16(offset + 6 + nameHeaderLength)

      return readIPTCData(file, startOffset, sectionLength)
    }

    // Not the marker, continue searching
    offset++
  }
}

// https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/IPTC.html

const IPTCEnvelopeMap = {
  [5]: 'Destination',
  [30]: 'ServiceIdentifier',
  [50]: 'ProductID',
  [70]: 'DateSent',
  [80]: 'TimeSent',
}

const IPTCApplicationMap = {
  [5]: 'ObjectName',
  [7]: 'EditStatus',
  [10]: 'Urgency',
  [12]: 'SubjectReference',
  [15]: 'Category',
  [20]: 'SupplementalCategories',
  [25]: 'Keywords',
  [26]: 'ContentLocationCode',
  [27]: 'ContentLocationName',
  [30]: 'ReleaseDate',
  [35]: 'ReleaseTime',
  [37]: 'ExpirationDate',
  [38]: 'ExpirationTime',
  [40]: 'SpecialInstructions',
  [55]: 'DateCreated',
  [60]: 'TimeCreated',
  [80]: 'By-line',
  [85]: 'By-lineTitle',
  [90]: 'City',
  [92]: 'Sub-location',
  [95]: 'Province-State',
  [100]: 'Country-PrimaryLocationCode',
  [101]: 'Country-PrimaryLocationName',
  [103]: 'OriginalTransmissionReference',
  [105]: 'Headline',
  [110]: 'Credit',
  [115]: 'Source',
  [116]: 'CopyrightNotice',
  [118]: 'Contact',
  [120]: 'Caption-Abstract',
  [122]: 'Writer-Editor',
  [135]: 'LanguageIdentifier',
}

function readIPTCData(file, startOffset, sectionLength){
  const dataView = new DataView(file)
  var data = {}
  let fieldValue, fieldName, dataSize, segmentType, map
  let segmentStartPos = startOffset
  while(segmentStartPos < startOffset + sectionLength) {
    if(dataView.getUint8(segmentStartPos) === 0x1C){
      if(dataView.getUint8(segmentStartPos+1) === 0x01) {
        map = IPTCEnvelopeMap
      }
      else if(dataView.getUint8(segmentStartPos+1) === 0x02) {
        map = IPTCApplicationMap
      }
      else {
        map = null
      }
      if(map != null) {
          segmentType = dataView.getUint8(segmentStartPos+2)
          if(segmentType in map) {
            dataSize = dataView.getInt16(segmentStartPos+3)
            fieldName = map[segmentType]
            fieldValue = getStringFromDB(dataView, segmentStartPos+5, dataSize)
            // Check if we already stored a value with this name
            if(data.hasOwnProperty(fieldName)) {
              // Value already stored with this name, create multivalue field
              if(data[fieldName] instanceof Array) {
                data[fieldName].push(fieldValue)
              }
              else {
                data[fieldName] = [data[fieldName], fieldValue]
              }
            }
            else {
              data[fieldName] = fieldValue
            }
          }
        }
    }
    segmentStartPos++
  }
  return data
}

function isFieldSegmentStart(dataView, offset){
  return (
    dataView.getUint8(offset) === 0x38 &&
    dataView.getUint8(offset+1) === 0x42 &&
    dataView.getUint8(offset+2) === 0x49 &&
    dataView.getUint8(offset+3) === 0x4D &&
    dataView.getUint8(offset+4) === 0x04 &&
    dataView.getUint8(offset+5) === 0x04
  )
}
