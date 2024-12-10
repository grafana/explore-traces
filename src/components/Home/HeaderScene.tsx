import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
} from '@grafana/scenes';
import { Badge, Button, Icon, LinkButton, Stack, Tooltip, useStyles2, useTheme2 } from '@grafana/ui';

import {
  EXPLORATIONS_ROUTE,
  VAR_DATASOURCE,
} from '../../utils/shared';
import { getHomeScene } from '../../utils/utils';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Home } from 'pages/Home/Home';
import { DarkModeRocket, LightModeRocket } from './rockets';

const version = process.env.VERSION;
const buildTime = process.env.BUILD_TIME;
const commitSha = process.env.COMMIT_SHA;
const compositeVersion = `v${version} - ${buildTime?.split('T')[0]} (${commitSha})`;

export class HeaderScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<Home>) => {
    const home = getHomeScene(model);
    const navigate = useNavigate();
    const { controls } = home.useState();
    const styles = useStyles2(getStyles);
    const theme = useTheme2();

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, home);

    return (
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.left}>
            {theme.isDark ? <DarkModeRocket /> : <LightModeRocket />}
            <h2 className={styles.title}>Start your traces exploration!</h2>
          </div>
          <div className={styles.right}>
            <p>Explore and visualize your trace data without writing a query.</p>
            <div className={styles.headerActions}>
              <Button variant='primary' onClick={() => navigate(EXPLORATIONS_ROUTE)}>
                Let’s explore traces
                <Icon className={styles.arrowIcon} name='arrow-right' size='lg' />
              </Button>
              <LinkButton
                icon="external-link-alt"
                fill="text"
                size={'md'}
                target={'_blank'}
                href={
                  'https://grafana.com/docs/grafana-cloud/visualizations/simplified-exploration/traces'
                }
                className={styles.documentationLink}
              >
                Read documentation
              </LinkButton>
            </div>
          </div>
        </div>

        <div className={styles.middle}>
          <h4>Or quick-start into your tracing data.</h4>
        </div>

        <div className={styles.bottom}>
          <Stack gap={2}>
            {dsVariable && (
              <Stack gap={1} alignItems={'center'}>
                <div className={styles.datasourceLabel}>Data source</div>
                <dsVariable.Component model={dsVariable} />
              </Stack>
            )}
            <div className={styles.controls}>
              {/* <Tooltip content={<PreviewTooltip text={compositeVersion} />} interactive>
                <span className={styles.preview}>
                  <Badge text='&nbsp;Preview' color='blue' icon='rocket' />
                </span>
              </Tooltip> */}

              {controls.map((control) => (
                <control.Component key={control.state.key} model={control} />
              ))}
            </div>
          </Stack>
        </div>
      </div>
    );
  };
}

const PreviewTooltip = ({ text }: { text: string }) => {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction={'column'} gap={2}>
      <div className={styles.previewTooltip}>{text}</div>
    </Stack>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    preview: css({
      cursor: 'help',

      '> div:first-child': {
        padding: '5.5px',
      },
    }),
    previewTooltip: css({
      fontSize: '14px',
      lineHeight: '22px',
      width: '180px',
      textAlign: 'center',
    }),

    container: css({
      label: 'joeyContainer',
      display: 'flex',
      gap: theme.spacing(7),
      flexDirection: 'column',
      margin: `0 0 ${theme.spacing(4)} 0`,
      justifyContent: 'center',
    }),

    top: css({
      label: 'joeyTop',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing(0.5),
      justifyContent: 'center',
      padding: theme.spacing(3),
      width: '100%',
    }),
    left: css({
      label: 'joeyLeft',
      display: 'flex',
      alignItems: 'center',
    }),
    title: css({
      margin: `0 0 0 ${theme.spacing(2)}`,
    }),

    right: css({
      label: 'joeyRight',
      margin: `0 0 0 ${theme.spacing(4)}`,
    }),
    headerActions: css({
      alignItems: 'center',
      justifyContent: 'flex-start',
      display: 'flex',
      gap: theme.spacing(2),
    }),
    arrowIcon: css({
      marginLeft: theme.spacing(1),
    }),
    documentationLink: css({
      textDecoration: 'underline',
      '&:hover': {
        textDecoration: 'underline',
      },
    }),

    middle: css({
      label: 'joeyMiddle',
      textAlign: 'center',
      'h4': {
        margin: 0,
      }
    }),

    bottom: css({
      label: 'joeyBottom',
    }),
    datasourceLabel: css({
      fontSize: '12px',
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
