"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Stanko Milosev
// http://www.milosev.com/425-reading-exif-meta-data-from-jpeg-image-files.html
/**
 * Converts Degrees to numerical coordinates.
 */
exports.dms2dd = function (deg, min, sec, dir) {
    var dd = deg + min / 60 + sec / (60 * 60);
    var i = (dir == 'S' || dir == 'W') ? -1 : 1;
    return dd * i;
};
// RobG
// https://stackoverflow.com/a/43084928/1267201
/**
 * Converts EXIF date to JS date.
 */
exports.getDate = function (s) {
    var _a = s.split(/\D/), year = _a[0], month = _a[1], date = _a[2], hour = _a[3], min = _a[4], sec = _a[5];
    return new Date(year, month - 1, date, hour, min, sec);
};
