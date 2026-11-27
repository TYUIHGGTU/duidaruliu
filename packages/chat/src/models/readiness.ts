import { findActiveCustomModel, selectCustomModels } from './selection';

import type { RootState } from '../store';

export type ModelReadinessInput = {
  hasActiveCustom: boolean;
  customModelCount: number;
  customLoaded: boolean;
  ollamaUrl: string;
  ollamaIsRunning: boolean;
  serviceStatus: 'idle' | 'checking' | 'ready' | 'error';
  serviceChecked: boolean;
  serviceError: string;
  modelsStatus: 'idle' | 'loading' | 'ready' | 'error';
  ollamaModelCount: number;
  selectedOllamaModel: string;
};

export type ModelReadiness =
  | { kind: 'ready' }
  | { kind: 'checking' }
  | {
      kind: 'ollamaUnreachable';
      url: string;
      detail: string;
      hasCustomModels: boolean;
      retrying: boolean;
    }
  | {
      kind: 'modelsLoadFailed';
      url: string;
      hasCustomModels: boolean;
      retrying: boolean;
    }
  | {
      kind: 'noModels';
      url: string;
      hasCustomModels: boolean;
      retrying: boolean;
    }
  | {
      kind: 'noModelSelected';
      hasCustomModels: boolean;
    };

/**
 * 统一判断当前对话是否有可用的模型后端。
 * 选中自定义模型时完全忽略本机 Ollama 的连接状态；
 * 首次初始化尚未完成前返回 checking，避免界面在启动瞬间闪现报错。
 */
export function resolveModelReadiness(input: ModelReadinessInput): ModelReadiness {
  if (input.hasActiveCustom) return { kind: 'ready' };

  const hasCustomModels = input.customModelCount > 0;
  const retrying = input.serviceStatus === 'checking' || input.modelsStatus === 'loading';

  if (!input.customLoaded) return { kind: 'checking' };

  if (!input.ollamaIsRunning) {
    if (!input.serviceChecked) return { kind: 'checking' };
    return {
      kind: 'ollamaUnreachable',
      url: input.ollamaUrl,
      detail: input.serviceError,
      hasCustomModels,
      retrying,
    };
  }

  if (input.modelsStatus === 'error') {
    return {
      kind: 'modelsLoadFailed',
      url: input.ollamaUrl,
      hasCustomModels,
      retrying,
    };
  }

  if (input.modelsStatus === 'ready') {
    if (input.ollamaModelCount === 0) {
      return {
        kind: 'noModels',
        url: input.ollamaUrl,
        hasCustomModels,
        retrying,
      };
    }
    if (!input.selectedOllamaModel) {
      return { kind: 'noModelSelected', hasCustomModels };
    }
    return { kind: 'ready' };
  }

  // Ollama 根路径已通，模型列表仍在拉取中：已有上次选中的模型直接放行，否则静默等待。
  return input.selectedOllamaModel ? { kind: 'ready' } : { kind: 'checking' };
}

export function selectModelReadiness(state: RootState): ModelReadiness {
  const { ollama, customModel } = state;
  return resolveModelReadiness({
    hasActiveCustom: Boolean(findActiveCustomModel(state)),
    customModelCount: selectCustomModels(state).length,
    customLoaded: customModel.loaded,
    ollamaUrl: ollama.ollamaUrl,
    ollamaIsRunning: ollama.ollamaIsRunning,
    serviceStatus: ollama.serviceStatus,
    serviceChecked: ollama.serviceChecked,
    serviceError: ollama.serviceError,
    modelsStatus: ollama.modelsStatus,
    ollamaModelCount: ollama.listedModels.length,
    selectedOllamaModel: ollama.ollamaModelParams.model,
  });
}

/** 是否有需要向用户展示的未就绪状态（不含启动期静默 checking）。 */
export function hasModelSetupIssue(
  readiness: ModelReadiness
): readiness is Exclude<ModelReadiness, { kind: 'ready' | 'checking' }> {
  return readiness.kind !== 'ready' && readiness.kind !== 'checking';
}

/** 当前是否完全没有任何可选模型（既无可用 Ollama，也无已配置的自定义模型）。 */
export function hasNoSelectableModels(readiness: ModelReadiness): boolean {
  return (
    (readiness.kind === 'ollamaUnreachable' ||
      readiness.kind === 'modelsLoadFailed' ||
      readiness.kind === 'noModels') &&
    !readiness.hasCustomModels
  );
}
