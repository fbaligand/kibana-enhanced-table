import { IFieldFormat } from '../../../../../src/plugins/data/common';

/**
 * Clone of: '../../../../../src/plugins/data/public/search/expressions/utils/serialize_agg_config.ts'
 * Component: serializeAggConfig
 */
export function serializeAggConfig(aggConfig) {
  const sourceParams = {
    indexPatternId: aggConfig.getIndexPattern().id,
    ...aggConfig.serialize()
  }

  return {
    type: aggConfig.type.name,
    indexPatternId: sourceParams.indexPatternId,
    aggConfigParams: sourceParams.params,
    source: 'esaggs',
    sourceParams
  };
};

/**
 * Clone of: '../../../../../src/plugins/data/common/field_formats/utils.ts'
 * Component: FormatFactory
*/
export type FormatFactory = (mapping?) => IFieldFormat;
