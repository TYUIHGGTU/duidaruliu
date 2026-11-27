import React, { useSyncExternalStore } from 'react';
import { App as AntdApp, Button, Space, Badge, Tooltip } from 'antd';
import { MenuOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { agentIsStreaming, getAgentActivity, resetAgentTranscript, subscribeAgentActivity } from '../../../agent/runtime';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { setMessages } from '../../../store/chatSlice';
import {
  initializeConversations,
  setIsShowHistoryPanel,
  setIsViewHistoryMode,
  storeCurrentMessagesFunc,
} from '../../../store/historySlice';

import { getMcpRuntime, subscribeMcpRuntime } from '../../../mcp/session';

// import local styles
import Styles from '../index.module.less';

const HeaderSection: React.FC = () => {
  const { message: antdMessage } = AntdApp.useApp();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  useSyncExternalStore(subscribeAgentActivity, getAgentActivity, getAgentActivity);
  const messages = useAppSelector((state) => state.chat.messages);
  const { isViewHistoryMode, isShowHistoryPanel } = useAppSelector((state) => state.history);
  const { responseStatus } = useAppSelector((state) => state.chat);
  const mcpToolsEnabled = useAppSelector((state) => state.mcp.toolsEnabled);
  const mcpServers = useAppSelector((state) => state.mcp.servers);
  const mcpRuntime = useSyncExternalStore(subscribeMcpRuntime, getMcpRuntime, getMcpRuntime);

  const createNewChat = async () => {
    if (agentIsStreaming() || responseStatus !== 'end') {
      antdMessage.warning(t('chat.waitingForEnd'));
      return;
    }

    if (!messages.length) {
      antdMessage.success(t('chat.isLatest'));
      return;
    }
    if (isViewHistoryMode) {
      dispatch(setIsViewHistoryMode(false));
    }
    if (!resetAgentTranscript()) return;
    const saved = messages;
    dispatch(setMessages({ messages: [], isSaveCurrent: false }));
    if (!isViewHistoryMode) {
      await storeCurrentMessagesFunc(saved);
      dispatch(initializeConversations());
    }
  };

  const mcpDisconnected =
    mcpToolsEnabled &&
    mcpServers.some(
      (server) =>
        server.enabled &&
        mcpRuntime.find((item) => item.name === server.name)?.status !== 'connected'
    );

  return (
    <header className={Styles.header}>
      <div className={Styles.left}>
        <Button
          variant="text"
          color="default"
          icon={<MenuOutlined />}
          aria-label={t('chat.openSideMenu')}
          onClick={() => {
            dispatch(setIsShowHistoryPanel(!isShowHistoryPanel));
          }}
        />
      </div>
      <div className={Styles.middle}>
        {mcpDisconnected ? (
          <Tooltip title={t('chat.mcpDisconnected')}>
            <Badge status="warning" />
          </Tooltip>
        ) : null}
      </div>
      <Space size={2} className={Styles.right}>
        <Button
          variant="text"
          color="default"
          icon={<PlusOutlined />}
          aria-label={t('chat.newChat')}
          onClick={() => createNewChat()}
        />
      </Space>
    </header>
  );
};

export default HeaderSection;
