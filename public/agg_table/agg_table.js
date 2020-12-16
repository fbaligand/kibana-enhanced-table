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

import _ from 'lodash';
import { encode } from 'iconv-lite';

import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../../src/plugins/share/public';

import aggTableTemplate from './agg_table.html';
import { getFormatService } from '../services';
import { fieldFormatter } from '../field_formatter';import { computeColumnTotal } from '../column_total_computer';
import { handleCourierRequest } from '../data_load/kibana_cloned_code/courier';
import { createTable } from '../data_load/document-table-response-handler';
import { streamSaver } from './stream_saver';

export function KbnEnhancedAggTable(config, RecursionHelper) {
  const fieldFormats = getFormatService();
  const numberFormatter = fieldFormats.getDefaultInstance('number').getConverterFor('text');

  return {
    restrict: 'E',
    template: aggTableTemplate,
    scope: {
      table: '=',
      perPage: '=?',
      sort: '=?',
      exportTitle: '=?',
      showTotal: '=',
      totalFunc: '=',
      filter: '=',
      csvExportWithTotal: '=',
      csvFullExport: '=',
      csvEncoding: '=',
      fieldColumns: '='
    },
    controllerAs: 'aggTable',
    compile: function ($el) {
    // Use the compile function from the RecursionHelper,
    // And return the linking function(s) which it returns
      return RecursionHelper.compile($el);
    },
    controller: function ($scope) {
      const self = this;

      self._saveAs = require('@elastic/filesaver').saveAs;
      self.csv = {
        separator: config.get(CSV_SEPARATOR_SETTING),
        quoteValues: config.get(CSV_QUOTE_VALUES_SETTING),
        maxHitsSize: 10000
      };

      self.exportAsCsv = async function (formatted) {
        const table = $scope.table;

        if ($scope.csvFullExport && self.csv.totalHits === undefined) {
          self.csv.totalHits = _.get(table.request.searchSource, 'finalResponse.hits.total', -1);
        }

        if ($scope.csvFullExport && self.csv.totalHits > table.rows.length) {
          self.exportFullAsCsv(formatted, table.request);
        }
        else {
          const csvContent = self.toCsv(table, formatted, true);
          const csvBlob = new Blob([csvContent], { type: 'text/plain;charset=' + $scope.csvEncoding });
          self._saveAs(csvBlob, self.csv.filename);
        }
      };

      self.exportFullAsCsv = async function (formatted, request) {

        // store initial table last sort value
        if (self.csv.lastSortValue === undefined) {
          const initialHits = _.get(request.searchSource, 'finalResponse.hits.hits', []);
          self.csv.lastSortValue = initialHits[initialHits.length - 1].sort;
        }

        // write rendered table
        let csvBuffer = self.toCsv($scope.table, formatted, true);
        const fileStream = streamSaver.createWriteStream(self.csv.filename, { size: csvBuffer.byteLength * self.csv.totalHits / $scope.table.rows.length });
        const fileWriter = fileStream.getWriter();
        fileWriter.write(csvBuffer);

        // abort download if browser tab is closed
        window.onunload = () => {
          fileStream.abort();
        };

        // query and store next hits
        let remainingSize = self.csv.totalHits - $scope.table.rows.length;
        let searchAfter = self.csv.lastSortValue;
        do {
          let hitsSize = Math.min(remainingSize, self.csv.maxHitsSize);
          request.searchSource.setField('size', hitsSize);
          request.searchSource.setField('search_after', searchAfter);
          const response = await handleCourierRequest(request);
          response.aggs = request.aggs;
          response.hits = _.get(request.searchSource, 'finalResponse.hits.hits', []);
          response.fieldColumns = $scope.fieldColumns;
          const table = createTable(response);
          csvBuffer = self.toCsv(table, formatted, false);
          try {
            fileWriter.write(csvBuffer);
          }
          catch (e) {
            fileWriter.abort();
          }
          remainingSize -= hitsSize;
          searchAfter = response.hits.length > 0 && response.hits[response.hits.length - 1].sort;
        } while (remainingSize > 0);

        fileWriter.close();
    };

      self.toCsv = function (table, formatted, addHeaderColumns) {
        const rows = table.rows;
        const columns = formatted ? $scope.formattedColumns : table.columns;
        const nonAlphaNumRE = /[^a-zA-Z0-9]/;
        const allDoubleQuoteRE = /"/g;

        function escape(val) {
          if (!formatted && _.isObject(val)) val = val.valueOf();
          val = String(val);
          if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
            val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
          }
          return val;
        }

        // escape each cell in each row
        const csvRows = rows.map(function (row) {
          return row.map(escape);
        });

        // add column headers
        if (addHeaderColumns) {
          csvRows.unshift(columns.map(function (col) {
            return escape(col.title);
          }));
        }

        // add total row (if requested)
        if ($scope.csvExportWithTotal) {
          csvRows.push(columns.map(function (col) {
            return col.total !== undefined ? escape(col.total) : '';
          }));
        }

        let csvContent = csvRows.map(function (row) {
          return row.join(self.csv.separator) + '\r\n';
        }).join('');

        // encode csv
          const csvBuffer = encode(csvContent, $scope.csvEncoding);

        // return csv content as a Buffer
          return csvBuffer;
      };

      $scope.$watch('table', function () {
        const table = $scope.table;

        if (!table) {
          $scope.rows = null;
          $scope.formattedColumns = null;
          return;
        }

        self.csv.filename = ($scope.exportTitle || table.title || 'export') + '.csv';
        $scope.rows = table.rows;
        $scope.formattedColumns = table.columns.map(function (col, i) {
          const agg = col.aggConfig;
          const field = agg.getField();
          const formattedColumn = {
            title: col.title,
            filterable: field && field.filterable && agg.type.type === 'buckets',
            titleAlignmentClass: col.titleAlignmentClass,
            totalAlignmentClass: col.totalAlignmentClass
          };

          const last = i === (table.columns.length - 1);

          if (last || (agg.type.type === 'metrics')) {
            formattedColumn.class = 'visualize-table-right';
          }

          if ($scope.showTotal) {
            if (col.total === undefined) {
              col.total = computeColumnTotal(i, $scope.totalFunc, table);
            }

            if (col.total !== undefined) {
              const formatter = col.totalFormatter ? col.totalFormatter('text') : ($scope.totalFunc !== 'count' ? fieldFormatter(agg, 'text') : numberFormatter);
              formattedColumn.total = formatter(col.total);
            }

            if (i === 0 && table.totalLabel !== undefined && table.columns.length > 0 && formattedColumn.total === undefined) {
              col.total = table.totalLabel;
              formattedColumn.total = table.totalLabel;
            }
          }

          return formattedColumn;
        });
      });
    }
  };
}
