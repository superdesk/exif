"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
/* eslint-disable no-console */
var thumbnail_1 = __importDefault(require("./thumbnail"));
var tiff_1 = __importDefault(require("../tags/tiff"));
var exif_1 = __importDefault(require("../tags/exif"));
var gps_1 = __importDefault(require("../tags/gps"));
var _1 = require("./");
var util_1 = require("./util");
var debug = false;
/**
 * @param {!ArrayBuffer} file
 * @param {!_exif.HandleBinaryFile} [config]
 */
function findEXIFinJPEG(file, config) {
    var dataView = new DataView(file);
    if (debug)
        console.log('Got file of length ' + file.byteLength);
    if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
        if (debug)
            console.log('Not a valid JPEG');
        return false; // not a valid jpeg
    }
    var length = file.byteLength;
    var offset = 2, marker;
    while (offset < length) {
        if (dataView.getUint8(offset) != 0xFF) {
            if (debug)
                console.log('Not a valid marker at offset ' + offset + ', found: ' + dataView.getUint8(offset));
            return false; // not a valid marker, something is wrong
        }
        marker = dataView.getUint8(offset + 1);
        if (debug)
            console.log(marker);
        // we could implement handling for other markers here,
        // but we're only looking for 0xFFE1 for EXIF data
        if (marker == 225) {
            if (debug)
                console.log('Found 0xFFE1 marker');
            return readEXIFData(dataView, offset + 4, config);
            // offset += 2 + file.getShortAt(offset+2, true);
        }
        else {
            offset += 2 + dataView.getUint16(offset + 2);
        }
    }
}
exports.findEXIFinJPEG = findEXIFinJPEG;
/**
 * @param {!DataView} file
 * @param {number} start
 * @param {!_exif.HandleBinaryFile} [config]
 */
