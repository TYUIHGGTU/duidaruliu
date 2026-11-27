import { useEffect, useState } from 'react';
import { Button, Layout, Menu } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { useChatLayout, useMinWidth } from '../../shell/layout';
import {
  SHELL_MODE_EVENT,
  settingTabFromLocation,
  type SetAppMode,
} from '../../shell/types';
import OllamaSetting from './components/ollama';
import CustomModelSetting from './components/customModel';
import McpSetting from './components/mcp';
import CustomLink from './components/customLink';
import QuickCommandSetting from './components/quickCommand';

import Styles from './index.module.less';
import type { MenuProps } from 'antd';
import type { SettingTab } from '../../host';

type MenuItem = Required<MenuProps>['items'][number];

const { Sider, Content } = Layout;

const OptionsPage: React.FC<{ setAppMode: SetAppMode }> = ({ setAppMode }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<SettingTab>(
    () => settingTabFromLocation() ?? 'ollamaSetting'
  );
  const layout = useChatLayout();
  const wide = useMinWidth(800);
  const sideNav = layout === 'desktop' && wide;

  useEffect(() => {
    const syncTab = () => {
      const next = settingTabFromLocation();
      if (next) setCurrentPage(next);
    };
    window.addEventListener(SHELL_MODE_EVENT, syncTab);
    window.addEventListener('popstate', syncTab);
    return () => {
      window.removeEventListener(SHELL_MODE_EVENT, syncTab);
      window.removeEventListener('popstate', syncTab);
    };
  }, []);

  function getItem(label: React.ReactNode, key: React.Key): MenuItem {
    return {
      key,
      label,
    } as MenuItem;
  }

  const items: MenuItem[] = [
    getItem(t('settingMenu.ollamaSetting'), 'ollamaSetting'),
    getItem(t('settingMenu.customModel'), 'customModel'),
    getItem(t('settingMenu.mcp'), 'mcp'),
    getItem(t('settingMenu.quickCommandSetting'), 'quickCommand'),
    getItem(t('settingMenu.customLinkSetting'), 'customLink'),
  ];

  const menu = (
    <Menu
      selectedKeys={[currentPage]}
      mode={sideNav ? 'inline' : 'horizontal'}
      items={items}
      onClick={(selected) => {
        setCurrentPage(selected.key as SettingTab);
      }}
    />
  );

  return (
    <section className={Styles.page}>
      <header className={Styles.bar}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          aria-label={t('chat.backToChat')}
          onClick={() => setAppMode('chat')}
        >
          {t('chat.backToChat')}
        </Button>
        <strong>{t('chat.settingsTitle')}</strong>
      </header>
      <Layout className={Styles.layout}>
        {sideNav ? <Sider className={Styles.sider} width={220}>{menu}</Sider> : menu}
        <Content className={Styles.content}>
          {currentPage === 'ollamaSetting' && <OllamaSetting />}
          {currentPage === 'customModel' && <CustomModelSetting />}
          {currentPage === 'mcp' && <McpSetting />}
          {currentPage === 'customLink' && <CustomLink />}
          {currentPage === 'quickCommand' && <QuickCommandSetting />}
        </Content>
      </Layout>
    </section>
  );
};

export default OptionsPage;
