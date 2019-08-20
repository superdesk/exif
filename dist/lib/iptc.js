"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b;
/* eslint-disable no-console */
var _1 = require("./");
var debug = false;
/**
 * @param {ArrayBuffer} file
 */
function findIPTCinJPEG(file) {
    var dataView = new DataView(file);
    if (debug)
        console.log('Got file of length %s', file.byteLength);
    if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
        if (debug)
            console.log('Not a valid JPEG');
        return false; // not a valid jpeg
    }
    var offset = 2, length = file.byteLength;
    while (offset < length) {
        if (isFieldSegmentStart(dataView, offset)) {
            // Get the length of the name header (which is padded to an even number of bytes)
            var nameHeaderLength = dataView.getUint8(offset + 7);
            if (nameHeaderLength % 2 !== 0)
                nameHeaderLength += 1;
            // Check for pre photoshop 6 format
            if (nameHeaderLength === 0) {
                // Always 4
                nameHeaderLength = 4;
            }
            var startOffset = offset + 8 + nameHeaderLength;
            var sectionLength = dataView.getUint16(offset + 6 + nameHeaderLength);
            return readIPTCData(file, startOffset, sectionLength);
        }
        // Not the marker, continue searching
        offset++;
    }
}
exports.default = findIPTCinJPEG;
// https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/IPTC.html
var IPTCEnvelopeMap = (_a = {},
    _a[5] = 'Destination',
    _a[30] = 'ServiceIdentifier',
    _a[50] = 'ProductID',
    _a[70] = 'DateSent',
    _a[80] = 'TimeSent',
    _a);
var IPTCApplicationMap = (_b = {},
    _b[5] = 'ObjectName',
    _b[7] = 'EditStatus',
    _b[10] = 'Urgency',
    _b[12] = 'SubjectReference',
    _b[15] = 'Category',
    _b[20] = 'SupplementalCategories',
    _b[25] = 'Keywords',
    _b[26] = 'ContentLocationCode',
    _b[27] = 'ContentLocationName',
    _b[30] = 'ReleaseDate',
    _b[35] = 'ReleaseTime',
    _b[37] = 'ExpirationDate',
    _b[38] = 'ExpirationTime',
    _b[40] = 'SpecialInstructions',
    _b[55] = 'DateCreated',
    _b[60] = 'TimeCreated',
    _b[80] = 'By-line',
    _b[85] = 'By-lineTitle',
    _b[90] = 'City',
    _b[92] = 'Sub-location',
    _b[95] = 'Province-State',
    _b[100] = 'Country-PrimaryLocationCode',
    _b[101] = 'Country-PrimaryLocationName',
    _b[103] = 'OriginalTransmissionReference',
    _b[105] = 'Headline',
    _b[110] = 'Credit',
    _b[115] = 'Source',
    _b[116] = 'CopyrightNotice',
    _b[118] = 'Contact',
    _b[120] = 'Caption-Abstract',
    _b[122] = 'Writer-Editor',
    _b[135] = 'LanguageIdentifier',
    _b);
function readIPTCData(file, startOffset, sectionLength) {
    var dataView = new DataView(file);
    var data = {};
    var fieldValue, fieldName, dataSize, segmentType, map;
    var segmentStartPos = startOffset;
    while (segmentStartPos < startOffset + sectionLength) {
        if (dataView.getUint8(segmentStartPos) === 0x1C) {
            if (dataView.getUint8(segmentStartPos + 1) === 0x01) {
                map = IPTCEnvelopeMap;
            }
            else if (dataView.getUint8(segmentStartPos + 1) === 0x02) {
                map = IPTCApplicationMap;
            }
            else {
                map = null;
            }
            if (map != null) {
                segmentType = dataView.getUint8(segmentStartPos + 2);
                if (segmentType in map) {
                    dataSize = dataView.getInt16(segmentStartPos + 3);
                    fieldName = map[segmentType];
                    fieldValue = _1.getStringFromDB(dataView, segmentStartPos + 5, dataSize);
                    // Check if we already stored a value with this name
                    if (data.hasOwnProperty(fieldName)) {
                        // Value already stored with this name, create multivalue field
                        if (data[fieldName] instanceof Array) {
                            data[fieldName].push(fieldValue);
                        }
                        else {
                            data[fieldName] = [data[fieldName], fieldValue];
                        }
                    }
                    else {
                        data[fieldName] = fieldValue;
                    }
                }
            }
        }
        segmentStartPos++;
    }
    return data;
}
function isFieldSegmentStart(dataView, offset) {
    return (dataView.getUint8(offset) === 0x38 &&
        dataView.getUint8(offset + 1) === 0x42 &&
        dataView.getUint8(offset + 2) === 0x49 &&
        dataView.getUint8(offset + 3) === 0x4D &&
        dataView.getUint8(offset + 4) === 0x04 &&
        dataView.getUint8(offset + 5) === 0x04);
}
