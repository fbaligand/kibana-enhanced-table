import { EmbeddableApiContext, apiHasAppContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { VisTypeDefinition } from '@kbn/visualizations-plugin/public';

import { TablePluginStartDependencies } from './plugin';

  export function registerUIActions(deps: TablePluginStartDependencies, visTypeDefinition: () => VisTypeDefinition<any>, visCapitalizedName: string) {

    const panelActionId = `add${visCapitalizedName}PanelAction`;
    deps.uiActions.registerActionAsync(panelActionId, async () => {
      return getAddPanelAction(deps, visTypeDefinition, visCapitalizedName);
    });

    deps.uiActions.attachAction(ADD_PANEL_TRIGGER, panelActionId);

    // Add UI actions to Kibana Canvas (commented until it works fine)
    /*
    if (deps.uiActions.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
      // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
      // the create action if the Canvas-specific trigger does indeed exist.
      deps.uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', panelActionId);
    }
    */
  }


export function getAddPanelAction(deps: TablePluginStartDependencies, visTypeDefinition: () => VisTypeDefinition<any>, panelActionId: string) {

  const visType = visTypeDefinition();

  return {
    id: panelActionId,
    getIconType: () => visType.icon as string,
    order: 0,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const stateTransferService = deps.embeddable.getStateTransfer();
      const defaultDataViewId = await deps.dataViews.getDefaultId();

      stateTransferService.navigateToEditor('visualize', {
        path: `#/create?type=${visType.name}&indexPattern=${defaultDataViewId}`,
        state: {
          originatingApp: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().currentAppId
            : '',
          originatingPath: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().getCurrentPath?.()
            : undefined,
          searchSessionId: deps.data.search.session.getSessionId(),
        },
      });
    },
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getDisplayName: () => visType.title,
    getDisplayNameTooltip: () => visType.description,
  };
}
