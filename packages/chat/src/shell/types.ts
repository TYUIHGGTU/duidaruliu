import type { Dispatch, SetStateAction } from 'react';
import type { SettingTab } from '../host';

export type AppMode = 'chat' | 'setting' | string;
export type SetAppMode = Dispatch<SetStateAction<AppMode>>;

export const SHELL_MODE_EVENT = 'ddrl-shell';

const SETTING_TABS = new Set<SettingTab>([
  'ollamaSetting',
  'customModel',
  'mcp',
  'quickCommand',
  'customLink',
]);

export function appModeFromLocation(search = window.location.search): AppMode {
  return (new URLSearchParams(search).get('appMode') as AppMode) || 'chat';
}

export function settingTabFromLocation(search = window.location.search): SettingTab | null {
  const tab = new URLSearchParams(search).get('tab');
  return tab && SETTING_TABS.has(tab as SettingTab) ? (tab as SettingTab) : null;
}
