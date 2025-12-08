import { Injectable, IDirectiveFactory, IScope, IAttributes, IController, JQLite } from 'angular';

export const KbnAccessibleClickProvider: Injectable<
  IDirectiveFactory<IScope, JQLite, IAttributes, IController>
>;
