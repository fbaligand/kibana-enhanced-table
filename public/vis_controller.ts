import { CoreSetup, PluginInitializerContext } from '../../../src/core/public';
import angular, { IModule, auto, IRootScopeService, IScope, ICompileService } from 'angular';
import $ from 'jquery';

import { VisParams, ExprVis } from '../../../src/plugins/visualizations/public';
import { getAngularModule } from './get_inner_angular';
import { initTableVisLegacyModule } from './table_vis_legacy_module';

const innerAngularName = 'opensearch-dashboards/enhanced_table_vis';

export function getEnhancedTableVisualizationController(
  core: CoreSetup,
  context: PluginInitializerContext
) {
  return class EnhancedTableVisualizationController {
    private tableVisModule: IModule | undefined;
    private injector: auto.IInjectorService | undefined;
    el: JQuery<Element>;
    vis: ExprVis;
    $rootScope: IRootScopeService | null = null;
    $scope: (IScope & { [key: string]: any }) | undefined;
    $compile: ICompileService | undefined;

    constructor(domeElement: Element, vis: ExprVis) {
      this.el = $(domeElement);
      this.vis = vis;
    }

    getInjector() {
      if (!this.injector) {
        const mountpoint = document.createElement('div');
        mountpoint.setAttribute('style', 'height: 100%; width: 100%;');
        this.injector = angular.bootstrap(mountpoint, [innerAngularName]);
        this.el.append(mountpoint);
      }

      return this.injector;
    }

    async initLocalAngular() {
      if (!this.tableVisModule) {
        const [coreStart] = await core.getStartServices();
        this.tableVisModule = getAngularModule(innerAngularName, coreStart, context);
        initTableVisLegacyModule(this.tableVisModule);
      }
    }

    async loadFontAwesome() {
      await import('./angular/font_awesome');
    }

    async render(esResponse: object, visParams: VisParams) {
      this.loadFontAwesome();
      await this.initLocalAngular();

      return new Promise((resolve, reject) => {
        if (!this.$rootScope) {
          const $injector = this.getInjector();
          this.$rootScope = $injector.get('$rootScope');
          this.$compile = $injector.get('$compile');
        }
        const updateScope = () => {
          if (!this.$scope) {
            return;
          }

          // How things get into this $scope?
          // To inject variables into this $scope there's the following pipeline of stuff to check:
          // - visualize_embeddable => that's what the editor creates to wrap this Angular component
          // - build_pipeline => it serialize all the params into an Angular template compiled on the fly
          // - table_vis_fn => unserialize the params and prepare them for the final React/Angular bridge
          // - visualization_renderer => creates the wrapper component for this controller and passes the params
          //
          // In case some prop is missing check into the top of the chain if they are available and check
          // the list above that it is passing through
          this.$scope.vis = this.vis;
          this.$scope.visState = { params: visParams, title: visParams.title };
          this.$scope.esResponse = esResponse;

          this.$scope.visParams = visParams;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.$apply();
        };

        if (!this.$scope && this.$compile) {
          this.$scope = this.$rootScope.$new();
          this.$scope.uiState = this.vis.getUiState();
          updateScope();
          this.el.find('div').append(this.$compile(this.vis.type!.visConfig.template)(this.$scope));
          this.$scope.$apply();
        } else {
          updateScope();
        }
      });
    }

    destroy() {
      if (this.$rootScope) {
        this.$rootScope.$destroy();
        this.$rootScope = null;
      }
    }
  };
}
