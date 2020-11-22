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
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../../src/plugins/share/public';
import aggTableTemplate from './agg_table.html';
import { getFormatService } from '../services';
import { fieldFormatter } from '../field_formatter';
import { encode } from 'iconv-lite';
import { computeColumnTotal } from '../column_total_computer';

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
      csvEncoding: '='
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
        quoteValues: config.get(CSV_QUOTE_VALUES_SETTING)
      };

      self.exportAsCsv = function (formatted) {
        const csvEncoding = $scope.csvEncoding || 'utf-8';
        let csvContent = self.toCsv(formatted);
        if (csvEncoding.toLowerCase() !== 'utf-8') {
          csvContent = encode(csvContent, csvEncoding);
        }
        const csv = new Blob([csvContent], { type: 'text/plain;charset=' + csvEncoding });
        self._saveAs(csv, self.csv.filename);
      };

      self.toCsv = function (formatted) {
        const rows = $scope.table.rows;
        const columns = formatted ? $scope.formattedColumns : $scope.table.columns;
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

        // add the columns to the rows
        csvRows.unshift(columns.map(function (col) {
          return escape(col.title);
        }));

        // add total row (if requested)
        if ($scope.showTotal && $scope.csvExportWithTotal) {
          csvRows.push(columns.map(function (col) {
            return col.total !== undefined ? escape(col.total) : '';
          }));
        }

        return csvRows.map(function (row) {
          return row.join(self.csv.separator) + '\r\n';
        }).join('');
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
