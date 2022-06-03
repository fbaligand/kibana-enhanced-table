import { createGetterSetter } from '../../../src/plugins/kibana_utils/public';
import { NotificationsStart } from '../../../src/core/public';
import { DataPublicPluginStart, FilterManager, IndexPatternsContract } from '../../../src/plugins/data/public';
import { VisualizationsStart } from '../../../src/plugins/visualizations/public';

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

export const [getIndexPatterns, setIndexPatterns] = createGetterSetter<IndexPatternsContract>(
  'IndexPatterns'
);

export const [getFilterManager, setFilterManager] = createGetterSetter<FilterManager>(
  'FilterManager'
);

export const [getVisualization, setVisualization] = createGetterSetter<VisualizationsStart>(
  'Visualization'
);