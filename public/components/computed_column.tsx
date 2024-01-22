import { clone } from 'lodash';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDraggable, EuiIconTip, EuiSpacer, EuiAccordion, EuiToolTip, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';

import { NumberInputOption, SelectOption } from '@kbn/vis-default-editor-plugin/public';
import { SwitchOption } from './switch';
import { TextInputOption } from './text_input';


export interface ComputedColumn {
  label: string;
  formula: string;
  computeTotalUsingFormula: boolean;
  format: string;
  pattern: string;
  datePattern: string;
  durationInputFormat: string;
  durationOutputFormat: string;
  durationOutputPrecision: number;
  durationShowSuffix: boolean;
  durationUseShortSuffix: boolean;
  durationIncludeSpaceWithSuffix: boolean;
  alignment: string;
  applyAlignmentOnTitle: boolean;
  applyAlignmentOnTotal: boolean;
  applyTemplate: boolean;
  applyTemplateOnTotal: boolean;
  template: string;
  cellComputedCss: string;
  customColumnPosition: number | '' | undefined;
  enabled: boolean;
  brandNew?: boolean;
}

function setComputedColumnParam(paramName: string, paramValue: any, computedColumns: ComputedColumn[], computedColumnToUpdate: ComputedColumn, setComputedColumns) {
  const newList = computedColumns.map(computedColumn => {
    if (computedColumn === computedColumnToUpdate) {
      const updatedComputedColumn = clone(computedColumnToUpdate);
      updatedComputedColumn[paramName] = paramValue;
      return updatedComputedColumn;
    }
    else {
      return computedColumn;
    }
  });
  setComputedColumns(newList);
}

function removeComputedColumn(computedColumns: ComputedColumn[], computedColumnToRemove: ComputedColumn, setComputedColumns) {
  const newList = computedColumns.filter(computedColumn => computedColumn !== computedColumnToRemove);
  setComputedColumns(newList);
}

function renderButtons (computedColumn, computedColumns, showError, setValue, setComputedColumns, dragHandleProps) {
  const actionIcons: any[] = [];

  if (showError) {
    actionIcons.push({
      id: 'hasErrors',
      color: 'danger',
      type: 'alert',
      tooltip: i18n.translate('visTypeEnhancedTable.params.computedColumns.errorsAriaLabel', {
        defaultMessage: 'Computed column has errors',
      })
    });
  }

  if (computedColumn.enabled) {
    actionIcons.push({
      id: 'disableComputedColumn',
      color: 'text',
      disabled: false,
      type: 'eye',
      onClick: () => setValue('enabled', false),
      tooltip: i18n.translate('visTypeEnhancedTable.params.computedColumns.disableColumnButtonTooltip', {
        defaultMessage: 'Disable column',
      })
    });
  }
  if (!computedColumn.enabled) {
    actionIcons.push({
      id: 'enableComputedColumn',
      color: 'text',
      type: 'eyeClosed',
      onClick: () => setValue('enabled', true),
      tooltip: i18n.translate('visTypeEnhancedTable.params.computedColumns.enableColumnButtonTooltip', {
        defaultMessage: 'Enable column',
      })
    });
  }
  if (computedColumns.length > 1) {
    actionIcons.push({
      id: 'dragHandle',
      type: 'grab',
      tooltip: i18n.translate('visTypeEnhancedTable.params.computedColumns.modifyPriorityButtonTooltip', {
        defaultMessage: 'Modify order by dragging',
      })
    });
  }
  actionIcons.push({
    id: 'removeComputedColumn',
    color: 'danger',
    type: 'cross',
    onClick: () => removeComputedColumn(computedColumns, computedColumn, setComputedColumns),
    tooltip: i18n.translate('visTypeEnhancedTable.params.computedColumns.removeColumnButtonTooltip', {
      defaultMessage: 'Remove column',
    })
  });

  return (
    <div {...dragHandleProps}>
      {actionIcons.map(icon => {
        if (icon.id === 'dragHandle') {
          return (
            <EuiIconTip
              key={icon.id}
              type={icon.type}
              content={icon.tooltip}
              iconProps={{
                ['aria-label']: icon.tooltip
              }}
              position="bottom"
            />
          );
        }

        return (
          <EuiToolTip key={icon.id} position="bottom" content={icon.tooltip}>
            <EuiButtonIcon
              disabled={icon.disabled}
              iconType={icon.type}
              color={icon.color as EuiButtonIconProps['color']}
              onClick={icon.onClick}
              aria-label={icon.tooltip}
            />
          </EuiToolTip>
        );
      })}
    </div>
  );
}

