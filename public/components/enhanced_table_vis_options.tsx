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

import { some } from 'lodash';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiDragDropContext, euiDragDropReorder, EuiDroppable, EuiFlexGroup, EuiFlexItem, EuiFormErrorText, EuiIconTip, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

import { IAggConfigs } from '../../../../src/plugins/data/public';
import { VisOptionsProps } from '../../../../src/plugins/vis_default_editor/public';
import { NumberInputOption, SelectOption } from '../../../../src/plugins/charts/public';
import { SwitchOption } from './switch';
import { TextInputOption } from './text_input';
import { totalAggregations } from '../../../../src/plugins/vis_type_table/public/components/utils';
import { AggTypes } from '../../../../src/plugins/vis_type_table/public/types';
import { ComputedColumn, ComputedColumnEditor } from './computed_column';


interface EnhancedTableVisParams {
  type: 'table';

  // Computed Columns
  computedColumns: ComputedColumn[];
  fieldColumns?: any[];

  // Enhanced Settings
  linesComputedFilter: string;
  hiddenColumns: string;
  computedColsPerSplitCol: boolean;
  hideExportLinks: boolean;
  stripedRows: boolean;

  // Basic Settings
  perPage: number | '';
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  sort: {
    columnIndex: number | null;
    direction: string | null;
  };
  showTotal: boolean;
  totalFunc: AggTypes;
  totalLabel: string;

  // Filter Bar
  showFilterBar: boolean;
  filterCaseSensitive: boolean;
  filterBarHideable: boolean;
  filterAsYouType: boolean;
  filterTermsSeparately: boolean;
  filterHighlightResults: boolean;
  filterBarWidth: string;
}

function addComputedColumn(computedColumns, setComputedColumns) {
  const newComputedColumn = {
    label: 'Value squared',
    formula: 'col0 * col0',
    computeTotalUsingFormula: false,
    format: 'number',
    pattern: '0,0',
    datePattern: 'MMMM Do YYYY, HH:mm:ss.SSS',
    alignment: 'left',
    applyAlignmentOnTitle: true,
    applyAlignmentOnTotal: true,
    applyTemplate: false,
    applyTemplateOnTotal: true,
    template: '{{value}}',
    enabled: true,
    brandNew: true
  };

  setComputedColumns(computedColumns.concat(newComputedColumn));
}

function onDragEnd(source, destination, computedColumns, setComputedColumns) {
  if (source && destination) {
    const newComputedColumns = euiDragDropReorder(computedColumns, source.index, destination.index);
    setComputedColumns(newComputedColumns);
  }
}

function hasSplitColsBucket(aggs: IAggConfigs) {
  return some(aggs.aggs, function(agg) {
    return agg.schema === 'splitcols' && agg.enabled;
  });
};

