import { I18nServiceType } from './provider';

export const i18nFilter: [string, typeof i18nFilterFn] = ['i18n', i18nFilterFn];

function i18nFilterFn(i18n: I18nServiceType) {
  return (id: string, { defaultMessage = '', values = {} } = {}) => {
    return i18n(id, {
      values,
      defaultMessage,
    });
  };
}
