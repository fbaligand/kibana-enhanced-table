import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { NotificationsStart } from '@kbn/core/public';
import { DataPublicPluginStart, FilterManager, DataViewsContract } from '@kbn/data-plugin/public';
import { VisualizationsStart } from '@kbn/visualizations-plugin/public';

export const [getFormatService, setFormatService] = createGetterSetter<
  DataPublicPluginStart['fieldFormats']
>('table data.fieldFormats');

export const [getNotifications, setNotifications] = createGetterSetter<
  NotificationsStart
>('Notifications');

export const [getQueryService, setQueryService] = createGetterSetter<
  DataPublicPluginStart['query']
>('Query');

export const [getSearchService, setSearchService] = createGetterSetter<
  DataPublicPluginStart['search']
>('Search');

export const [getDataViews, setDataViews] = createGetterSetter<DataViewsContract>(
  'DataViews'
);

export const [getFilterManager, setFilterManager] = createGetterSetter<FilterManager>(
  'FilterManager'
);

export const [getVisualization, setVisualization] = createGetterSetter<VisualizationsStart>(
  'Visualization'
);