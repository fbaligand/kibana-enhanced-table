import { getFormatService } from '../services';
import { IAggConfig } from '../../../../src/plugins/data/public';
import { IFieldFormat, FieldFormatsContentType } from '../../../../src/plugins/field_formats/common';

/**
 * Returns the fieldFormatter function associated to aggConfig, for the requested contentType (html or text).
 * Returned fieldFormatter is a function, whose prototype is: fieldFormatter(value, options?)
 */
export function fieldFormatter(aggConfig: IAggConfig, contentType: FieldFormatsContentType) {
  const fieldFormat: IFieldFormat = getFormatService().deserialize(aggConfig.toSerializedFieldFormat());
  return fieldFormat.getConverterFor(contentType);
}
