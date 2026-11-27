import {
  hasModelSetupIssue,
  hasNoSelectableModels,
  resolveModelReadiness,
  type ModelReadinessInput,
} from '../src/models/readiness';
import { settingTabFromLocation } from '../src/shell/types';

let failed = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function equal(actual: unknown, expected: unknown, message: string) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

const base: ModelReadinessInput = {
  hasActiveCustom: false,
  customModelCount: 0,
  customLoaded: true,
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaIsRunning: false,
  serviceStatus: 'error',
  serviceChecked: true,
  serviceError: 'Failed to fetch',
  modelsStatus: 'error',
  ollamaModelCount: 0,
  selectedOllamaModel: '',
};

function main() {
  // 启动期尚未完成检测，保持静默 checking，不闪现错误。
  equal(
    resolveModelReadiness({ ...base, customLoaded: false }),
    { kind: 'checking' },
    'unloaded custom models stay checking'
  );
  equal(
    resolveModelReadiness({
      ...base,
      serviceStatus: 'checking',
      serviceChecked: false,
      serviceError: '',
    }),
    { kind: 'checking' },
    'initial ollama check stays checking'
  );
  assert(!hasModelSetupIssue({ kind: 'checking' }), 'checking is not an issue');

  // 选中自定义模型时完全忽略本机 Ollama 状态。
  equal(
    resolveModelReadiness({ ...base, hasActiveCustom: true, customModelCount: 1 }),
    { kind: 'ready' },
    'active custom model is always ready'
  );

  // Ollama 连不上 + 无自定义模型：完全没有可选模型，重试时保留卡片并标记 retrying。
  const unreachable = resolveModelReadiness(base);
  equal(
    unreachable,
    {
      kind: 'ollamaUnreachable',
      url: 'http://127.0.0.1:11434',
      detail: 'Failed to fetch',
      hasCustomModels: false,
      retrying: false,
    },
    'unreachable ollama without custom models'
  );
  assert(hasModelSetupIssue(unreachable), 'unreachable is an issue');
  assert(hasNoSelectableModels(unreachable), 'unreachable without custom models has no selectable models');

  const retryingUnreachable = resolveModelReadiness({ ...base, serviceStatus: 'checking' });
  assert(
    retryingUnreachable.kind === 'ollamaUnreachable' && retryingUnreachable.retrying,
    'retry keeps unreachable state with retrying flag'
  );

  // Ollama 连不上 + 已有自定义模型：允许在底部下拉框切换。
  const unreachableWithCustom = resolveModelReadiness({ ...base, customModelCount: 2 });
  assert(
    unreachableWithCustom.kind === 'ollamaUnreachable' && unreachableWithCustom.hasCustomModels,
    'unreachable with custom models keeps hasCustomModels true'
  );
  assert(
    !hasNoSelectableModels(unreachableWithCustom),
    'unreachable with custom models still has selectable models'
  );

  // Ollama 根路径连通，但 /api/tags 失败。
  const tagsFailed = resolveModelReadiness({
    ...base,
    ollamaIsRunning: true,
    serviceStatus: 'ready',
    serviceError: '',
    modelsStatus: 'error',
  });
  equal(
    tagsFailed,
    {
      kind: 'modelsLoadFailed',
      url: 'http://127.0.0.1:11434',
      hasCustomModels: false,
      retrying: false,
    },
    'tags load failure'
  );
  assert(hasNoSelectableModels(tagsFailed), 'tags failure without custom models blocks picker');

  // Ollama 在线，列表已加载但本地没有对话模型。
  const noModels = resolveModelReadiness({
    ...base,
    ollamaIsRunning: true,
    serviceStatus: 'ready',
    serviceError: '',
    modelsStatus: 'ready',
    ollamaModelCount: 0,
  });
  equal(
    noModels,
    {
      kind: 'noModels',
      url: 'http://127.0.0.1:11434',
      hasCustomModels: false,
      retrying: false,
    },
    'running ollama with zero chat models'
  );
  assert(hasNoSelectableModels(noModels), 'zero models without custom models blocks picker');

  const noModelsWithCustom = resolveModelReadiness({
    ...base,
    ollamaIsRunning: true,
    serviceStatus: 'ready',
    serviceError: '',
    modelsStatus: 'ready',
    ollamaModelCount: 0,
    customModelCount: 1,
  });
  assert(
    noModelsWithCustom.kind === 'noModels' && !hasNoSelectableModels(noModelsWithCustom),
    'zero local models with custom models keeps picker open'
  );

  // Ollama 在线，有模型但尚未选中。
  const unselected = resolveModelReadiness({
    ...base,
    ollamaIsRunning: true,
    serviceStatus: 'ready',
    serviceError: '',
    modelsStatus: 'ready',
    ollamaModelCount: 2,
    selectedOllamaModel: '',
  });
  equal(
    unselected,
    { kind: 'noModelSelected', hasCustomModels: false },
    'models available but none selected'
  );
  assert(!hasNoSelectableModels(unselected), 'unselected still has selectable models');

  // Ollama 在线且列表仍在加载：没有已选模型时等待，已有已选模型直接就绪。
  equal(
    resolveModelReadiness({
      ...base,
      ollamaIsRunning: true,
      serviceStatus: 'ready',
      serviceError: '',
      modelsStatus: 'loading',
      selectedOllamaModel: '',
    }),
    { kind: 'checking' },
    'loading tags with no saved model waits quietly'
  );
  equal(
    resolveModelReadiness({
      ...base,
      ollamaIsRunning: true,
      serviceStatus: 'ready',
      serviceError: '',
      modelsStatus: 'loading',
      selectedOllamaModel: 'qwen2.5:7b',
    }),
    { kind: 'ready' },
    'loading tags with saved model is ready'
  );

  // Ollama 完全就绪。
  equal(
    resolveModelReadiness({
      ...base,
      ollamaIsRunning: true,
      serviceStatus: 'ready',
      serviceError: '',
      modelsStatus: 'ready',
      ollamaModelCount: 2,
      selectedOllamaModel: 'qwen2.5:7b',
    }),
    { kind: 'ready' },
    'running ollama with selected model is ready'
  );

  // 设置页 tab 解析。
  equal(settingTabFromLocation('?appMode=setting&tab=customModel'), 'customModel', 'parses customModel tab');
  equal(settingTabFromLocation('?appMode=setting&tab=ollamaSetting'), 'ollamaSetting', 'parses ollamaSetting tab');
  equal(settingTabFromLocation('?appMode=setting&tab=unknown'), null, 'ignores unknown tab');
  equal(settingTabFromLocation('?appMode=setting'), null, 'missing tab returns null');

  if (failed) throw new Error(`${failed} assertion(s) failed`);
  console.log('model readiness fixtures passed');
}

main();
