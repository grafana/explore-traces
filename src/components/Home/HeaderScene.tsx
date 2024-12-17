import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
} from '@grafana/scenes';
import { Button, Icon, LinkButton, Stack, useStyles2, useTheme2 } from '@grafana/ui';

import {
  EXPLORATIONS_ROUTE,
  VAR_DATASOURCE,
} from '../../utils/shared';
import { getHomeScene } from '../../utils/utils';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Home } from 'pages/Home/Home';
import { DarkModeRocket, LightModeRocket } from '../../utils/rockets';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

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
        <div className={styles.header}>
          <div className={styles.headerTitleContainer}>
            {theme.isDark ? <DarkModeRocket /> : <LightModeRocket />}
            <h2 className={styles.title}>Start your traces exploration!</h2>
          </div>
          <div>
            <p>Explore and visualize your trace data without writing a query.</p>
            <div className={styles.headerActions}>
              <Button variant='primary' onClick={() => {
                  reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.explore_traces_clicked);
                  navigate(EXPLORATIONS_ROUTE);
                }}>
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
                onClick={() => reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.read_documentation_clicked)}
              >
                Read documentation
              </LinkButton>
            </div>
          </div>
        </div>

        <div className={styles.subHeader}>
          <h4>Or quick-start into your tracing data.</h4>
        </div>

        <Stack gap={2}>
          {dsVariable && (
            <Stack gap={1} alignItems={'center'}>
              <div className={styles.datasourceLabel}>Data source</div>
              <dsVariable.Component model={dsVariable} />
            </Stack>
          )}
          <div className={styles.controls}>
            {controls.map((control) => (
              <control.Component key={control.state.key} model={control} />
            ))}
          </div>
        </Stack>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    preview: css({
      cursor: 'help',

      '> div:first-child': {
        padding: '5.5px',
      },
    }),

    container: css({
      display: 'flex',
      gap: theme.spacing(7),
      flexDirection: 'column',
      margin: `0 0 ${theme.spacing(4)} 0`,
      justifyContent: 'center',
    }),

    header: css({
      display: 'flex',
      alignItems: 'center',
      backgroundColor: theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary,
      borderRadius: theme.spacing(0.5),
      flexWrap: 'wrap',
      justifyContent: 'center',
      padding: theme.spacing(3),
      gap: theme.spacing(4),
    }),
    headerTitleContainer: css({
      display: 'flex',
      alignItems: 'center',
    }),
    title: css({
      margin: `0 0 0 ${theme.spacing(2)}`,
    }),

    headerActions: css({
      alignItems: 'center',
      justifyContent: 'flex-start',
      display: 'flex',
      gap: theme.spacing(2),
    }),
    arrowIcon: css({
      marginheaderTitleContainer: theme.spacing(1),
    }),
    documentationLink: css({
      textDecoration: 'underline',
      '&:hover': {
        textDecoration: 'underline',
      },
    }),

    subHeader: css({
      textAlign: 'center',
      'h4': {
        margin: 0,
      }
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
