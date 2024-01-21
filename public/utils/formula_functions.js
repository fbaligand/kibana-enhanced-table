import _ from 'lodash';
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

  uniq: function (array) {
    if (!Array.isArray(array)) {
      array = [array];
    }
    return _.uniq(array);
  },

  isArray: function (value) {
    return Array.isArray(value);
  },

  parseDate: function (dateString) {
    return Date.parse(dateString);
  },

  dateObject: function (...params) {
    const date = new Date(...params);
    return computeDateStructure(date);
  },

  durationObject: function (durationInMillis) {
    return computeDurationStructureBrokenDownByTimeUnit(durationInMillis);
  }

};