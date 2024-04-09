import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useRef, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, RadioButtonGroup, useStyles2, useTheme2, measureText } from '@grafana/ui';
import {VARIABLE_ALL_VALUE} from "../../constants";

type Props = {
  options: Array<SelectableValue<string>>;
  value?: string;
  onChange: (label: string | undefined) => void;
};

const mainAttributes = ['name', 'rootName', 'rootServiceName', 'status', 'span.http.status_code'];

export function BreakdownLabelSelector({ options, value, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const [labelSelectorRequiredWidth, setLabelSelectorRequiredWidth] = useState<number>(0);
  const [availableWidth, setAvailableWidth] = useState<number>(0);

  const useHorizontalLabelSelector = availableWidth > labelSelectorRequiredWidth;

  const controlsContainer = useRef<HTMLDivElement>(null);

  useResizeObserver({
    ref: controlsContainer,
    onResize: () => {
      const element = controlsContainer.current;
      if (element) {
        setAvailableWidth(element.clientWidth);
      }
    },
  });

  const mainOptions = mainAttributes
    .filter((at) => !!options.find((op) => op.value === at))
    .map((attribute) => ({ label: attribute, text: attribute, value: attribute }));

  const otherOptions = options.filter((op) => !mainAttributes.includes(op.value?.toString()!));

  useEffect(() => {
    const { fontSize } = theme.typography;
    const text = mainOptions.map((option) => option.label || option.text || '').join(' ');
    const textWidth = measureText(text, fontSize).width;
    const additionalWidthPerItem = 70;
    setLabelSelectorRequiredWidth(textWidth + additionalWidthPerItem * mainOptions.length);
  }, [mainOptions, theme]);

  return (
    <div ref={controlsContainer} className={styles.container}>
      {useHorizontalLabelSelector ? (
        <>
          <RadioButtonGroup {...{ options: [{value: VARIABLE_ALL_VALUE, label: "All"}, ...mainOptions], value, onChange }} />
          <Select
            {...{ value }}
            placeholder={'Other attributes'}
            options={otherOptions}
            onChange={(selected) => onChange(selected.value)}
            className={styles.select}
          />
        </>
      ) : (
        <Select
          {...{ value }}
          placeholder={'Select attribute'}
          options={options}
          onChange={(selected) => onChange(selected.value)}
          className={styles.select}
        />
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    select: css({
      maxWidth: theme.spacing(22),
    }),
    container: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
