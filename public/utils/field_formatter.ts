import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IAggConfig } from '@kbn/data-plugin/public';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { getFormatService } from '../services';

/**
 * Returns the fieldFormatter function associated to aggConfig, for the requested contentType (html or text).
 * Returned fieldFormatter is a function, whose prototype is: fieldFormatter(value, options?)
 */
export function fieldFormatter(aggConfig: IAggConfig, contentType?: string) {
  const fieldFormat: IFieldFormat = getFormatService().deserialize(aggConfig.toSerializedFieldFormat());
  if (contentType === 'html') {
    return (value: any) => {
      let result = fieldFormat.convertToReact(value);
      if (isValidElement(result)) {
        result = renderToStaticMarkup(result);
      }
      return result;
    };
  }
  else {
    return fieldFormat.convertToText.bind(fieldFormat);
  }
}