function formatOptions() {
  return [
    {
      value: 'number',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.formatOptions.number', {
        defaultMessage: 'Number',
      }),
    },
    {
      value: 'string',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.formatOptions.string', {
        defaultMessage: 'String',
      }),
    },
    {
      value: 'date',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.formatOptions.date', {
        defaultMessage: 'Date',
      }),
    },
    {
      value: 'duration',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.formatOptions.duration', {
        defaultMessage: 'Duration',
      }),
    }
  ];
}

function durationInputFormatOptions() {
  return [
    {
      value: 'milliseconds',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.milliseconds', {
        defaultMessage: 'Milliseconds',
      }),
    },
    {
      value: 'seconds',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.seconds', {
        defaultMessage: 'Seconds',
      }),
    },
    {
      value: 'minutes',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.minutes', {
        defaultMessage: 'Minutes',
      }),
    },
    {
      value: 'hours',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.hours', {
        defaultMessage: 'Hours',
      }),
    },
    {
      value: 'days',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.days', {
        defaultMessage: 'Days',
      }),
    },
    {
      value: 'weeks',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.weeks', {
        defaultMessage: 'Weeks',
      }),
    },
    {
      value: 'months',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.months', {
        defaultMessage: 'Months',
      }),
    },
    {
      value: 'years',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationInputFormatOptions.years', {
        defaultMessage: 'Years',
      }),
    }
  ];
}

function durationOutputFormatOptions() {
  return [
    {
      value: 'humanize',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.humanize', {
        defaultMessage: 'Human-readable (approximate)',
      }),
    },
    {
      value: 'humanizePrecise',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.humanizePrecise', {
        defaultMessage: 'Human-readable (precise)',
      }),
    },
    {
      value: 'humanizeVeryPrecise',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.humanizeVeryPrecise', {
        defaultMessage: 'Human-readable (very precise)',
      }),
    },
    {
      value: 'asMilliseconds',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.milliseconds', {
        defaultMessage: 'Milliseconds',
      }),
    },
    {
      value: 'asSeconds',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.seconds', {
        defaultMessage: 'Seconds',
      }),
    },
    {
      value: 'asMinutes',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.minutes', {
        defaultMessage: 'Minutes',
      }),
    },
    {
      value: 'asHours',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.hours', {
        defaultMessage: 'Hours',
      }),
    },
    {
      value: 'asDays',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.days', {
        defaultMessage: 'Days',
      }),
    },
    {
      value: 'asWeeks',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.weeks', {
        defaultMessage: 'Weeks',
      }),
    },
    {
      value: 'asMonths',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.months', {
        defaultMessage: 'Months',
      }),
    },
    {
      value: 'asYears',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputFormatOptions.years', {
        defaultMessage: 'Years',
      }),
    }
  ];
}

function alignmentOptions() {
  return [
    {
      value: 'left',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.alignmentOptions.left', {
        defaultMessage: 'left',
      }),
    },
    {
      value: 'right',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.alignmentOptions.right', {
        defaultMessage: 'right',
      }),
    },
    {
      value: 'center',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.alignmentOptions.center', {
        defaultMessage: 'center',
      }),
    },
    {
      value: 'justify',
      text: i18n.translate('visTypeEnhancedTable.params.computedColumns.alignmentOptions.justify', {
        defaultMessage: 'justify',
      }),
    },
  ];
}

