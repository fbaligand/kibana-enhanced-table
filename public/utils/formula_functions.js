import _ from 'lodash';
import moment from 'moment';
import { computeDateStructure, computeDurationStructureBrokenDownByTimeUnit } from './time_utils';

export const formulaFunctions = {

  now: function () {
    return Date.now();
  },

  indexOf: function (strOrArray, searchValue, fromIndex) {
    return strOrArray.indexOf(searchValue, fromIndex);
  },

  lastIndexOf: function (strOrArray, searchValue, fromIndex) {
    if (fromIndex) {
      return strOrArray.lastIndexOf(searchValue, fromIndex);
    }
    else {
      return strOrArray.lastIndexOf(searchValue);
    }
  },

  match: function (str, regexp) {
    const result = str.match(new RegExp(regexp));
    if (result) {
      return result[0];
    }
    else {
      return result;
    }
  },

  replace: function (str, substr, newSubstr) {
    return str.replace(substr, newSubstr);
  },

  replaceRegexp: function (str, regexp, newSubstr) {
    return str.replace(new RegExp(regexp, 'g'), newSubstr);
  },

  search: function (str, regexp) {
    return str.search(regexp);
  },

  substring: function (str, indexStart, indexEnd) {
    return str.substring(indexStart, indexEnd);
  },

  toLowerCase: function (str) {
    return str.toLowerCase();
  },

  toUpperCase: function (str) {
    return str.toUpperCase();
  },

  trim: function (str) {
    return str.trim();
  },

  encodeURIComponent: function (str) {
    return encodeURIComponent(str);
  },

  sort: function (array, compareFunction) {
    if (!Array.isArray(array)) {
      array = [array];
    }
    return array.sort(compareFunction);
  },

  split: function (str, separator) {
    return str.split(separator);
  },

  uniq: function (array) {
    if (!Array.isArray(array)) {
      array = [array];
    }
    return _.uniq(array);
  },

  isArray: function (value) {
    return Array.isArray(value);
  },

  formatDate(date, dateFormat) {
    return moment(date).format(dateFormat);
  },

  parseDate: function (dateString, dateFormat) {
    if (dateFormat) {
      return moment(dateString, dateFormat).valueOf();
    }
    else {
      return Date.parse(dateString);
    }
  },

  parseInt: function (string, base) {
    return parseInt(string, base);
  },

  dateObject: function (...params) {
    const date = new Date(...params);
    return computeDateStructure(date);
  },

  durationObject: function (durationInMillis) {
    return computeDurationStructureBrokenDownByTimeUnit(durationInMillis);
  }

};