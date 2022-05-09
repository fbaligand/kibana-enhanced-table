import $ from 'jquery';
import _ from 'lodash';
import AggConfigResult from '../data_load/agg_config_result';
import tableCellFilterHtml from './table_cell_filter.html';
import tableCellDataFetchHtml from './table_cell_download.html';
import Overlay from './overlay';

const overlay = new Overlay();

export function KbnEnhancedRows($compile) {
  return {
    restrict: 'A',
    link: function ($scope, $el, attr) {
      let documentIds = [];

      function addCell($tr, contents, iColumn, row) {
        function createCell() {
          return $(document.createElement('td'));
        }

        function createFilterableCell(aggConfigResult) {
          const $template = $(tableCellFilterHtml);
          $template.addClass('kbnTableCellFilter__hover');

          const scope = $scope.$new();

          scope.onFilterClick = (event, negate) => {
            // Don't add filter if a link was clicked.
            if ($(event.target).is('a')) {
              return;
            }

            $scope.filter({
              name: 'filterBucket',
              data: {
                data: [
                  {
                    table: $scope.table,
                    row: $scope.rows.findIndex((r) => r === row),
                    column: iColumn,
                    value: aggConfigResult.value,
                  },
                ],
                negate,
              },
            });
          };

          return $compile($template)(scope);
        }

        function openDocumentOverlay(documentId, documentIdList) {
          overlay.createDocOverlay(documentId, documentIdList);
          overlay.fetchDocument(documentId);
        }

        function createDataFetchCell(aggConfigResult) {
          const $template = $(tableCellDataFetchHtml);
          $template.addClass('kbnEnhancedTableCellFilter__hover');

          const scope = $scope.$new();
          documentIds.push(aggConfigResult.value);

          scope.onDownloadClick = (event, negate) => {
            // Don't add doc download if a link was clicked.
            if ($(event.target).is('a')) {
              return;
            }
            openDocumentOverlay(aggConfigResult.value, documentIds);
          };

          return $compile($template)(scope);
        }

        let $cell;
        let $cellContent;

        if (contents instanceof AggConfigResult) {
          const field = contents.aggConfig.getField();
          const isCellDownloadAble = contents.aggConfig.schema === 'dataFetch';
          const isCellContentFilterable =
            contents.aggConfig.isFilterable()
            && (!field || field.filterable);

          if (isCellContentFilterable && !isCellDownloadAble) {
            $cell = createFilterableCell(contents);
            $cellContent = $cell.find('[data-cell-content]');
          } else if (isCellDownloadAble) {
            $cell = createDataFetchCell(contents);
            $cellContent = $cell.find('[data-cell-content]');
          } else {
            $cell = $cellContent = createCell();
          }

          if (row.cssStyle !== undefined || contents.cssStyle  !== undefined) {
            let cssStyle = (row.cssStyle !== undefined) ? row.cssStyle : '';
            if (contents.cssStyle  !== undefined) {
              cssStyle += '; ' + contents.cssStyle;
            }
            $cell.attr('style', cssStyle);
            if (cssStyle.indexOf('background') !== -1) {
              $cell.addClass('cell-custom-background-hover');
            }
          }

          // An AggConfigResult can "enrich" cell contents by applying a field formatter,
          // which we want to do if possible.
          contents = contents.toString('html');
        } else {
          $cell = $cellContent = createCell();
        }

        if (_.isObject(contents)) {

          if (contents.class) {
            $cellContent.addClass(contents.class);
          }

          if (contents.scope) {
            $cellContent = $compile($cellContent.prepend(contents.markup))(contents.scope);
          } else {
            $cellContent.prepend(contents.markup);
          }

          if (contents.attr) {
            $cellContent.attr(contents.attr);
          }
        } else {
          if (contents === '') {
            $cellContent.prepend('&nbsp;');
          } else {
            $cellContent.prepend(contents);
          }
        }

        $tr.append($cell);
      }

      function maxRowSize(max, row) {
        return Math.max(max, row.length);
      }

      $scope.$watchMulti([
        attr.kbnEnhancedRows,
        attr.kbnEnhancedRowsMin
      ], function (vals) {
        let rows = vals[0];
        const min = vals[1];

        $el.empty();

        if (!Array.isArray(rows)) rows = [];
        const width = rows.reduce(maxRowSize, 0);

        if (isFinite(min) && rows.length < min) {
          // clone the rows so that we can add elements to it without upsetting the original
          rows = _.clone(rows);
          // crate the empty row which will be pushed into the row list over and over
          const emptyRow = new Array(width);
          // fill the empty row with values
          _.times(width, function (i) { emptyRow[i] = ''; });
          // push as many empty rows into the row array as needed
          _.times(min - rows.length, function () { rows.push(emptyRow); });
        }

        rows.forEach(function (row) {
          const $tr = $(document.createElement('tr')).appendTo($el);
          $scope.columns.forEach(function (column, iColumn) {
            const value = row[iColumn];
            addCell($tr, value, iColumn, row);
          });
        });
      });
    }
  };
}
