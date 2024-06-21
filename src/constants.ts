import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export const ALL = 'All';
export const RESOURCE = 'Resource';
export const SPAN = 'Span';
export const RESOURCE_ATTR = 'resource.';
export const SPAN_ATTR = 'span.';

export enum ROUTES {
  Explore = 'explore',
}
