import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';

type Tag = {
  label: string;
  color: string;
};

type Props = {
  description: string;
  tags: Tag[];
};

export function AttributesDescription({ description, tags }: Props) {
  const theme = useTheme2();
  const styles = getStyles(theme);

  return (
    <div className={styles.infoFlex}>
      <div className={styles.tagsFlex}>{description}</div>
      {tags.length > 0 &&
        tags.map((tag) => (
          <div className={styles.tagsFlex} key={tag.label}>
            <div className={styles.tag} style={{ backgroundColor: tag.color }} />
            <div>{tag.label}</div>
          </div>
        ))}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    infoFlex: css({
      display: 'flex',
      gap: theme.spacing(2),
      alignItems: 'center',
      padding: `${theme.spacing(1)} 0 ${theme.spacing(2)} 0`,
    }),
    tagsFlex: css({
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'center',
    }),
    tag: css({
      display: 'inline-block',
      width: theme.spacing(2),
      height: theme.spacing(0.5),
      borderRadius: theme.spacing(0.5),
    }),
  };
}
