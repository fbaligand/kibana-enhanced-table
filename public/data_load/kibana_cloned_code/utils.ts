/**
 * Inspired from: '../../../../../src/plugins/data/common/search/tabify/response_writer.ts'
 * Function: response
 */
export function serializeAggConfig(aggConfig) {
  const sourceParams = {
    indexPatternId: aggConfig.getIndexPattern().id,
    ...aggConfig.serialize()
  };

  return {
    type: aggConfig.type.name,
    indexPatternId: sourceParams.indexPatternId,
    aggConfigParams: sourceParams.params,
    source: 'esaggs',
    sourceParams
  };
}
