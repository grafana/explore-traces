import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useRef, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, RadioButtonGroup, useStyles2, useTheme2, measureText, Field } from '@grafana/ui';
import { ALL } from '../../constants';
import { ignoredAttributes } from 'utils/shared';

type Props = {
  options: Array<SelectableValue<string>>;
  radioAttributes: string[];
  value?: string;
  onChange: (label: string) => void;
};

export function GroupBySelector({ options, radioAttributes, value, onChange }: Props) {
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

  const radioOptions = radioAttributes
    .filter((attr) => !!options.find((op) => op.value === attr))
    .map((attribute) => ({ label: attribute.replace('span.', '').replace('resource.', ''), text: attribute, value: attribute }));

  const selectOptions = options.filter((op) => !radioAttributes.includes(op.value?.toString()!));

  const getModifiedSelectOptions = (options: Array<SelectableValue<string>>) => {
    return options 
      .filter((op) => !ignoredAttributes.includes(op.value?.toString()!))
      .map((op) => ({ label: op.label?.replace('span.', '').replace('resource.', ''), value: op.value }));
  }

  useEffect(() => {
    const { fontSize } = theme.typography;
    const text = radioOptions.map((option) => option.label || option.text || '').join(' ');
    const textWidth = measureText(text, fontSize).width;
    const additionalWidthPerItem = 70;
    setLabelSelectorRequiredWidth(textWidth + additionalWidthPerItem * radioOptions.length);
  }, [radioOptions, theme]);

  return (
    <Field label="Group by">
      <div ref={controlsContainer} className={styles.container}>
        {useHorizontalLabelSelector ? (
          <>
            <RadioButtonGroup
              options={[{ value: ALL, label: ALL }, ...radioOptions]}
              value={value}
              onChange={onChange}
            />
            <Select
              value={value && getModifiedSelectOptions(selectOptions).some(x => x.value === value) ? value : null} // remove value from select when radio button clicked
              placeholder={'Other attributes'}
              options={getModifiedSelectOptions(selectOptions)}
              onChange={(selected) => onChange(selected?.value ?? ALL)}
              className={styles.select}
              isClearable={true}
            />
          </>
        ) : (
          <Select
            value={value}
            placeholder={'Select attribute'}
            options={getModifiedSelectOptions(options)}
            onChange={(selected) => onChange(selected?.value ?? ALL)}
            className={styles.select}
            isClearable={true}
          />
        )}
      </div>
    </Field>
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
