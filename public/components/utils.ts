import { i18n } from '@osd/i18n';

export enum AggTypes {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

export const totalAggregations = [
  {
    value: AggTypes.SUM,
    text: i18n.translate('visTypeTable.totalAggregations.sumText', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: AggTypes.AVG,
    text: i18n.translate('visTypeTable.totalAggregations.averageText', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: AggTypes.MIN,
    text: i18n.translate('visTypeTable.totalAggregations.minText', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: AggTypes.MAX,
    text: i18n.translate('visTypeTable.totalAggregations.maxText', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: AggTypes.COUNT,
    text: i18n.translate('visTypeTable.totalAggregations.countText', {
      defaultMessage: 'Count',
    }),
  },
];
