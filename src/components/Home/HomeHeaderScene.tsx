import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
} from '@grafana/scenes';
import { Badge, Button, Dropdown, Icon, Menu, Stack, Tooltip, useStyles2 } from '@grafana/ui';

import {
  EXPLORATIONS_ROUTE,
  VAR_DATASOURCE,
} from '../../utils/shared';
import { getHomeScene } from '../../utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Home } from 'pages/Home/Home';

const version = process.env.VERSION;
const buildTime = process.env.BUILD_TIME;
const commitSha = process.env.COMMIT_SHA;
const compositeVersion = `v${version} - ${buildTime?.split('T')[0]} (${commitSha})`;

export class HomeHeaderScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<Home>) => {
    const home = getHomeScene(model);
    const navigate = useNavigate();
    const { controls } = home.useState();
    const styles = useStyles2(getStyles);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, home);

    const menu = 
    <Menu>
      <div className={styles.menu}>
        <Menu.Item 
          label="Give feedback" 
          ariaLabel="Give feedback" 
          icon={"comment-alt-message"}
          url='https://grafana.qualtrics.com/jfe/form/SV_9LUZ21zl3x4vUcS'
          target='_blank'
          onClick={() => reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.global_docs_link_clicked)}
        />
        <Menu.Item
          label="Documentation"
          ariaLabel="Documentation"
          icon={"external-link-alt"}
          url='https://grafana.com/docs/grafana/next/explore/simplified-exploration/traces/'
          target='_blank'
          onClick={() => reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.feedback_link_clicked)}
        />
      </div>
    </Menu>;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <h2>Explore Traces</h2>
            <div className={styles.titleAction}>
              <p>A completely query-less experience to help you visualise your tracing data</p>
              <Button variant='primary' onClick={() => navigate(EXPLORATIONS_ROUTE)}>
                Explore Traces
                <Icon className={styles.helpIcon} name='arrow-right' size='lg' />
              </Button>
            </div>
          </div>

          <Stack gap={2} justifyContent={'space-between'}>
            {dsVariable && (
              <Stack gap={1} alignItems={'center'}>
                <div className={styles.datasourceLabel}>Data source</div>
                <dsVariable.Component model={dsVariable} />
              </Stack>
            )}
            <div className={styles.controls}>
              <Tooltip content={<PreviewTooltip text={compositeVersion} />} interactive>
                <span className={styles.preview}>
                  <Badge text='&nbsp;Preview' color='blue' icon='rocket' />
                </span>
              </Tooltip>

              <Dropdown overlay={menu} onVisibleChange={() => setMenuVisible(!menuVisible)}>
                <Button variant="secondary" icon="info-circle">
                  Need help
                  <Icon className={styles.helpIcon} name={menuVisible ? 'angle-up' : 'angle-down'} size="lg" />
                </Button>
              </Dropdown>
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
      <div className={styles.tooltip}>{text}</div>
    </Stack>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      gap: theme.spacing(2),
      flexDirection: 'column',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
    }),

    header: css({
      backgroundColor: theme.colors.background.canvas,
      display: 'flex',
      flexDirection: 'column',
      padding: `${theme.spacing(1.5)} 0`,
    }),
    title: css({
      alignItems: 'baseline',
      justifyContent: 'space-between',
      display: 'flex',
    }),
    titleAction: css({
      alignItems: 'baseline',
      justifyContent: 'space-between',
      display: 'flex',
      gap: theme.spacing(2),
    }),

    datasourceLabel: css({
      fontSize: '12px',
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
    menu: css({
      'svg, span': {
        color: theme.colors.text.link,
      },
    }),
    preview: css({
      cursor: 'help',

      '> div:first-child': {
        padding: '5.5px',
      },
    }),
    tooltip: css({
      fontSize: '14px',
      lineHeight: '22px',
      width: '180px',
      textAlign: 'center',
    }),
    helpIcon: css({
      marginLeft: theme.spacing(1),
    }),
  };
}