function ComputedColumnEditor({
  computedColumns,
  computedColumn,
  index,
  setComputedColumns,
  setValidity
}) {

  const setValue = (paramName, paramValue) => setComputedColumnParam(paramName, paramValue, computedColumns, computedColumn, setComputedColumns);
  const [isEditorOpen, setIsEditorOpen] = React.useState(computedColumn.brandNew);
  const [validState, setValidState] = React.useState(true);
  const showDescription = !isEditorOpen && validState;
  const showError = !isEditorOpen && !validState;
  const isFormulaValid = computedColumn.formula !== '';
  const isCustomColumnPositionValid = (computedColumn.customColumnPosition === undefined || computedColumn.customColumnPosition === '' || computedColumn.customColumnPosition >= 0);
  const isDurationOutputPrecisionValid = (computedColumn.durationOutputPrecision === undefined || computedColumn.durationOutputPrecision === '' || computedColumn.durationOutputPrecision >= 0);

  if (computedColumn.brandNew) {
    computedColumn.brandNew = undefined;
  }

  const buttonContent = (
    <>
      Computed col {showDescription && <span>{computedColumn.label || computedColumn.formula}</span>}
    </>
  );

  const onToggle = React.useCallback(
    (isOpen: boolean) => {
      setIsEditorOpen(isOpen);
    },
    []
  );

  useEffect(() => {
    setValidity(isFormulaValid, isCustomColumnPositionValid, isDurationOutputPrecisionValid);
    setValidState(isFormulaValid && isCustomColumnPositionValid && isDurationOutputPrecisionValid);
  }, [isFormulaValid, isCustomColumnPositionValid, isDurationOutputPrecisionValid, setValidity, setValidState]);

  return (
    <>
      <EuiDraggable
        key={index}
        index={index}
        draggableId={`enhanced_table_computed_columns_draggable_${index}`}
        customDragHandle={true}
      >
        {provided => (
          <EuiAccordion
            id={`enhanced_table_computed_columns_accordion_${index}`}
            initialIsOpen={isEditorOpen}
            buttonContent={buttonContent}
            buttonClassName="eui-textTruncate"
            buttonContentClassName="visEditorSidebar__aggGroupAccordionButtonContent eui-textTruncate"
            className="visEditorSidebar__section visEditorSidebar__collapsible visEditorSidebar__collapsible--marginBottom"
            aria-label={i18n.translate('visTypeEnhancedTable.params.computedColumns.toggleEditorButtonAriaLabel', {
              defaultMessage: 'Toggle computed column editor'
            })}
            extraAction={renderButtons(computedColumn, computedColumns, showError, setValue, setComputedColumns, provided.dragHandleProps)}
            onToggle={onToggle}
          >
            <>
              <EuiSpacer size="m" />

              <TextInputOption
                label={i18n.translate('visTypeEnhancedTable.params.computedColumns.label', {
                  defaultMessage: 'Label',
                })}
                paramName="label"
                value={computedColumn.label}
                setValue={setValue}
              />

              <TextInputOption
                label={
                  <>
                    <FormattedMessage
                      id="visTypeEnhancedTable.params.computedColumns.formula"
                      defaultMessage="Formula"
                    />
                    &nbsp;(
                      <a href="https://github.com/fbaligand/kibana-enhanced-table/blob/master/README.md#computed-settings-documentation" target="_blank">documentation</a>
                    )
                  </>
                }
                isInvalid={!isFormulaValid}
                paramName="formula"
                value={computedColumn.formula}
                setValue={setValue}
              />

              <SwitchOption
                label={i18n.translate('visTypeEnhancedTable.params.computedColumns.computeTotalUsingFormula', {
                  defaultMessage: 'Compute total using formula',
                })}
                paramName="computeTotalUsingFormula"
                value={computedColumn.computeTotalUsingFormula}
                setValue={setValue}
              />

              <SelectOption
                label={i18n.translate('visTypeTable.params.computedColumns.format', {
                  defaultMessage: 'Format',
                })}
                options={formatOptions()}
                paramName="format"
                value={computedColumn.format}
                setValue={setValue}
              />

              {computedColumn.format === 'number' &&
                <TextInputOption
                  label={
                    <>
                      <FormattedMessage
                        id="visTypeEnhancedTable.params.computedColumns.pattern"
                        defaultMessage="Pattern"
                      />
                      &nbsp;(
                        <a href="http://numeraljs.com/#format" target="_blank">Numeral.js</a>
                      &nbsp;syntax)
                    </>
                  }
                  paramName="pattern"
                  value={computedColumn.pattern}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'date' &&
                <TextInputOption
                  label={
                    <>
                      <FormattedMessage
                        id="visTypeEnhancedTable.params.computedColumns.datePattern"
                        defaultMessage="Pattern"
                      />
                      &nbsp;(
                        <a href="http://momentjs.com/docs/#/displaying/format/" target="_blank">Moment.js</a>
                      &nbsp;syntax)
                    </>
                  }
                  paramName="datePattern"
                  value={computedColumn.datePattern}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'duration' &&
                <SelectOption
                  label={i18n.translate('visTypeTable.params.computedColumns.durationInputFormat', {
                    defaultMessage: 'Input format',
                  })}
                  options={durationInputFormatOptions()}
                  paramName="durationInputFormat"
                  value={computedColumn.durationInputFormat}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'duration' &&
                <SelectOption
                  label={i18n.translate('visTypeTable.params.computedColumns.durationOutputFormat', {
                    defaultMessage: 'Output format',
                  })}
                  options={durationOutputFormatOptions()}
                  paramName="durationOutputFormat"
                  value={computedColumn.durationOutputFormat}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'duration' && computedColumn.durationOutputFormat !== 'humanize' && computedColumn.durationOutputFormat !== 'humanizeVeryPrecise' &&
                <NumberInputOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.durationOutputPrecision', {
                    defaultMessage: 'Decimal places',
                  })}
                  isInvalid={!isDurationOutputPrecisionValid}
                  min={0}
                  paramName="durationOutputPrecision"
                  value={computedColumn.durationOutputPrecision}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'duration' && !computedColumn.durationOutputFormat?.startsWith('humanize') &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.durationShowSuffix', {
                    defaultMessage: 'Show suffix',
                  })}
                  paramName="durationShowSuffix"
                  value={computedColumn.durationShowSuffix}
                  setValue={setValue}
                />
              }

              {computedColumn.format === 'duration' && computedColumn.durationOutputFormat !== 'humanize' &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.durationUseShortSuffix', {
                    defaultMessage: 'Use short suffix',
                  })}
                  paramName="durationUseShortSuffix"
                  value={computedColumn.durationUseShortSuffix}
                  setValue={setValue}
                  disabled={!computedColumn.durationShowSuffix && !computedColumn.durationOutputFormat?.startsWith('humanize')}
                />
              }

              {computedColumn.format === 'duration' && computedColumn.durationOutputFormat !== 'humanize' &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.durationIncludeSpaceWithSuffix', {
                    defaultMessage: 'Include space between suffix and value',
                  })}
                  paramName="durationIncludeSpaceWithSuffix"
                  value={computedColumn.durationIncludeSpaceWithSuffix}
                  setValue={setValue}
                  disabled={!computedColumn.durationShowSuffix && !computedColumn.durationOutputFormat?.startsWith('humanize')}
                />
              }

              <SelectOption
                label={i18n.translate('visTypeTable.params.computedColumns.alignment', {
                  defaultMessage: 'Alignment',
                })}
                options={alignmentOptions()}
                paramName="alignment"
                value={computedColumn.alignment}
                setValue={setValue}
              />

              {computedColumn.alignment !== 'left' &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.applyAlignmentOnTitle', {
                    defaultMessage: 'Apply alignment on title',
                  })}
                  paramName="applyAlignmentOnTitle"
                  value={computedColumn.applyAlignmentOnTitle}
                  setValue={setValue}
                />
              }

              {computedColumn.alignment !== 'left' &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.applyAlignmentOnTotal', {
                    defaultMessage: 'Apply alignment on total',
                  })}
                  paramName="applyAlignmentOnTotal"
                  value={computedColumn.applyAlignmentOnTotal}
                  setValue={setValue}
                />
              }

              <SwitchOption
                label={i18n.translate('visTypeEnhancedTable.params.computedColumns.applyTemplate', {
                  defaultMessage: 'Apply template',
                })}
                paramName="applyTemplate"
                value={computedColumn.applyTemplate}
                setValue={setValue}
              />

              {computedColumn.applyTemplate &&
                <SwitchOption
                  label={i18n.translate('visTypeEnhancedTable.params.computedColumns.applyTemplateOnTotal', {
                    defaultMessage: 'Apply template on total',
                  })}
                  paramName="applyTemplateOnTotal"
                  value={computedColumn.applyTemplateOnTotal}
                  setValue={setValue}
                />
              }

              {computedColumn.applyTemplate &&
                <TextInputOption
                  label={
                    <>
                      <FormattedMessage
                        id="visTypeEnhancedTable.params.computedColumns.template"
                        defaultMessage="Template"
                      />
                      &nbsp;(
                        <a href="https://handlebarsjs.com/guide/expressions.html" target="_blank">Handlebars</a>
                      &nbsp;syntax)
                    </>
                  }
                  paramName="template"
                  value={computedColumn.template}
                  setValue={setValue}
                />
              }

              <TextInputOption
                label={
                  <>
                    <FormattedMessage
                      id="visTypeEnhancedTable.params.computedColumns.cellComputedCss"
                      defaultMessage="Cell computed CSS"
                    />
                    &nbsp;(
                    <a href="https://github.com/fbaligand/kibana-enhanced-table/blob/master/README.md#computed-settings-documentation" target="_blank">documentation</a>
                    )&nbsp;
                    <EuiIconTip
                      content="This option lets to define dynamically table cell CSS (like background-color CSS property), based on this column value and previous column values"
                      position="right"
                    />
                  </>
                }
                placeholder="value < 0 ? &quot;background-color: red&quot; : &quot;&quot;"
                paramName="cellComputedCss"
                value={computedColumn.cellComputedCss}
                setValue={setValue}
              />

              <NumberInputOption
                label={
                  <>
                    <FormattedMessage
                      id="visTypeEnhancedTable.params.computedColumns.customColumnPosition"
                      defaultMessage="Custom column position"
                    />{' '}
                    <EuiIconTip
                      content="You can change here the computed column target position to a previous position. For example, '0' will move this column at first position. Despite 'target' column position, formula can reference any previous column to the 'declared' column position, including classic and computed columns."
                      position="right"
                    />
                  </>
                }
                isInvalid={!isCustomColumnPositionValid}
                min={0}
                paramName="customColumnPosition"
                value={computedColumn.customColumnPosition}
                setValue={setValue}
              />

            </>
          </EuiAccordion>
        )}
      </EuiDraggable>
    </>
  );
}

export { ComputedColumnEditor };
