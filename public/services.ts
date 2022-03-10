import { createGetterSetter } from '../../../src/plugins/opensearch_dashboards_utils/public';
import { NotificationsStart } from '../../../src/core/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { OpenSearchDashboardsLegacyStart } from '../../../src/plugins/opensearch_dashboards_legacy/public';

export const [getFormatService, setFormatService] = createGetterSetter<
  DataPublicPluginStart['fieldFormats']
>('table data.fieldFormats');

export const [getOpenSearchDashboardsLegacy, setOpenSearchDashboardsLegacy] = createGetterSetter<OpenSearchDashboardsLegacyStart>(
  'table opensearchDashboardsLegacy'
);

export const [getNotifications, setNotifications] = createGetterSetter<
  NotificationsStart
>('Notifications');

export const [getQueryService, setQueryService] = createGetterSetter<
  DataPublicPluginStart['query']
>('Query');

export const [getSearchService, setSearchService] = createGetterSetter<
  DataPublicPluginStart['search']
>('Search');
