import { fieldFormatter } from '../field_formatter';

function computeBasePath(pathname) {
  const endIndex = pathname ? pathname.indexOf('/app/opensearch-dashboards') : -1;
  const basePath = endIndex !== -1 ? pathname.substring(0, endIndex) : '';
  return basePath;
}

// eslint-disable-next-line import/no-default-export
export default function AggConfigResult(aggConfig, parent, value, key, filters) {
  this.key = key;
  this.value = value;
  this.aggConfig = aggConfig;
  this.filters = filters;
  this.$parent = parent;

  if (aggConfig.type.type === 'buckets') {
    this.type = 'bucket';
  } else {
    this.type = 'metric';
  }
}

/**
 * Returns an array of the aggConfigResult and parents up the branch
 * @returns {array} Array of aggConfigResults
 */
AggConfigResult.prototype.getPath = function () {
  return (function walk(result, path) {
    path.unshift(result);
    if (result.$parent) return walk(result.$parent, path);
    return path;
  }(this, []));
};

/**
 * Returns an Elasticsearch filter that represents the result.
 * @returns {object} Elasticsearch filter
 */
AggConfigResult.prototype.createFilter = function () {
  return this.filters || this.aggConfig.createFilter(this.key);
};

AggConfigResult.prototype.toString = function (contentType) {
  contentType = contentType || 'text';
  let fieldFormatterInstance = this.aggConfig[`${contentType}FieldFormatter`];
  if (!fieldFormatterInstance) {
    fieldFormatterInstance = this.aggConfig[`${contentType}FieldFormatter`] = fieldFormatter(this.aggConfig, contentType);
  }
  if (!this.aggConfig.formatterOptions) {
    const parsedUrl = {
      origin: window.location.origin,
      pathname: window.location.pathname,
      basePath: computeBasePath(window.location.pathname),
    };
    this.aggConfig.formatterOptions = { parsedUrl };
  }
  return fieldFormatterInstance(this.value, this.aggConfig.formatterOptions);
};

AggConfigResult.prototype.valueOf = function () {
  return this.value;
};
