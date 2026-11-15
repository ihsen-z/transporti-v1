import { Alert, DevSettings } from 'react-native';
import { reloadApp } from './reloadApp';

jest.mock('@/core/i18n', () => ({
  __esModule: true,
  default: { t: (key: string, o?: { lng?: string }) => `${key}|${o?.lng ?? ''}` },
}));

const globalWithDev = globalThis as unknown as { __DEV__: boolean };
const initialDev = globalWithDev.__DEV__;

afterEach(() => {
  globalWithDev.__DEV__ = initialDev;
  jest.restoreAllMocks();
});

describe('reloadApp', () => {
  it('en développement : recharge via DevSettings, sans alerte', () => {
    globalWithDev.__DEV__ = true;
    const reload = jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    reloadApp('ar');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });

  it('hors développement : demande de fermer et rouvrir, dans la langue choisie', () => {
    globalWithDev.__DEV__ = false;
    const reload = jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    reloadApp('ar');
    expect(reload).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('lang.restart_title|ar', 'lang.restart_body|ar');
  });
});
