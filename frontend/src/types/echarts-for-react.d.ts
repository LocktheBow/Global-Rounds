declare module 'echarts-for-react' {
  import type { CSSProperties } from 'react';
  import type { EChartsCoreOption } from 'echarts';
  import type React from 'react';

  interface ReactEChartsProps {
    option: EChartsCoreOption;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    onEvents?: Record<string, (...args: any[]) => void>;
    style?: CSSProperties;
    className?: string;
  }

  const ReactECharts: React.FC<ReactEChartsProps>;
  export default ReactECharts;
}
