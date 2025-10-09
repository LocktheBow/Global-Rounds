import React, { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  TaskLoadCard,
  FinancePulseCard,
  InventoryActionsCard,
} from './components/command';
import type {
  CommandInsightsResponse,
  CommandTaskInsight,
  CommandFinanceInsight,
  CommandInventoryInsight,
} from './types/command';
import styles from './command-embed.css?inline';

type TaskProps = {
  insight: CommandTaskInsight | null;
  loading?: boolean;
  error?: string | null;
};

type FinanceProps = {
  insight: CommandFinanceInsight | null;
  loading?: boolean;
  error?: string | null;
};

type InventoryProps = {
  insight: CommandInventoryInsight | null;
  loading?: boolean;
  error?: string | null;
};

type RootRecord = {
  root: Root;
  container: HTMLElement;
};

const rootCache = new WeakMap<HTMLElement, RootRecord>();

const ensureRoot = (host: HTMLElement): RootRecord => {
  const cached = rootCache.get(host);
  if (cached) {
    return cached;
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  // Reset to avoid duplicate wrappers when rehydrating.
  shadow.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = styles;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'gr-command-card';
  shadow.appendChild(container);

  const root = createRoot(container);
  const record = { root, container };
  rootCache.set(host, record);
  return record;
};

const renderTaskCard = (host: HTMLElement, props: TaskProps) => {
  const { root } = ensureRoot(host);
  root.render(
    <StrictMode>
      <TaskLoadCard {...props} />
    </StrictMode>,
  );
};

const renderFinanceCard = (host: HTMLElement, props: FinanceProps) => {
  const { root } = ensureRoot(host);
  root.render(
    <StrictMode>
      <FinancePulseCard {...props} />
    </StrictMode>,
  );
};

const renderInventoryCard = (host: HTMLElement, props: InventoryProps) => {
  const { root } = ensureRoot(host);
  root.render(
    <StrictMode>
      <InventoryActionsCard {...props} />
    </StrictMode>,
  );
};

const unmount = (host: HTMLElement) => {
  const record = rootCache.get(host);
  if (!record) {
    return;
  }
  record.root.unmount();
  rootCache.delete(host);
};

const api = {
  renderTaskCard,
  renderFinanceCard,
  renderInventoryCard,
  unmount,
};

declare global {
  interface Window {
    CommandInsightsEmbed?: typeof api;
  }
}

window.CommandInsightsEmbed = api;
window.dispatchEvent(new CustomEvent('command-insights-ready'));

export type { CommandInsightsResponse };
export { api as CommandInsightsEmbed };
