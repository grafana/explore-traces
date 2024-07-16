import { reportInteraction } from '@grafana/runtime';
import pluginJson from '../plugin.json';

// Helper function to create a unique interaction name for analytics
const createInteractionName = (page: UserEventPagesType, action: string) => {
  return `${pluginJson.id.replace(/-/g, '_')}_${page}_${action}`;
};

// Runs reportInteraction with a standardized interaction name
export const reportAppInteraction = (
  page: UserEventPagesType,
  action: UserEventActionType,
  properties?: Record<string, unknown>
) => {
  reportInteraction(createInteractionName(page, action), properties);
};

export const USER_EVENTS_PAGES = {
  starting_page: 'starting_page',
  analyse_traces: 'analyse_traces',
  common: 'common',
} as const;

export type UserEventPagesType = keyof typeof USER_EVENTS_PAGES;
type UserEventActionType =
  | keyof (typeof USER_EVENTS_ACTIONS)['starting_page']
  | keyof (typeof USER_EVENTS_ACTIONS)['analyse_traces']
  | keyof (typeof USER_EVENTS_ACTIONS)['common'];

export const USER_EVENTS_ACTIONS = {
  [USER_EVENTS_PAGES.starting_page]: {
    metric_card_clicked: 'metric_card_clicked',
    add_to_filters_clicked: 'add_to_filters_clicked',
    analyze_traces_clicked: 'analyze_traces_clicked',
    analyze_current: 'analyze_current',
  },
  [USER_EVENTS_PAGES.analyse_traces]: {
    action_view_changed: 'action_view_changed',
    breakdown_add_to_filters_clicked: 'breakdown_add_to_filters_clicked',
    comparison_add_to_filters_clicked: 'comparison_add_to_filters_clicked',
    select_attribute_in_comparison_clicked: 'select_attribute_in_comparison_clicked',
    layout_type_changed: 'layout_type_changed',
    start_investigation: 'start_investigation',
    stop_investigation: 'stop_investigation',
    open_trace: 'open_trace',
  },
  [USER_EVENTS_PAGES.common]: {
    metric_changed: 'metric_changed',
    new_filter_added_manually: 'new_filter_added_manually',
    app_initialized: 'app_initialized',
  },
} as const;