function readEXIFData(file, start, config) {
    if (config === void 0) { config = {}; }
    var _a = config.coordinates, coordinates = _a === void 0 ? 'dms' : _a, _b = config.parseDates, parseDates = _b === void 0 ? false : _b;
    if (_1.getStringFromDB(file, start, 4) != 'Exif') {
        if (debug)
            console.log('Not valid EXIF data! ' + _1.getStringFromDB(file, start, 4));
        return false;
    }
    var tiffOffset = start + 6;
    var bigEnd;
    // test for TIFF validity and endianness
    if (file.getUint16(tiffOffset) == 0x4949) {
        bigEnd = false;
    }
    else if (file.getUint16(tiffOffset) == 0x4D4D) {
        bigEnd = true;
    }
    else {
        if (debug)
            console.log('Not valid TIFF data! (no 0x4949 or 0x4D4D)');
        return false;
    }
    if (file.getUint16(tiffOffset + 2, !bigEnd) != 0x002A) {
        if (debug)
            console.log('Not valid TIFF data! (no 0x002A)');
        return false;
    }
    var firstIFDOffset = file.getUint32(tiffOffset + 4, !bigEnd);
    if (firstIFDOffset < 0x00000008) {
        if (debug)
            console.log('Not valid TIFF data! (First offset less than 8)', file.getUint32(tiffOffset + 4, !bigEnd));
        return false;
    }
    var tags = _1.readTags(file, tiffOffset, tiffOffset + firstIFDOffset, tiff_1.default, bigEnd);
    if (parseDates && tags['DateTime']) {
        tags['DateTime'] = util_1.getDate(tags['DateTime']);
    }
    var tagName;
    var ExifIFDPointer = tags["ExifIFDPointer"], GPSInfoIFDPointer = tags["GPSInfoIFDPointer"];
    if (ExifIFDPointer) {
        var exifData = _1.readTags(file, tiffOffset, tiffOffset + ExifIFDPointer, exif_1.default, bigEnd);
        for (tagName in exifData) {
            var tag = exifData[tagName];
            switch (tagName) {
                case 'LightSource':
                case 'Flash':
                case 'MeteringMode':
                case 'ExposureProgram':
                case 'SensingMethod':
                case 'SceneCaptureType':
                case 'SceneType':
                case 'CustomRendered':
                case 'WhiteBalance':
                case 'GainControl':
                case 'Contrast':
                case 'Saturation':
                case 'Sharpness':
                case 'SubjectDistanceRange':
                case 'FileSource':
                    tag = StringValues[tagName][tag];
                    break;
                case 'DateTimeOriginal':
                case 'DateTimeDigitized':
                    if (parseDates) {
                        tag = util_1.getDate(tag);
                    }
                    break;
                case 'ExifVersion':
                case 'FlashpixVersion':
                    tag = String.fromCharCode(tag[0], tag[1], tag[2], tag[3]);
                    break;
                case 'ComponentsConfiguration':
                    tag =
                        StringValues.Components[tag[0]] +
                            StringValues.Components[tag[1]] +
                            StringValues.Components[tag[2]] +
                            StringValues.Components[tag[3]];
                    break;
            }
            tags[tagName] = tag;
        }
    }
    if (GPSInfoIFDPointer) {
        var gpsData = _1.readTags(file, tiffOffset, tiffOffset + GPSInfoIFDPointer, gps_1.default, bigEnd);
        for (tagName in gpsData) {
            var tag = gpsData[tagName];
            switch (tagName) {
                case 'GPSVersionID': {
                    var t = tag[0], t1 = tag[1], t2 = tag[2], t3 = tag[3];
                    tag = [t, t1, t2, t3].join('.');
                    break;
                }
            }
            tags[tagName] = tag;
        }
        if (coordinates == 'dd') {
            if (tags['GPSLongitude']) {
                var _c = tags['GPSLongitude'], deg = _c[0], min = _c[1], sec = _c[2];
                tags['GPSLongitude'] = util_1.dms2dd(deg, min, sec, tags['GPSLongitudeRef']);
            }
            if (tags['GPSLatitude']) {
                var _d = tags['GPSLatitude'], deg = _d[0], min = _d[1], sec = _d[2];
                tags['GPSLatitude'] = util_1.dms2dd(deg, min, sec, tags['GPSLatitudeRef']);
            }
        }
    }
    tags['thumbnail'] = thumbnail_1.default(file, tiffOffset, firstIFDOffset, bigEnd);
    return tags;
}
var StringValues = {
    'ExposureProgram': (_a = {},
        _a[0] = 'Not defined',
        _a[1] = 'Manual',
        _a[2] = 'Normal program',
        _a[3] = 'Aperture priority',
        _a[4] = 'Shutter priority',
        _a[5] = 'Creative program',
        _a[6] = 'Action program',
        _a[7] = 'Portrait mode',
        _a[8] = 'Landscape mode',
        _a),
    'MeteringMode': (_b = {},
        _b[0] = 'Unknown',
        _b[1] = 'Average',
        _b[2] = 'CenterWeightedAverage',
        _b[3] = 'Spot',
        _b[4] = 'MultiSpot',
        _b[5] = 'Pattern',
        _b[6] = 'Partial',
        _b[255] = 'Other',
        _b),
    'LightSource': (_c = {},
        _c[0] = 'Unknown',
        _c[1] = 'Daylight',
        _c[2] = 'Fluorescent',
        _c[3] = 'Tungsten (incandescent light)',
        _c[4] = 'Flash',
        _c[9] = 'Fine weather',
        _c[10] = 'Cloudy weather',
        _c[11] = 'Shade',
        _c[12] = 'Daylight fluorescent (D 5700 - 7100K)',
        _c[13] = 'Day white fluorescent (N 4600 - 5400K)',
        _c[14] = 'Cool white fluorescent (W 3900 - 4500K)',
        _c[15] = 'White fluorescent (WW 3200 - 3700K)',
        _c[17] = 'Standard light A',
        _c[18] = 'Standard light B',
        _c[19] = 'Standard light C',
        _c[20] = 'D55',
        _c[21] = 'D65',
        _c[22] = 'D75',
        _c[23] = 'D50',
        _c[24] = 'ISO studio tungsten',
        _c[255] = 'Other',
        _c),
    'Flash': (_d = {},
        _d[0x0000] = 'Flash did not fire',
        _d[0x0001] = 'Flash fired',
        _d[0x0005] = 'Strobe return light not detected',
        _d[0x0007] = 'Strobe return light detected',
        _d[0x0009] = 'Flash fired, compulsory flash mode',
        _d[0x000D] = 'Flash fired, compulsory flash mode, return light not detected',
        _d[0x000F] = 'Flash fired, compulsory flash mode, return light detected',
        _d[0x0010] = 'Flash did not fire, compulsory flash mode',
        _d[0x0018] = 'Flash did not fire, auto mode',
        _d[0x0019] = 'Flash fired, auto mode',
        _d[0x001D] = 'Flash fired, auto mode, return light not detected',
        _d[0x001F] = 'Flash fired, auto mode, return light detected',
        _d[0x0020] = 'No flash function',
        _d[0x0041] = 'Flash fired, red-eye reduction mode',
        _d[0x0045] = 'Flash fired, red-eye reduction mode, return light not detected',
        _d[0x0047] = 'Flash fired, red-eye reduction mode, return light detected',
        _d[0x0049] = 'Flash fired, compulsory flash mode, red-eye reduction mode',
        _d[0x004D] = 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
        _d[0x004F] = 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
        _d[0x0059] = 'Flash fired, auto mode, red-eye reduction mode',
        _d[0x005D] = 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
        _d[0x005F] = 'Flash fired, auto mode, return light detected, red-eye reduction mode',
        _d),
    'SensingMethod': (_e = {},
        _e[1] = 'Not defined',
        _e[2] = 'One-chip color area sensor',
        _e[3] = 'Two-chip color area sensor',
        _e[4] = 'Three-chip color area sensor',
        _e[5] = 'Color sequential area sensor',
        _e[7] = 'Trilinear sensor',
        _e[8] = 'Color sequential linear sensor',
        _e),
    'SceneCaptureType': (_f = {},
        _f[0] = 'Standard',
        _f[1] = 'Landscape',
        _f[2] = 'Portrait',
        _f[3] = 'Night scene',
        _f),
    'SceneType': (_g = {},
        _g[1] = 'Directly photographed',
        _g),
    'CustomRendered': (_h = {},
        _h[0] = 'Normal process',
        _h[1] = 'Custom process',
        _h),
    'WhiteBalance': (_j = {},
        _j[0] = 'Auto white balance',
        _j[1] = 'Manual white balance',
        _j),
    'GainControl': (_k = {},
        _k[0] = 'None',
        _k[1] = 'Low gain up',
        _k[2] = 'High gain up',
        _k[3] = 'Low gain down',
        _k[4] = 'High gain down',
        _k),
    'Contrast': (_l = {},
        _l[0] = 'Normal',
        _l[1] = 'Soft',
        _l[2] = 'Hard',
        _l),
    'Saturation': (_m = {},
        _m[0] = 'Normal',
        _m[1] = 'Low saturation',
        _m[2] = 'High saturation',
        _m),
    'Sharpness': (_o = {},
        _o[0] = 'Normal',
        _o[1] = 'Soft',
        _o[2] = 'Hard',
        _o),
    'SubjectDistanceRange': (_p = {},
        _p[0] = 'Unknown',
        _p[1] = 'Macro',
        _p[2] = 'Close view',
        _p[3] = 'Distant view',
        _p),
    'FileSource': (_q = {},
        _q[3] = 'DSC',
        _q),
    Components: (_r = {},
        _r[0] = '',
        _r[1] = 'Y',
        _r[2] = 'Cb',
        _r[3] = 'Cr',
        _r[4] = 'R',
        _r[5] = 'G',
        _r[6] = 'B',
        _r),
};
/**
 * @suppress {nonStandardJsDocs}
 * @typedef {import('../').HandleBinaryFile} _exif.HandleBinaryFile
 */ 