function EnhancedTableOptions({
  aggs,
  stateParams,
  setValidity,
  setValue,
}: VisOptionsProps<EnhancedTableVisParams>) {

  const isPerPageValid = stateParams.perPage === '' || stateParams.perPage > 0;
  const computedColumnsError = undefined;
  const setComputedColumns = (newComputedColumns) => setValue('computedColumns', newComputedColumns);

  useEffect(() => {
    setValidity(isPerPageValid);
  }, [isPerPageValid, setValidity]);

  return (
    <div className="enhanced-table-vis-params">

      {/* COMPUTED COLUMNS SECTION */}
      <EuiDragDropContext onDragEnd={ ({source, destination}) => onDragEnd(source, destination, stateParams.computedColumns, setComputedColumns) }>
        <EuiPanel paddingSize="s">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="visTypeEnhancedTable.params.computedColumnsSection"
                defaultMessage="Computed Columns"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {computedColumnsError && (
            <>
              <EuiFormErrorText>{computedColumnsError}</EuiFormErrorText>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiDroppable droppableId="enhanced_table_computed_columns">
            <>
              {stateParams.computedColumns.map( (computedColumn, index) => (
                <ComputedColumnEditor
                  key={index}
                  computedColumns={stateParams.computedColumns}
                  computedColumn={computedColumn}
                  index={index}
                  setComputedColumns={setComputedColumns}
                  setValidity={setValidity}
                />
              ))}
            </>
          </EuiDroppable>

          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plusInCircleFilled"
                onClick={ () => addComputedColumn(stateParams.computedColumns, setComputedColumns)}
              >
                <FormattedMessage id="visTypeEnhancedTable.params.computedColumns.addComputedColumnLabel" defaultMessage="Add computed column" />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiPanel>
      </EuiDragDropContext>
      {/* /COMPUTED COLUMNS SECTION */}

      <EuiSpacer size="m" />

      {/* ENHANCED SETTINGS SECTION */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeEnhancedTable.params.enhancedSettingsSection"
              defaultMessage="Enhanced Settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <TextInputOption
          label={
            <>
              <FormattedMessage
                id="visTypeEnhancedTable.params.linesComputedFilter"
                defaultMessage="Lines computed filter"
              />
              &nbsp;(
              <a href="https://github.com/fbaligand/kibana-enhanced-table/blob/master/README.md#computed-column-formula--lines-computed-filter-documentation" target="_blank">documentation</a>
              )&nbsp;
              <EuiIconTip
                content="Example: when 'col0 &gt; 10', only table lines having first column value greater than 10 are displayed"
                position="right"
              />
            </>
          }
          placeholder="col0 > 10"
          paramName="linesComputedFilter"
          value={stateParams.linesComputedFilter}
          setValue={setValue}
        />

        <TextInputOption
          label={
            <>
              <FormattedMessage
                id="visTypeEnhancedTable.params.hiddenColumns"
                defaultMessage="Hidden columns"
              />
              &nbsp;
              <EuiIconTip
                content="Reference a column by its index (1,2,3), by its label (Example Column) or both (1,2,column_3). Write the column label as is (no surrounding quotes) and separate them using a comma. It is recommended to reference a column by its label."
                position="right"
              />
            </>
          }
          placeholder="0,1,Col2 Label,..."
          paramName="hiddenColumns"
          value={stateParams.hiddenColumns}
          setValue={setValue}
        />

        { hasSplitColsBucket(aggs) &&
          <SwitchOption
            label={i18n.translate('visTypeEnhancedTable.params.computedColsPerSplitCol', {
              defaultMessage: 'Computed/Hidden cols per split col',
            })}
            icontip={i18n.translate('visTypeEnhancedTable.params.computedColsPerSplitColIconTip', {
              defaultMessage: 'Example: when enabled, if there is one \'Split cols\' bucket that implies two columns (term1 and term2), one Count metric, and one computed column configured, then in the result table, there will be a computed column for term1 and another computed column for term2 (each displayed after count column)',
            })}
            paramName="computedColsPerSplitCol"
            value={stateParams.computedColsPerSplitCol}
            setValue={setValue}
          />
        }

        <SwitchOption
          label={i18n.translate('visTypeEnhancedTable.params.hideExportLinks', {
            defaultMessage: 'Hide export links',
          })}
          paramName="hideExportLinks"
          value={stateParams.hideExportLinks}
          setValue={setValue}
        />

        <SwitchOption
          label={i18n.translate('visTypeEnhancedTable.params.stripedRows', {
            defaultMessage: 'Striped rows',
          })}
          paramName="stripedRows"
          value={stateParams.stripedRows}
          setValue={setValue}
        />

      </EuiPanel>
      {/* /ENHANCED SETTINGS SECTION */}

      <EuiSpacer size="s" />

      {/* BASIC SETTINGS SECTION */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeEnhancedTable.params.basicSettingsSection"
              defaultMessage="Basic Settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <NumberInputOption
          label={
            <>
              <FormattedMessage
                id="visTypeTable.params.perPageLabel"
                defaultMessage="Max rows per page"
              />{' '}
              <EuiIconTip
                content="Leaving this field empty means it will use number of buckets from the response."
                position="right"
              />
            </>
          }
          isInvalid={!isPerPageValid}
          min={1}
          paramName="perPage"
          value={stateParams.perPage}
          setValue={setValue}
        />

        { !stateParams.fieldColumns &&
          <SwitchOption
            label={i18n.translate('visTypeTable.params.showMetricsLabel', {
              defaultMessage: 'Show metrics for every bucket/level',
            })}
            paramName="showMetricsAtAllLevels"
            value={stateParams.showMetricsAtAllLevels}
            setValue={setValue}
            data-test-subj="showMetricsAtAllLevels"
          />
        }

        { !stateParams.fieldColumns &&
          <SwitchOption
            label={i18n.translate('visTypeTable.params.showPartialRowsLabel', {
              defaultMessage: 'Show partial rows',
            })}
            icontip={i18n.translate('visTypeTable.params.showPartialRowsTip', {
              defaultMessage:
                'Show rows that have partial data. This will still calculate metrics for every bucket/level, even if they are not displayed.',
            })}
            paramName="showPartialRows"
            value={stateParams.showPartialRows}
            setValue={setValue}
            data-test-subj="showPartialRows"
          />
        }

        <SwitchOption
          label={i18n.translate('visTypeTable.params.showTotalLabel', {
            defaultMessage: 'Show total',
          })}
          paramName="showTotal"
          value={stateParams.showTotal}
          setValue={setValue}
        />

        <SelectOption
          label={i18n.translate('visTypeTable.params.totalFunctionLabel', {
            defaultMessage: 'Total function',
          })}
          disabled={!stateParams.showTotal}
          options={totalAggregations}
          paramName="totalFunc"
          value={stateParams.totalFunc}
          setValue={setValue}
        />

        <TextInputOption
          label={i18n.translate('visTypeEnhancedTable.params.totalLabel', {
            defaultMessage: 'Total label',
          })}
          disabled={!stateParams.showTotal}
          paramName="totalLabel"
          value={stateParams.totalLabel}
          setValue={setValue}
        />

      </EuiPanel>
      {/* /BASIC SETTINGS */}

      <EuiSpacer size="s" />

      {/* FILTER BAR SECTION */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeEnhancedTable.params.filterBarSection"
              defaultMessage="Filter Bar"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <SwitchOption
          label={i18n.translate('visTypeEnhancedTable.params.showFilterBar', {
            defaultMessage: 'Show filter bar',
          })}
          paramName="showFilterBar"
          value={stateParams.showFilterBar}
          setValue={setValue}
        />

        { stateParams.showFilterBar && (
          <>
            <SwitchOption
              label={i18n.translate('visTypeEnhancedTable.params.filterCaseSensitive', {
                defaultMessage: 'Case sensitive filter',
              })}
              paramName="filterCaseSensitive"
              value={stateParams.filterCaseSensitive}
              setValue={setValue}
            />

            <SwitchOption
              label={i18n.translate('visTypeEnhancedTable.params.filterBarHideable', {
                defaultMessage: 'Filter bar hideable',
              })}
              paramName="filterBarHideable"
              value={stateParams.filterBarHideable}
              setValue={setValue}
            />

            <SwitchOption
              label={i18n.translate('visTypeEnhancedTable.params.filterAsYouType', {
                defaultMessage: 'Filter as you type',
              })}
              paramName="filterAsYouType"
              value={stateParams.filterAsYouType}
              setValue={setValue}
            />

            <SwitchOption
              label={i18n.translate('visTypeEnhancedTable.params.filterTermsSeparately', {
                defaultMessage: 'Filter each term separately',
              })}
              icontip={i18n.translate('visTypeEnhancedTable.params.filterTermsSeparatelyTooltip', {
                defaultMessage: 'Example with filter set to \'term1 term2\': when this option is enabled, lines with one column containing \'term1\' and another column containing \'term2\' will be displayed. If disabled, only lines with one column containing \'term1 term2\' will be displayed.',
              })}
              paramName="filterTermsSeparately"
              value={stateParams.filterTermsSeparately}
              setValue={setValue}
            />

            <SwitchOption
              label={i18n.translate('visTypeEnhancedTable.params.filterHighlightResults', {
                defaultMessage: 'Highlight results',
              })}
              paramName="filterHighlightResults"
              value={stateParams.filterHighlightResults}
              setValue={setValue}
            />

            <TextInputOption
              label={i18n.translate('visTypeEnhancedTable.params.filterBarWidth', {
                defaultMessage: 'Total label',
              })}
              paramName="filterBarWidth"
              value={stateParams.filterBarWidth}
              setValue={setValue}
            />
          </>
        )}

      </EuiPanel>
      {/* /FILTER BAR SECTION */}

    </div>
  );
}

export { EnhancedTableOptions };
