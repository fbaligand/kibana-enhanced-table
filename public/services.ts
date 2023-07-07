import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { VisualizationsStart } from '@kbn/visualizations-plugin/public';

export const [getFormatService, setFormatService] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getDataViewsStart, setDataViewsStart] =
  createGetterSetter<DataViewsPublicPluginStart>('dataViews');

export const [getSearchService, setSearchService] =
  createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getVisualization, setVisualization] =
  createGetterSetter<VisualizationsStart>('Visualization');
