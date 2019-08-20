"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var iptc_1 = __importDefault(require("./lib/iptc"));
var exif_1 = require("./lib/exif");
/**
 * Extract metadata from the ArrayBuffer.
 * @param {!ArrayBuffer} binFile The file as ArrayBuffer.
 * @param {!_exif.HandleBinaryFile} config Options for the `handleBinaryFile` method.
 * @param {boolean} [config.parseDates=false] Parse EXIF dates into JS dates. Default `false`.
 * @param {string} [config.coordinates="dms"] Return coordinates either as DMS (degrees, minutes, seconds) or DD (decimal degrees). Specified as `'dms'` or `'dd'`. Default `dms`.
 */
function handleBinaryFile(binFile, config) {
    var data = exif_1.findEXIFinJPEG(binFile, config);
    var iptcdata = iptc_1.default(binFile);
    return { 'data': data, 'iptcdata': iptcdata };
}
exports.handleBinaryFile = handleBinaryFile;
/* documentary types/index.xml */
/**
 * @suppress {nonStandardJsDocs}
 * @typedef {_exif.HandleBinaryFile} HandleBinaryFile Options for the `handleBinaryFile` method.
 */
/**
 * @suppress {nonStandardJsDocs}
 * @typedef {Object} _exif.HandleBinaryFile Options for the `handleBinaryFile` method.
 * @prop {boolean} [parseDates=false] Parse EXIF dates into JS dates. Default `false`.
 * @prop {string} [coordinates="dms"] Return coordinates either as DMS (degrees, minutes, seconds) or DD (decimal degrees). Specified as `'dms'` or `'dd'`. Default `dms`.
 */
