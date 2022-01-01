/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { uiModules } from 'ui/modules';
import _ from 'lodash';

import { computeColumnTotal } from './column_total_computer';
import { computeTimeRange } from './time_range_computer';

import { fieldFormats } from 'ui/registry/field_formats';
import { AggConfig } from 'ui/vis/agg_config';
import AggConfigResult from 'ui/vis/agg_config_result';
import { Notifier } from 'ui/notify/notifier';

// third-party dependencies
import { Parser } from 'expr-eval';
import handlebars from 'handlebars/dist/handlebars';

// get the kibana/enhanced-table module, and make sure that it requires the "kibana" module if it didn't already
const module = uiModules.get('kibana/enhanced-table', ['kibana']);

// add a controller to tha module, which will transform the esResponse into a
// tabular format that we can pass to the table directive
module.controller('EnhancedTableVisController', function ($scope, Private, config) {

  class EnhancedTableError {
    constructor(message) {
      this.message = message;
    }
  }

  const getConfig = (...args) => config.get(...args);

  const notifier = new Notifier();
  handlebars.registerHelper('encodeURIComponent', encodeURIComponent);

  // controller methods

  const createTemplateContext = function (table, column, row, totalHits, timeRange) {

    // inject column value references
    const templateContext = { totalHits, timeRange };
    _.forEach(column.template.paramsCols, function (templateParamCol) {
      templateContext[`col${templateParamCol}`] = row[templateParamCol].value;
    });

    // inject column total references
    _.forEach(column.template.paramsTotals, function (templateParamTotal) {
      if (table.columns[templateParamTotal].total === undefined) {
        table.columns[templateParamTotal].total = computeColumnTotal(templateParamTotal, column.template.totalFunc, table);
      }
      templateContext[`total${templateParamTotal}`] = table.columns[templateParamTotal].total;
    });

    return templateContext;
  };

  const findSplitColIndex = function (table) {
    if (table !== null) {
      return _.findIndex(table.columns, col => col.aggConfig.schema.name === 'splitcols');
    }
    else {
      return -1;
    }
  };

  const getRealColIndex = function (colIndex, splitColIndex) {
    if (splitColIndex !== -1 && colIndex >= splitColIndex && $scope.vis.params.computedColsPerSplitCol) {
      return colIndex + 1;
    }
    else {
      return colIndex;
    }
  };

  const getOriginalColIndex = function (colIndex, splitColIndex) {
    if (splitColIndex !== -1 && colIndex > splitColIndex && $scope.vis.params.computedColsPerSplitCol) {
      return colIndex - 1;
    }
    else {
      return colIndex;
    }
  };

  const findColIndexByTitle = function (columns, colTitle, input, inputType, splitColIndex) {

    let columnIndex = -1;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].title === colTitle) {
        columnIndex = i;
        break;
      }
    }

    if (columnIndex !== -1) {
      return getOriginalColIndex(columnIndex, splitColIndex);
    }
    else {
      throw new EnhancedTableError(`Column with label '${colTitle}' does not exist, in ${inputType}: ${input}`);
    }
  };

  const createFormula = function (inputFormula, formulaType, splitColIndex, columns, totalFunc) {

    if (!inputFormula) {
      return undefined;
    }

    let realFormula = inputFormula;

    // convert col[0] syntax to col0 syntax
    realFormula = realFormula.replace(/col\[(\d+)\]/g, 'col$1');

    // convert col['colTitle'] syntax to col0 syntax
    realFormula = realFormula.replace(/col\['([^\]]+)'\]/g, (match, colTitle) => 'col' + findColIndexByTitle(columns, colTitle, inputFormula, formulaType, splitColIndex));

    // set the right column index, depending splitColIndex
    const colRefRegex = /col(\d+)/g;
    realFormula = realFormula.replace(colRefRegex, (match, colIndex) => 'col' + getRealColIndex(parseInt(colIndex), splitColIndex));

    // extract formula param cols
    const formulaParamsCols = [];
    const currentCol = columns.length;
    let regexMatch;
    while ((regexMatch = colRefRegex.exec(realFormula)) !== null) {
      let colIndex = parseInt(regexMatch[1]);
      if (colIndex >= currentCol) {
        colIndex = getOriginalColIndex(colIndex, splitColIndex);
        throw new EnhancedTableError(`Column number ${colIndex} does not exist, in ${formulaType}: ${inputFormula}`);
      }
      formulaParamsCols.push(colIndex);
    }

    // convert total[0] syntax to total0 syntax
    realFormula = realFormula.replace(/total\[(\d+)\]/g, 'total$1');

    // convert total['colTitle'] syntax to total0 syntax
    realFormula = realFormula.replace(/total\['([^\]]+)'\]/g, (match, colTitle) => 'total' + findColIndexByTitle(columns, colTitle, inputFormula, formulaType, splitColIndex));

    // set the right total index, depending splitColIndex
    const totalRefRegex = /total(\d+)/g;
    realFormula = realFormula.replace(totalRefRegex, (match, colIndex) => 'total' + getRealColIndex(parseInt(colIndex), splitColIndex));

    // add 'row' param for functions that require whole row
    realFormula = realFormula.replace(/(col)\s*\(/g, '$1(row, ');
    realFormula = realFormula.replace(/(sumSplitCols)\s*\(/g, '$1(row');

    // add 'table' param for functions that require whole table
    realFormula = realFormula.replace(/(total)\s*\(/g, '$1(table, ');

    // replace 'total' variable by 'totalHits'
    realFormula = realFormula.replace(/([^\w]|^)total([^\(\w]|$)/g, '$1totalHits$2');

    // check 'sumSplitCols/countSplitCols' functions condition
    if ((realFormula.indexOf('sumSplitCols') !== -1 || realFormula.indexOf('countSplitCols') !== -1) && splitColIndex === -1) {
      throw new EnhancedTableError(`sumSplitCols() and countSplitCols() functions must be used with a "Split cols" bucket, in ${formulaType}: ${inputFormula}`);
    }

    // extract formula param totals
    const formulaParamsTotals = [];
    while ((regexMatch = totalRefRegex.exec(realFormula)) !== null) {
      let colIndex = parseInt(regexMatch[1]);
      if (colIndex >= currentCol) {
        colIndex = getOriginalColIndex(colIndex, splitColIndex);
        throw new EnhancedTableError(`Column number ${colIndex} does not exist, in ${formulaType}: ${inputFormula}`);
      }
      formulaParamsTotals.push(colIndex);
    }

    // create formula parser with custom functions
    const parser = new Parser();
    parser.functions.now = function () {
      return Date.now();
    };
    parser.functions.indexOf = function (strOrArray, searchValue, fromIndex) {
      return strOrArray.indexOf(searchValue, fromIndex);
    };
    parser.functions.lastIndexOf = function (strOrArray, searchValue, fromIndex) {
      if (fromIndex) {
        return strOrArray.lastIndexOf(searchValue, fromIndex);
      }
      else {
        return strOrArray.lastIndexOf(searchValue);
      }
    };
    parser.functions.replace = function (str, substr, newSubstr) {
      return str.replace(substr, newSubstr);
    };
    parser.functions.replaceRegexp = function (str, regexp, newSubstr) {
      return str.replace(new RegExp(regexp, 'g'), newSubstr);
    };
    parser.functions.search = function (str, regexp) {
      return str.search(regexp);
    };
    parser.functions.substring = function (str, indexStart, indexEnd) {
      return str.substring(indexStart, indexEnd);
    };
    parser.functions.toLowerCase = function (str) {
      return str.toLowerCase();
    };
    parser.functions.toUpperCase = function (str) {
      return str.toUpperCase();
    };
    parser.functions.trim = function (str) {
      return str.trim();
    };
    parser.functions.encodeURIComponent = function (str) {
      return encodeURIComponent(str);
    };
    parser.functions.sort = function (array, compareFunction) {
      if (!Array.isArray(array)) {
        array = [array];
      }
      return array.sort(compareFunction);
    };
    parser.functions.uniq = function (array) {
      if (!Array.isArray(array)) {
        array = [array];
      }
      return _.uniq(array);
    };
    parser.functions.isArray = function (value) {
      return Array.isArray(value);
    };
    parser.functions.col = function (row, colRef, defaultValue) {
      try {
        let colIndex = colRef;
        if (typeof colRef === 'string') {
          colIndex = findColIndexByTitle(columns, colRef, inputFormula, formulaType, splitColIndex);
        }
        if (colIndex < currentCol) {
          colIndex = getRealColIndex(colIndex, splitColIndex);
          const colValue = row[colIndex].value;
          return colValue !== undefined ? colValue : defaultValue;
        }
        else {
          return defaultValue;
        }
      }
      catch (e) {
        return defaultValue;
      }
    };
    parser.functions.total = function (table, colRef, defaultValue) {
      try {
        let colIndex = colRef;
        if (typeof colRef === 'string') {
          colIndex = findColIndexByTitle(columns, colRef, inputFormula, formulaType, splitColIndex);
        }
        if (colIndex < currentCol) {
          colIndex = getRealColIndex(colIndex, splitColIndex);
          if (columns[colIndex].total === undefined) {
            columns[colIndex].total = computeColumnTotal(colIndex, totalFunc, table);
          }
          const colTotal = columns[colIndex].total;
          return colTotal !== undefined ? colTotal : defaultValue;
        }
        else {
          return defaultValue;
        }
      }
      catch (e) {
        return defaultValue;
      }
    };
    parser.functions.sumSplitCols = function (row) {
      let splitCol = splitColIndex;
      let sum = 0;
      while (splitCol < currentCol && columns[splitCol].formula === undefined) {
        sum += row[splitCol].value;
        splitCol++;
      }
      return sum;
    };
    parser.functions.countSplitCols = function () {
      let splitCol = splitColIndex;
      let count = 0;
      while (splitCol < currentCol && columns[splitCol].formula === undefined) {
        count++;
        splitCol++;
      }
      return count;
    };
    parser.functions.parseDate = function (dateString) {
      return Date.parse(dateString);
    };

    // parse formula and return final formula object
    try {
      return {
        expression: parser.parse(realFormula),
        paramsCols: formulaParamsCols,
        paramsTotals: formulaParamsTotals,
        totalFunc: totalFunc,
        formulaType: formulaType,
        inputFormula: inputFormula
      };
    }
    catch (e) {
      throw new EnhancedTableError(`${e.message}, invalid expression in ${formulaType}: ${inputFormula}`);
    }
  };

  const computeFormulaValue = function (formula, table, row, totalHits, timeRange, cellValue) {
    try {
      const formulaParams = { totalHits: totalHits, table: table, row: row, timeRange: timeRange, value: cellValue };

      // inject column value references
      _.forEach(formula.paramsCols, function (formulaParamCol) {
        formulaParams[`col${formulaParamCol}`] = row[formulaParamCol].value;
      });

      // inject column total references
      _.forEach(formula.paramsTotals, function (formulaParamTotal) {
        if (table.columns[formulaParamTotal].total === undefined) {
          table.columns[formulaParamTotal].total = computeColumnTotal(formulaParamTotal, formula.totalFunc, table);
        }
        formulaParams[`total${formulaParamTotal}`] = table.columns[formulaParamTotal].total;
      });

      const value = formula.expression.evaluate(formulaParams);
      return value;
    }
    catch(e) {
      throw new EnhancedTableError(`${e.message}, invalid expression in ${formula.formulaType}: ${formula.inputFormula}`);
    }
  };

  const createTemplate = function (computedColumn, splitColIndex, columns, totalFunc) {

    if (!computedColumn.applyTemplate) {
      return undefined;
    }

    // convert old col.i.value syntax and manage 'split cols' case
    let realTemplate = computedColumn.template.replace(/col\.(\d+)\.value\s*\}\}/g, 'col$1}}');

    // convert col[0] syntax to col0 syntax
    realTemplate = realTemplate.replace(/col\[(\d+)\]\s*\}\}/g, 'col$1}}');

    // convert col['colTitle'] syntax to col0 syntax
    realTemplate = realTemplate.replace(/col\['([^\]]+)'\]\s*\}\}/g, (match, colTitle) => 'col' + findColIndexByTitle(columns, colTitle, computedColumn.template, 'template', splitColIndex) + '}}');

    // set the right column index, depending splitColIndex
    const colRefRegex = /col(\d+)\s*\}\}/g;
    realTemplate = realTemplate.replace(colRefRegex, (match, colIndex) => 'col' + getRealColIndex(parseInt(colIndex), splitColIndex) + '}}');

    // add template param cols
    const templateParamsCols = [];
    let regexMatch;
    while ((regexMatch = colRefRegex.exec(realTemplate)) !== null) {
      const colIndex = parseInt(regexMatch[1]);
      templateParamsCols.push(colIndex);
    }

    // convert total[0] syntax to total0 syntax
    realTemplate = realTemplate.replace(/total\[(\d+)\]\s*\}\}/g, 'total$1}}');

    // convert total['colTitle'] syntax to total0 syntax
    realTemplate = realTemplate.replace(/total\['([^\]]+)'\]\s*\}\}/g, (match, colTitle) => 'total' + findColIndexByTitle(columns, colTitle, computedColumn.template, 'template', splitColIndex) + '}}');

    // replace 'total' variable by 'totalHits'
    realTemplate = realTemplate.replace(/\{\{\s*total\s*\}\}/g, '{{totalHits}}');

    // set the right total index, depending splitColIndex
    const totalRefRegex = /total(\d+)\s*\}\}/g;
    realTemplate = realTemplate.replace(totalRefRegex, (match, colIndex) => 'total' + getRealColIndex(parseInt(colIndex), splitColIndex) + '}}');

    // add template param totals
    const templateParamsTotals = [];
    while ((regexMatch = totalRefRegex.exec(realTemplate)) !== null) {
      let colIndex = parseInt(regexMatch[1]);
      templateParamsTotals.push(colIndex);
    }

    // return final template object
    return {
      compiledTemplate: handlebars.compile(realTemplate),
      paramsCols: templateParamsCols,
      paramsTotals: templateParamsTotals,
      totalFunc: totalFunc
    };
  };

  const renderCell = function (contentType) {
    let result = this.column.fieldFormatter.convert(this.value);
    if (this.templateContext !== undefined) {
      this.templateContext.value = result;
      result = this.column.template.compiledTemplate(this.templateContext);
    }
    if (contentType !== 'html') {
      result = result.replace(/<(?:.|\n)*?>/gm, '');
    }
    else {
      result = { 'markup': result, 'class': this.column.dataAlignmentClass };
    }
    return result;
  };

  /** create a new data table column for specified computed column */
  const createColumn = function (computedColumn, index, totalHits, splitColIndex, columns, showTotal, totalFunc) {

    const FieldFormat = fieldFormats.getType(computedColumn.format);
    const fieldFormatParamsByFormat = {
      'string': {},
      'number': { pattern: computedColumn.pattern },
      'date': { pattern: computedColumn.datePattern }
    };
    const fieldFormatParams = fieldFormatParamsByFormat[computedColumn.format];
    const aggSchema = (computedColumn.format === 'number') ? 'metric' : 'bucket';
    const aggType = (computedColumn.format === 'number') ? 'count' : 'filter';

    // create new column object
    const newColumn = {
      id: `computed-col-${index}`,
      aggConfig: new AggConfig($scope.vis.aggs, { schema: aggSchema, type: aggType }),
      title: computedColumn.label,
      fieldFormatter: new FieldFormat(fieldFormatParams, getConfig),
      dataAlignmentClass: `text-${computedColumn.alignment}`,
      formula: createFormula(computedColumn.formula, 'computed column', splitColIndex, columns, totalFunc),
      template: createTemplate(computedColumn, splitColIndex, columns, totalFunc),
      cellComputedCssFormula: createFormula(computedColumn.cellComputedCss, 'Cell computed CSS', splitColIndex, columns, totalFunc)
    };

    // check that computed column formula is defined
    if (newColumn.formula === undefined) {
      throw new EnhancedTableError(`'Formula' is required, in computed column: ${computedColumn.label}`);
    }

    // check that customColumnPosition is valid
    if (computedColumn.customColumnPosition || computedColumn.customColumnPosition === 0) {
      if (typeof computedColumn.customColumnPosition !== 'number') {
        throw new EnhancedTableError(`'Custom column position' must be a number, in computed column: ${computedColumn.formula}`);
      }
      if (computedColumn.customColumnPosition < 0 || computedColumn.customColumnPosition > columns.length) {
        throw new EnhancedTableError(`'Custom column position' must be between 0 and ${columns.length}, in computed column: ${computedColumn.formula}`);
      }
    }

    // if computed column formula is just a simple column reference (ex: col0), then copy its aggConfig to get filtering feature
    const simpleColRefMatch = newColumn.formula.expression.toString().match(/^\s*col(\d+)\s*$/);
    if (simpleColRefMatch) {
      const simpleColRefIndex = simpleColRefMatch[1];
      const simpleColRef = columns[simpleColRefIndex];
      if (simpleColRef.aggConfig.isFilterable()) {
        newColumn.aggConfig = new AggConfig(simpleColRef.aggConfig.aggConfigs, simpleColRef.aggConfig);
      }
    }

    // define aggConfig identifiers
    newColumn.aggConfig.id = `1.computed-column-${index}`;
    newColumn.aggConfig.key = `computed-column-${index}`;

    // add alignment options
    if (computedColumn.applyAlignmentOnTotal) {
      newColumn.totalAlignmentClass = newColumn.dataAlignmentClass;
    }
    if (computedColumn.applyAlignmentOnTitle) {
      newColumn.titleAlignmentClass = newColumn.dataAlignmentClass;
    }

    // process "computeTotalUsingFormula" option
    if (showTotal && computedColumn.computeTotalUsingFormula) {
      const totalFormula = computedColumn.formula.replace(/col(\[|\s*\(|\d+)/g, 'total$1');
      newColumn.totalFormula = createFormula(totalFormula, 'computed total', splitColIndex, columns, totalFunc);
    }

    // add "total" formatter function
    newColumn.aggConfig.fieldFormatter = function (contentType) {
      return function (value) {
        const self = { value: value, column: newColumn };
        if (computedColumn.applyTemplate && computedColumn.applyTemplateOnTotal) {
          self.templateContext = { total: totalHits };
        }
        return renderCell.call(self, contentType);
      };
    };

    return newColumn;
  };

  const createComputedCell = function (table, column, row, totalHits, timeRange) {
    const value = computeFormulaValue(column.formula, table, row, totalHits, timeRange);
    const parent = row.length > 0 && row[row.length-1];
    const newCell = new AggConfigResult(column.aggConfig, parent, value, value);
    newCell.column = column;
    if (column.template !== undefined) {
      newCell.templateContext = createTemplateContext(table, column, row, totalHits, timeRange);
    }
    if (column.cellComputedCssFormula !== undefined) {
      newCell.cssStyle = computeFormulaValue(column.cellComputedCssFormula, table, row, totalHits, timeRange, value);
    }
    newCell.toString = renderCell;
    return newCell;
  };

  const addComputedColumnToTables = function (tables, newColumn, customColumnPosition, totalHits, timeRange) {
    _.forEach(tables, function (table) {
      if (table.tables) {
        addComputedColumnToTables(table.tables, newColumn, customColumnPosition, totalHits, timeRange);
        return;
      }

      // add new computed column and its cells
      newColumn = _.clone(newColumn);
      if (customColumnPosition || customColumnPosition === 0) {
        table.columns.splice(customColumnPosition, 0, newColumn);
      }
      else {
        table.columns.push(newColumn);
      }
      _.forEach(table.rows, function (row) {
        const newCell = createComputedCell(table, newColumn, row, totalHits, timeRange);
        if (customColumnPosition || customColumnPosition === 0) {
          row.splice(customColumnPosition, 0, newCell);
        }
        else {
          row.push(newCell);
        }
        row[newColumn.id] = newCell.value;
      });

      // compute total if totalFormula is present
      if (newColumn.totalFormula) {
        newColumn.total = computeFormulaValue(newColumn.totalFormula, table, null, totalHits, timeRange);
      }

    });
  };

  const processLinesComputedFilter = function (tables, linesComputedFilterFormula, totalHits, timeRange) {
    return _.filter(tables, function (table) {
      if (table.tables) {
        table.tables = processLinesComputedFilter(table.tables, linesComputedFilterFormula, totalHits, timeRange);
        return table.tables.length > 0;
      }

      table.rows = _.filter(table.rows, function (row) {
        return computeFormulaValue(linesComputedFilterFormula, table, row, totalHits, timeRange);
      });
      return table.rows.length > 0;
    });
  };

  const processRowsComputedCss = function (table, rowsComputedCssFormula, totalHits, timeRange) {
    if (table.tables) {
      table.tables.forEach(function(subTable) {
        processRowsComputedCss(subTable, rowsComputedCssFormula, totalHits, timeRange);
      });
    }
    else {
      table.rows.forEach(function (row) {
        row.cssStyle = computeFormulaValue(rowsComputedCssFormula, table, row, totalHits, timeRange);
      });
    }
  };

  const processRowsComputedOptions = function (tableGroups, columns, params, splitColIndex, totalHits, timeRange) {
    // process lines computed filter
    if (params.linesComputedFilter) {
      const linesComputedFilterFormula = createFormula(params.linesComputedFilter, 'Rows computed filter', splitColIndex, columns, params.totalFunc);
      tableGroups.tables = processLinesComputedFilter(tableGroups.tables, linesComputedFilterFormula, totalHits, timeRange);
    }

    // process rows computed CSS
    if (params.rowsComputedCss) {
      const rowsComputedCssFormula = createFormula(params.rowsComputedCss, 'Rows computed CSS', splitColIndex, columns, params.totalFunc);
      processRowsComputedCss(tableGroups, rowsComputedCssFormula, totalHits, timeRange);
    }
  };

  const isInt = (item) => {
    return /^ *[0-9]+ *$/.test(item);
  };

  const hideColumns = function (tables, hiddenColumns, splitColIndex) {
    // recursively call sub-tables
    _.forEach(tables, function (table) {
      if (table.tables) {
        hideColumns(table.tables, hiddenColumns, splitColIndex);
        return;
      }

      if (splitColIndex !== -1 && table.rows.length > 0) {
        table.refRowWithHiddenCols = _.clone(table.rows[0]);
      }

      // retrieve real col indices
      let hiddenColumnIndices = _.map(hiddenColumns, function (item) {
        try {
          if (!isInt(item)) {
            item = findColIndexByTitle(table.columns, item, item, 'hidden column', splitColIndex);
          }
          return getRealColIndex(parseInt(item), splitColIndex);
        }
        catch(e) {
          return table.columns.length;
        }
      });

      // sort from higher to lower index and keep uniq indices
      hiddenColumnIndices = _.uniq(hiddenColumnIndices.sort( (a,b) => b - a));

      // remove hidden columns
      _.forEach(hiddenColumnIndices, function (colToRemove) {
        if (colToRemove < table.columns.length) {
          table.columns.splice(colToRemove, 1);
          _.forEach(table.rows, function (row) {
            row.splice(colToRemove, 1);
          });
        }
      });
    });
  };

  const shouldShowPagination = function (tables, perPage) {
    return tables.some(function (table) {
      if (table.tables) {
        return shouldShowPagination(table.tables, perPage);
      }
      else {
        return table.rows.length > perPage;
      }
    });
  };

  const rowContainsFilterTerm = function (row, termToFind, filterCaseSensitive) {
    return row.some(function (cell) {
      if (cell.column && cell.column.id === 'add-row-numbers-col') {
        return false;
      }
      let cellValue = cell.toString();
      if (typeof cellValue === 'string') {
        if (!filterCaseSensitive) {
          cellValue = cellValue.toLowerCase();
        }
        return cellValue.includes(termToFind);
      }
      return false;
    });
  };

  const filterTableRows = function (tables, activeFilterTerms, filterCaseSensitive) {
    const filteredTables = _.map(tables, (table) => _.clone(table));
    return _.filter(filteredTables, function (table) {
      if (table.tables) {
        table.tables = filterTableRows(table.tables, activeFilterTerms, filterCaseSensitive);
        return table.tables.length > 0;
      }
      else {
        table.rows = _.filter(table.rows, function (row) {
          return activeFilterTerms.every(function (filterTerm) {
            return rowContainsFilterTerm(row, filterTerm, filterCaseSensitive);
          });
        });
        return table.rows.length > 0;
      }
    });
  };

  const findFirstDataTable = function (table) {
    if (table.tables) {
      if (table.tables.length > 0) {
        return findFirstDataTable(table.tables[0]);
      }
      else {
        return null;
      }
    }
    else {
      return table;
    }
  };

  const DEFAULT_METRIC_VALUE = 0;

  const splitCols = function (table, splitColIndex, totalHits, timeRange) {

    // process only real tables (with rows)
    if (table.tables) {
      _.forEach(table.tables, function (table) {
        splitCols(table, splitColIndex, totalHits, timeRange);
      });
      return;
    }

    // define ref row for computed columns
    const refRowForComputedColumn = (table.refRowWithHiddenCols !== undefined) ? table.refRowWithHiddenCols : _.clone(table.rows[0]);
    for (let i = 0; i < refRowForComputedColumn.length; i++) {
      const cell = refRowForComputedColumn[i];
      if (cell.column !== undefined) {
        refRowForComputedColumn[i] = createComputedCell(table, cell.column, refRowForComputedColumn, totalHits, timeRange);
      }
      else if (cell.type === 'metric') {
        refRowForComputedColumn[i] = new AggConfigResult(cell.aggConfig, null, DEFAULT_METRIC_VALUE, DEFAULT_METRIC_VALUE, cell.filters);
      }
    }

    // initialize new column headers
    const newCols = [];
    for (let i = 0; i < splitColIndex; i++) {
      newCols.push(table.columns[i]);
    }

    // compute new table rows
    const newRows = [];
    let newRow = null;
    const newColNamePrefixes = [];
    const newColDefaultMetrics = [];
    const metricsCount = table.columns.length - 1 - splitColIndex;

    _.forEach(table.rows, function (row) {

      // detect if we should create a row
      let createNewRow = (newRow === null);
      if (!createNewRow) {
        for (let i = 0; i < splitColIndex; i++) {
          if (row[i].value !== newRow[i].value) {
            createNewRow = true;
            break;
          }
        }
      }

      // create a new row
      if (createNewRow) {
        newRow = [];
        for (let i = 0; i < splitColIndex; i++) {
          newRow.push(row[i]);
          newRow[table.columns[i].id] = row[i].value;
        }
        newRows.push(newRow);
      }

      // split col
      const rowSplitColValue = row[splitColIndex].toString();
      let newColIndex = _.indexOf(newColNamePrefixes, rowSplitColValue);

      // create new col
      if (newColIndex === -1) {
        newColNamePrefixes.push(rowSplitColValue);
        newColIndex = newColNamePrefixes.length - 1;
        for (let i = splitColIndex+1; i < row.length; i++) {
          const newCol = _.clone(table.columns[i]);
          newCol.title = metricsCount > 1 ? rowSplitColValue + ' - ' + newCol.title : rowSplitColValue;
          newCols.push(newCol);
          let newColDefaultMetric;
          if (newCol.formula === undefined) {
            newColDefaultMetric = new AggConfigResult(row[i].aggConfig, null, DEFAULT_METRIC_VALUE, DEFAULT_METRIC_VALUE, row[i].filters);
          }
          else {
            newColDefaultMetric = createComputedCell(table, newCol, refRowForComputedColumn, totalHits, timeRange);
          }
          newColDefaultMetrics.push(newColDefaultMetric);
          for (let j = 0; j < newRows.length - 1; j++) {
            newRows[j].push(newColDefaultMetric);
          }
        }
      }

      // add new col metrics
      for (let i = 0; i < metricsCount; i++) {
        newRow[splitColIndex + (newColIndex * metricsCount) + i] = row[splitColIndex + 1 + i];
      }
      for (let i = 0; i < newColDefaultMetrics.length; i++) {
        const targetCol = splitColIndex + i;
        if (newRow[targetCol] === undefined) {
          newRow[targetCol] = newColDefaultMetrics[i];
        }
      }
    });

    // update rows
    table.rows = newRows;

    // update cols
    table.columns = newCols;
  };

  const notifyError = function(errorMessage) {
    notifier.error(errorMessage);
  };

  const colToStringWithHighlightResults = function(initialToString, scope, contentType) {
    let result = initialToString.call(this, contentType);
    if ($scope.filterHighlightRegex !== null && contentType === 'html' && (!this.column || this.column.id !== 'add-row-numbers-col')) {
      if (typeof result === 'string') {
        result = { 'markup': result };
      }
      if (result.markup.indexOf('<span') === -1) {
        result.markup = `<span>${result.markup}</span>`;
      }
      result.markup = result.markup.replace(/>([^<>]+)</g, function (match, group) {
        return '>' + group.replace($scope.filterHighlightRegex, '<mark>$1</mark>') + '<';
      });
    }
    return result;
  };

  const addRowNumberColumn = function (table, aggs) {
    if (table.tables) {
      table.tables.forEach(subTable => addRowNumberColumn(subTable, aggs));
    }
    else {
      // add row number column in first position
      const fieldFormat = fieldFormats.getInstance('number');
      const newColumn = {
        id: 'add-row-numbers-col',
        aggConfig: new AggConfig($scope.vis.aggs, { schema: 'bucket', type: 'filter' }),
        title: '#',
        fieldFormatter: fieldFormat,
        dataAlignmentClass: 'text-left'
      };
      table.columns.unshift(newColumn);
      let i = 1;
      // add row number cells in first position
      table.rows.forEach(row => {
        const newCell = new AggConfigResult(newColumn.aggConfig, null, i, i);
        newCell.column = newColumn;
        newCell.toString = renderCell;
        row.unshift(newCell);
        row[newColumn.id] = newCell.value;
        ++i;
      });
    }
  };

  const hasRows = function(table) {
    if (table.tables) {
      return table.tables.some(hasRows);
    }
    else {
      return table.rows.length > 0;
    }
  };

  // filter scope methods
  $scope.doFilter = function () {
    $scope.activeFilter = $scope.vis.filterInput;
  };

  $scope.enableFilterInput = function () {
    $scope.filterInputEnabled = true;
  };

  $scope.disableFilterInput = function () {
    $scope.filterInputEnabled = false;
    $scope.activeFilter = $scope.vis.filterInput = '';
  };

  $scope.showFilterInput = function () {
    return !$scope.visState.params.filterBarHideable || $scope.filterInputEnabled;
  };

  // init controller state
  $scope.activeFilter = $scope.vis.filterInput = '';

  const uiStateSort = ($scope.uiState) ? $scope.uiState.get('vis.params.sort') : {};
  _.assign($scope.visParams.sort, uiStateSort);

  $scope.sort = $scope.visParams.sort;
  $scope.$watchCollection('sort', function (newSort) {
    $scope.uiState.set('vis.params.sort', newSort);
  });


  /** process filter submitted by user and refresh displayed table */
  const processFilterBarAndRefreshTable = function() {

    if ($scope.tableGroups !== undefined) {
      let tableGroups = $scope.esResponse;
      const vis = $scope.vis;
      const params = vis.params;

      // init filterInput & filterHighlightRegex
      if ($scope.vis.filterInput === undefined) {
        $scope.vis.filterInput = $scope.activeFilter;
      }
      $scope.filterHighlightRegex = null;

      // process filter bar
      if (params.showFilterBar && $scope.showFilterInput() && $scope.activeFilter !== undefined && $scope.activeFilter !== '') {

        // compute activeFilterTerms
        const activeFilter = params.filterCaseSensitive ? $scope.activeFilter : $scope.activeFilter.toLowerCase();
        let activeFilterTerms = [ activeFilter ];
        if (params.filterTermsSeparately) {
          activeFilterTerms = activeFilter.replace(/ +/g, ' ').split(' ');
        }

        // compute filterHighlightRegex
        if (params.filterHighlightResults) {
          const filterHighlightRegexString = '(' + _.sortBy(activeFilterTerms, term => term.length * -1).map(term => _.escapeRegExp(term)).join('|') + ')';
          $scope.filterHighlightRegex = new RegExp(filterHighlightRegexString, 'g' + (!params.filterCaseSensitive ? 'i' : ''));
        }

        // filter table rows to display
        tableGroups = _.clone(tableGroups);
        tableGroups.tables = filterTableRows(tableGroups.tables, activeFilterTerms, params.filterCaseSensitive);
      }

      // check if there are rows to display
      const hasSomeRows = hasRows(tableGroups);

      // set conditional css classes
      const showPagination = hasSomeRows && params.perPage && shouldShowPagination(tableGroups.tables, params.perPage);
      $scope.tableVisContainerClass = {
        'hide-pagination': !showPagination,
        'hide-export-links': params.hideExportLinks,
        'striped-rows': params.stripedRows
      };
      $scope.isDarkTheme = getConfig('theme:darkMode');

      // update $scope
      $scope.hasSomeRows = hasSomeRows;
      if (hasSomeRows) {
        $scope.tableGroups = tableGroups;
      }

      // force render if 'Highlight results' is enabled
      if (hasSomeRows && $scope.filterHighlightRegex !== null) {
        tableGroups.tables.some(function cloneFirstRow(table) {
          if (table.tables) return table.tables.some(cloneFirstRow);
          if (table.rows.length > 0) {
            const clonedRow = _.clone(table.rows[0]);
            table.columns.forEach(function (column) {
              if (table.rows[0][column.id] !== undefined) {
                clonedRow[column.id] = table.rows[0][column.id];
              }
            });
            table.rows[0] = clonedRow;
            return true;
          }
          return false;
        });
      }
    }

  };

  // listen activeFilter field changes, to filter results
  $scope.$watch('activeFilter', processFilterBarAndRefreshTable);


  /**
   * Recreate the entire table when:
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   */
  $scope.$watch('renderComplete', function watchRenderComplete() {

    try {

      if ($scope.esResponse && !$scope.esResponse.enhanced) {

        // init tableGroups
        $scope.hasSomeRows = null;
        $scope.hasSomeData = null;
        $scope.tableGroups = null;
        const tableGroups = $scope.esResponse;
        const totalHits = $scope.vis.searchSource.rawResponse.hits.total;
        tableGroups.enhanced = true;
        const params = $scope.visParams;
        const aggs = $scope.esResponse.aggs;
        const timeRange = computeTimeRange(aggs.timeRange, getConfig('dateFormat:dow'));

        // validate that 'Split Cols' is the last bucket
        const firstTable = findFirstDataTable(tableGroups);
        let splitColIndex = findSplitColIndex(firstTable);
        if (splitColIndex !== -1) {
          const lastBucketIndex = _.findLastIndex(firstTable.columns, col => col.aggConfig.schema.group === 'buckets');
          if (splitColIndex !== lastBucketIndex) {
            throw new EnhancedTableError('"Split Cols" bucket must be the last one');
          }
        }

        // no data to display
        if (firstTable === null || firstTable.rows.length === 0) {
          $scope.hasSomeRows = false;
          $scope.hasSomeData = false;
          $scope.renderComplete();
          return;
        }

        // process 'Split Cols' bucket: transform rows to cols
        if (splitColIndex !== -1 && !params.computedColsPerSplitCol) {
          splitCols(tableGroups, splitColIndex, totalHits, timeRange);
        }

        // add computed columns
        _.forEach(params.computedColumns, function (computedColumn, index) {
          if (computedColumn.enabled) {
            const newColumn = createColumn(computedColumn, index, totalHits, splitColIndex, firstTable.columns, params.showTotal, params.totalFunc);
            addComputedColumnToTables(tableGroups.tables, newColumn, computedColumn.customColumnPosition, totalHits, timeRange);
          }
        });

        // process rows computed options : lines computed filter and rows computed CSS (no split cols)
        if (splitColIndex === -1) {
          processRowsComputedOptions(tableGroups, firstTable.columns, params, splitColIndex, totalHits, timeRange);
        }

        // remove hidden columns
        if (params.hiddenColumns) {
          hideColumns(tableGroups.tables, params.hiddenColumns.split(','), splitColIndex);
        }

        // process 'Split Cols' bucket: transform rows to cols
        if (splitColIndex !== -1 && params.computedColsPerSplitCol) {
          splitColIndex = findSplitColIndex(firstTable);
          splitCols(tableGroups, splitColIndex, totalHits, timeRange);
        }

        // process rows computed options : lines computed filter and rows computed CSS (split cols)
        if (splitColIndex !== -1) {
          processRowsComputedOptions(tableGroups, firstTable.columns, params, -1, totalHits, timeRange);
        }

        // add total label
        if (params.showTotal && params.totalLabel !== '') {
          tableGroups.tables.forEach(function setTotalLabel(table) {
            if (table.tables)
              table.tables.forEach(setTotalLabel);
            else
              table.totalLabel = params.totalLabel;
          });
        }

        // add row number column
        if (params.addRowNumberColumn) {
          addRowNumberColumn(tableGroups, $scope.vis.aggs);
        }

        // prepare filter highlight results rendering
        if (params.showFilterBar && params.filterHighlightResults) {
          tableGroups.tables.forEach(function redefineColToString(table) {
            if (table.tables) {
              table.tables.forEach(redefineColToString);
            }
            else {
              table.rows.forEach(function(row) {
                row.forEach(function (col) {
                  col.toString = colToStringWithHighlightResults.bind(col, col.toString, $scope);
                });
              });
            }
          });
        }

        // compute if there is some data before filtering
        $scope.hasSomeData = hasRows(tableGroups);

        // process filter bar
        processFilterBarAndRefreshTable();
      }

      $scope.renderComplete();

    }
    catch (e) {
      if (e instanceof EnhancedTableError) {
        notifyError(e.message);
      }
      else {
        throw e;
      }
    }
  });
});
