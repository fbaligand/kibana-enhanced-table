/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@osd/i18n';
import { IServiceProvider } from 'angular';

export type I18nServiceType = typeof i18n.translate;

export function I18nProvider(): IServiceProvider {
  this.addTranslation = i18n.addTranslation;
  this.getTranslation = i18n.getTranslation;
  this.setLocale = i18n.setLocale;
  this.getLocale = i18n.getLocale;
  this.setDefaultLocale = i18n.setDefaultLocale;
  this.getDefaultLocale = i18n.getDefaultLocale;
  this.setFormats = i18n.setFormats;
  this.getFormats = i18n.getFormats;
  this.getRegisteredLocales = i18n.getRegisteredLocales;
  this.init = i18n.init;
  this.load = i18n.load;
  this.$get = () => i18n.translate;
  return this;
}
