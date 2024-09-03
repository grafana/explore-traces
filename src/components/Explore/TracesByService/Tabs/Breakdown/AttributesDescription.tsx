import { css } from '@emotion/css';
import React, {  } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';

type Props = {
  desctiption: string;
  showTags: boolean;
  firstTag: string;
  firstTagColor: string;
  secondTag: string;
  secondTagColor: string;
};

export function AttributesDescription({ desctiption, showTags, firstTag, firstTagColor, secondTag, secondTagColor }: Props) {
  const theme = useTheme2();
  const styles = getStyles(theme, firstTagColor, secondTagColor);

  return (
    <div className={styles.infoFlex}>
      <div className={styles.tagsFlex}>
        {desctiption}
      </div>
      {showTags && (
        <>
          <div className={styles.tagsFlex}>
            <div className={styles.firstTag} />
            <div>{firstTag}</div>
          </div>
          <div className={styles.tagsFlex}>
            <div className={styles.secondTag} />
            <div>{secondTag}</div>
          </div>
        </>
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2, firstTagColor: string, secondTagColor: string) {
  return {
    infoFlex: css({
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      paddingBottom: theme.spacing(2),
    }),
    tagsFlex: css({
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    }),
    firstTag: css({
      display: 'inline-block',
      width: '16px',
      height: '4px',
      borderRadius: '4px',
      backgroundColor: firstTagColor,
    }),
    secondTag: css({
      display: 'inline-block',
      width: '16px',
      height: '4px',
      borderRadius: '4px',
      backgroundColor: secondTagColor,
    }),
  };
}
