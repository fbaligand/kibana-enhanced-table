export { I18nProvider } from './provider';

export { i18nFilter } from './filter';
export { i18nDirective } from './directive';

// re-export types: https://github.com/babel/babel-loader/issues/603
import { I18nServiceType as _I18nServiceType } from './provider';
export type I18nServiceType = _I18nServiceType;
