import React from 'react';
import { Button, Flex } from 'antd';
import {
  DisconnectOutlined,
  InboxOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { getChatHost } from '../../../host';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { bumpModelsNonce, checkOllamaStatus } from '../../../store/ollamaSlice';
import { hasNoSelectableModels, type ModelReadiness } from '../../../models/readiness';

import Styles from '../index.module.less';

type SetupIssue = Exclude<ModelReadiness, { kind: 'ready' | 'checking' }>;

type ModelStatusCardProps = {
  readiness: SetupIssue;
  variant: 'empty' | 'inline';
};

const ModelStatusCard: React.FC<ModelStatusCardProps> = ({ readiness, variant }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const ollamaUrl = useAppSelector((state) => state.ollama.ollamaUrl);

  const retryService = () => {
    dispatch(checkOllamaStatus(ollamaUrl));
    dispatch(bumpModelsNonce());
  };

  const openCustomModelSettings = () => getChatHost().openSettings('customModel');
  const openOllamaSettings = () => getChatHost().openSettings('ollamaSetting');

  // 已有自定义模型可切、或本地模型已加载待选时，只保留一条紧凑提示，配合下方模型选择器使用。
  if (variant === 'inline' && !hasNoSelectableModels(readiness)) {
    const stripText =
      readiness.kind === 'ollamaUnreachable'
        ? t('chat.setup.unreachableWithCustom', { url: readiness.url })
        : readiness.kind === 'modelsLoadFailed'
          ? t('chat.setup.modelsFailedWithCustom', { url: readiness.url })
          : readiness.kind === 'noModels'
            ? t('chat.setup.noModelsWithCustom')
            : t('chat.setup.noModelSelectedDesc');

    const canRetry = readiness.kind !== 'noModelSelected';
    const retrying = canRetry && readiness.retrying;
    const retryLabel =
      readiness.kind === 'noModels' ? t('chat.setup.refreshModels') : t('chat.serviceRetry');

    return (
      <div className={Styles.setupStrip} role="status">
        <span className={Styles.setupStripText}>{stripText}</span>
        {canRetry ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={retrying}
            onClick={retryService}
          >
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  const isNoModels = readiness.kind === 'noModels';
  const showOllamaSettings =
    readiness.kind === 'ollamaUnreachable' || readiness.kind === 'modelsLoadFailed';
  const retrying = readiness.kind !== 'noModelSelected' && readiness.retrying;

  const title =
    readiness.kind === 'ollamaUnreachable'
      ? t('chat.setup.unreachableTitle')
      : readiness.kind === 'modelsLoadFailed'
        ? t('chat.setup.modelsFailedTitle')
        : readiness.kind === 'noModels'
          ? t('chat.setup.noModelsTitle')
          : t('chat.setup.noModelSelectedTitle');

  const detail =
    readiness.kind === 'ollamaUnreachable'
      ? readiness.detail
        ? `${readiness.url} · ${readiness.detail}`
        : readiness.url
      : '';

  const description =
    readiness.kind === 'ollamaUnreachable'
      ? t('chat.setup.unreachableDesc')
      : readiness.kind === 'modelsLoadFailed'
        ? t('chat.setup.modelsFailedDesc', { url: readiness.url })
        : readiness.kind === 'noModels'
          ? t('chat.setup.noModelsDesc', { url: readiness.url })
          : t('chat.setup.noModelSelectedDesc');

  const retryLabel = isNoModels ? t('chat.setup.refreshModels') : t('chat.serviceRetry');
  const icon = isNoModels ? <InboxOutlined /> : <DisconnectOutlined />;
  const iconClass = isNoModels ? Styles.setupIconMuted : Styles.setupIconError;

  if (variant === 'empty') {
    return (
      <div className={Styles.setupEmpty} role="status">
        <div className={Styles.setupCard}>
          <div className={`${Styles.setupIcon} ${iconClass}`} aria-hidden>
            {icon}
          </div>
          <div className={Styles.setupTitle}>{title}</div>
          {detail ? <div className={Styles.setupDetail}>{detail}</div> : null}
          <p className={Styles.setupDesc}>{description}</p>
          <Flex wrap justify="center" gap="small" className={Styles.setupActions}>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={openCustomModelSettings}
            >
              {t('chat.setup.configureModel')}
            </Button>
            <Button icon={<ReloadOutlined />} loading={retrying} onClick={retryService}>
              {retryLabel}
            </Button>
          </Flex>
          {showOllamaSettings ? (
            <Button
              type="link"
              size="small"
              className={Styles.setupLink}
              onClick={openOllamaSettings}
            >
              {t('chat.setup.ollamaSettings')}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={Styles.setupInlineCard} role="status">
      <div className={Styles.setupInlineHead}>
        <span className={`${Styles.setupInlineIcon} ${iconClass}`} aria-hidden>
          {icon}
        </span>
        <div className={Styles.setupInlineBody}>
          <div className={Styles.setupInlineTitle}>{title}</div>
          {detail ? <div className={Styles.setupInlineDetail}>{detail}</div> : null}
          <div className={Styles.setupInlineDesc}>{description}</div>
        </div>
      </div>
      <Flex wrap align="center" gap="small" className={Styles.setupInlineActions}>
        <Button
          size="small"
          type="primary"
          icon={<SettingOutlined />}
          onClick={openCustomModelSettings}
        >
          {t('chat.setup.configureModel')}
        </Button>
        <Button size="small" icon={<ReloadOutlined />} loading={retrying} onClick={retryService}>
          {retryLabel}
        </Button>
        {showOllamaSettings ? (
          <Button type="link" size="small" onClick={openOllamaSettings}>
            {t('chat.setup.ollamaSettings')}
          </Button>
        ) : null}
      </Flex>
    </div>
  );
};

export default ModelStatusCard;
