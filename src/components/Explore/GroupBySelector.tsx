import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, RadioButtonGroup, useStyles2, useTheme2, measureText, Field, InputActionMeta } from '@grafana/ui';
import { ALL, ignoredAttributes, maxOptions, MetricFunction, RESOURCE_ATTR, SPAN_ATTR } from 'utils/shared';
import { AttributesBreakdownScene } from './TracesByService/Tabs/Breakdown/AttributesBreakdownScene';
import { AttributesComparisonScene } from './TracesByService/Tabs/Comparison/AttributesComparisonScene';
import { getFiltersVariable, getMetricVariable } from 'utils/utils';

type Props = {
  options: Array<SelectableValue<string>>;
  radioAttributes: string[];
  value?: string;
  onChange: (label: string) => void;
  showAll?: boolean;
  model: AttributesBreakdownScene | AttributesComparisonScene;
};

export function GroupBySelector({ options, radioAttributes, value, onChange, showAll = false, model }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const [selectQuery, setSelectQuery] = useState<string>('');

  const [labelSelectorRequiredWidth, setLabelSelectorRequiredWidth] = useState<number>(0);
  const [availableWidth, setAvailableWidth] = useState<number>(0);
  const useHorizontalLabelSelector = availableWidth > labelSelectorRequiredWidth;
  const controlsContainer = useRef<HTMLDivElement>(null);

  const { filters } = getFiltersVariable(model).useState();
  const { value: metric } = getMetricVariable(model).useState();
  const metricValue = metric as MetricFunction;

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
    .filter((op) => {
      // remove radio options that are in the dropdown
      let checks = !!options.find((o) => o.value === op);

      // remove radio options that are in the filters
      if (filters.find((f) => f.key === op && (f.operator === '=' || f.operator === '!='))) {
        return false;
      }

      // if filters (primary signal) has 'Full Traces' selected, then don't add rootName or rootServiceName to options
      // as you would overwrite it in the query if it's selected
      if (filters.find((f) => f.key === 'nestedSetParent')) {
        checks = checks && op !== 'rootName' && op !== 'rootServiceName';
      }

      // if rate or error rate metric is selected, then don't add status to options
      // as you would overwrite it in the query if it's selected
      if (metricValue === 'rate' || metricValue === 'errors') {
        checks = checks && op !== 'status';
      }

      return checks;
    })
    .map((attribute) => ({
      label: attribute.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''),
      text: attribute,
      value: attribute,
    }));

  const otherAttrOptions = useMemo(() => {
    const ops = options.filter((op) => !radioAttributes.includes(op.value?.toString()!));
    return filteredOptions(ops, selectQuery);
  }, [selectQuery, options, radioAttributes]);

  const attrOptions = useMemo(() => {
    return filteredOptions(options, selectQuery);
  }, [selectQuery, options]);

  const getModifiedSelectOptions = (options: Array<SelectableValue<string>>) => {
    return options
      .filter((op) => !ignoredAttributes.includes(op.value?.toString()!))
      .map((op) => ({ label: op.label?.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''), value: op.value }));
  };

  useEffect(() => {
    const { fontSize } = theme.typography;
    const text = radioOptions.map((option) => option.label || option.text || '').join(' ');
    const textWidth = measureText(text, fontSize).width;
    const additionalWidthPerItem = 40;
    const widthOfOtherAttributes = 180;
    setLabelSelectorRequiredWidth(textWidth + additionalWidthPerItem * radioOptions.length + widthOfOtherAttributes);
  }, [radioOptions, theme]);

  // Set default value as first value in options
  useEffect(() => {
    const defaultValue = radioAttributes[0] ?? options[0]?.value;
    if (defaultValue) {
      if (!showAll && (!value || value === ALL)) {
        onChange(defaultValue);
      }
    }
  });

  const showAllOption = showAll ? [{ label: ALL, value: ALL }] : [];
  const defaultOnChangeValue = showAll ? ALL : '';

  return (
    <Field label="Group by">
      <div ref={controlsContainer} className={styles.container}>
        {useHorizontalLabelSelector ? (
          <>
            {radioOptions.length > 0 && (
              <RadioButtonGroup options={[...showAllOption, ...radioOptions]} value={value} onChange={onChange} />
            )}
            <Select
              value={value && getModifiedSelectOptions(otherAttrOptions).some((x) => x.value === value) ? value : null} // remove value from select when radio button clicked
              placeholder={'Other attributes'}
              options={getModifiedSelectOptions(otherAttrOptions)}
              onChange={(selected) => onChange(selected?.value ?? defaultOnChangeValue)}
              className={styles.select}
              isClearable
              onInputChange={(value: string, { action }: InputActionMeta) => {
                if (action === 'input-change') {
                  setSelectQuery(value);
                }
              }}
              onCloseMenu={() => setSelectQuery('')}
              virtualized
            />
          </>
        ) : (
          <Select
            value={value}
            placeholder={'Select attribute'}
            options={getModifiedSelectOptions(attrOptions)}
            onChange={(selected) => onChange(selected?.value ?? defaultOnChangeValue)}
            className={styles.select}
            isClearable
            onInputChange={(value: string, { action }: InputActionMeta) => {
              if (action === 'input-change') {
                setSelectQuery(value);
              }
            }}
            onCloseMenu={() => setSelectQuery('')}
            virtualized
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

export const filteredOptions = (options: Array<SelectableValue<string>>, query: string) => {
  if (options.length === 0) {
    return [];
  }

  if (query.length === 0) {
    return options.slice(0, maxOptions);
  }

  const queryLowerCase = query.toLowerCase();
  return options
    .filter((tag) => {
      if (tag.value && tag.value.length > 0) {
        return tag.value.toLowerCase().includes(queryLowerCase);
      }
      return false;
    })
    .slice(0, maxOptions);
};
