import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { dispatchCommand } from '../commands/app-commands';

type WindowProvider = () => BrowserWindow | null;

export function createApplicationMenu(windowProvider: WindowProvider): void {
  const command = (commandId: Parameters<typeof dispatchCommand>[0]): (() => void) => {
    return (): void => dispatchCommand(commandId, windowProvider());
  };

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File…',
          accelerator: 'CommandOrControl+O',
          click: command('media.open-file'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play / Pause',
          accelerator: 'Space',
          click: command('playback.toggle'),
        },
        {
          label: 'Seek Backward',
          accelerator: 'Left',
          click: command('playback.seek-backward'),
        },
        {
          label: 'Seek Forward',
          accelerator: 'Right',
          click: command('playback.seek-forward'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Control+Command+F',
          click: command('view.toggle-fullscreen'),
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CommandOrControl+Shift+S',
          click: command('view.toggle-sidebar'),
        },
      ],
    },
    {
      role: 'windowMenu',
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CommandOrControl+,',
          click: command('app.open-settings'),
        },
        {
          label: 'Export Diagnostics…',
          click: command('app.export-diagnostics'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
