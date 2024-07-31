import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import React from 'react';
import { useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { formatDuration } from '../../../../../utils/dates';
import { locationService } from '@grafana/runtime';

export interface Props {
  tree: TreeNode;
}

export const StructureTree = ({ tree }: Props) => {
  const styles = useStyles2(getStyles);

  const maxDuration = findMaxDuration(tree);

  return (
    <div className={styles.container}>
      <table>
        <col style={{ width: '40%' }} />
        <col style={{ width: '30%' }} />
        <col style={{ width: '10%' }} />
        <thead>
          <tr>
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Avg. duration</th>
            <th className={styles.th}>Errors</th>
          </tr>
        </thead>
        <tbody>{renderTree(tree, 0, maxDuration)}</tbody>
      </table>
    </div>
  );
};

export function renderTree(t: TreeNode, depth: number, maxDuration: number): React.ReactNode[] {
  let result = [];

  result.push(<TreeLine key={`${t.name}_${maxDuration}`} node={t} depth={depth} maxDuration={maxDuration} />);

  for (const c of t.children) {
    result.push(...renderTree(c, depth + 1, maxDuration));
  }
  return result;
}

interface TreeLineProps {
  node: TreeNode;
  depth: number;
  maxDuration: number;
}

const TreeLine = ({ node, depth, maxDuration }: TreeLineProps) => {
  const styles = useStyles2(getStyles);
  let nameStyles = [styles.line, css({ paddingLeft: depth * 12 })];
  if (depth === 0) {
    nameStyles.push(styles.link);
  }

  // parse and sum up all span durations
  // nodeAvgDuration is in nanos, but formatDuration expects micros so divide by 1000
  const nodeAvgDuration = (node.spans.reduce((acc, c) => acc + parseInt(c.durationNanos, 10), 0) / node.spans.length) / 1000;
  const erroredSpans = node.spans.reduce(
    (acc, c) => (c.attributes?.find((a) => a.key === 'status')?.value.stringValue === 'error' ? acc + 1 : acc),
    0
  );
  const errorsPercentage = (erroredSpans * 100) / node.spans.length;

  return (
    <tr>
      <td className={styles.td}>
        <div 
          className={css(nameStyles)}
          onClick={() => {
            if (depth === 0 && node.traceID) {
              locationService.partial({ traceId: node.traceID });
            }
          }}
        >
          {`${node.name}`}
        </div>
      </td>
      <td className={styles.td}>{formatDuration(nodeAvgDuration)}</td>
      <td className={styles.td}>
        {erroredSpans}
        {erroredSpans > 0 && `(${errorsPercentage.toFixed(0)}%)`}
      </td>
    </tr>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${theme.colors.border.weak}`,
    }),
    line: css({
      flexGrow: 1,
      display: 'flex',
    }),
    th: css({
      padding: theme.spacing.x0_5,
      backgroundColor: theme.colors.background.canvas,
      fontWeight: 'bold',
    }),
    td: css({
      padding: theme.spacing.x0_5,
      backgroundColor: theme.colors.background.primary,
    }),
    link: css({
      cursor: 'pointer',
      color: theme.colors.text.link,
      textDecoration: 'underline',
    }),
  };
}

const findMaxDuration = (node: TreeNode): number => {
  let max = 0;

  for (const c of node.spans) {
    max = Math.max(max, parseInt(c.durationNanos, 10));
  }

  for (const c of node.children) {
    max = Math.max(max, findMaxDuration(c));
  }
  return max;
};
