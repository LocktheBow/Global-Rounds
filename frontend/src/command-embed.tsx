import React, { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  TaskLoadCard,
  FinancePulseCard,
  InventoryActionsCard,
  RailRevenueMini,
  RailSupplierMini,
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

  // Allow hosts to opt-out of Shadow DOM by adding data-no-shadow="true"
  const useShadow = !host.hasAttribute('data-no-shadow');
  let container: HTMLDivElement;

  if (useShadow) {
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    // Reset to avoid duplicate wrappers when rehydrating.
    shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = styles;
    shadow.appendChild(style);

    container = document.createElement('div');
    container.className = 'gr-command-card';
    shadow.appendChild(container);
  } else {
    // Light DOM mounting for environments that don’t play nicely with Shadow DOM
    // Normalize the host container to avoid inherited flex layouts/min-heights
    host.style.display = 'block';
    host.style.height = 'auto';
    host.style.minHeight = '0';
    host.style.alignItems = '';
    host.style.justifyContent = '';
    host.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = styles;
    host.appendChild(style);
    container = document.createElement('div');
    container.className = 'gr-command-card';
    host.appendChild(container);
  }

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

type RevenueMiniProps = {
  data: import('./utils/calc').RevenueByCategoryDatum[];
  loading?: boolean;
  live?: boolean;
};

type SupplierMiniProps = {
  data: import('./utils/calc').SupplierReliabilityDatum[];
  loading?: boolean;
  live?: boolean;
};

const renderRevenueMini = (host: HTMLElement, props: RevenueMiniProps) => {
  const { root } = ensureRoot(host);
  root.render(
    <StrictMode>
      <RailRevenueMini {...props} />
    </StrictMode>,
  );
};

const renderSupplierMini = (host: HTMLElement, props: SupplierMiniProps) => {
  const { root } = ensureRoot(host);
  root.render(
    <StrictMode>
      <RailSupplierMini {...props} />
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
  renderRevenueMini,
  renderSupplierMini,
  unmount,
};

declare global {
  interface Window {
    CommandInsightsEmbed?: typeof api;
  }
}

window.CommandInsightsEmbed = api;
window.CommandInsightsEmbedReady = true;
window.dispatchEvent(new CustomEvent('command-insights-ready'));
if (typeof console !== 'undefined') {
  console.info('[CommandInsightsEmbed] ready');
}

export type { CommandInsightsResponse };
export { api as CommandInsightsEmbed };
