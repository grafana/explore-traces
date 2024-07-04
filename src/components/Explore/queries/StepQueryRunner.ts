import { QueryRunnerState, sceneGraph, SceneQueryRunner } from '@grafana/scenes';
import { getStepForTimeRange } from '../../../utils/dates';

export class StepQueryRunner extends SceneQueryRunner {
  constructor(state: QueryRunnerState) {
    super(state);
    this.addActivationHandler(this._onActivateStep.bind(this));
  }

  private _onActivateStep() {
    const step = getStepForTimeRange(this, this.state.maxDataPoints);
    this.setState({
      queries: this.state.queries.map((query) => {
        return {
          ...query,
          step,
        };
      }),
    });

    const sceneTimeRange = sceneGraph.getTimeRange(this);
    sceneTimeRange.subscribeToState((newState, prevState) => {
      if (newState.value.from !== prevState.value.from || newState.value.to !== prevState.value.to) {
        const newStep = getStepForTimeRange(this, this.state.maxDataPoints);
        this.setState({
          queries: this.state.queries.map((query) => {
            return {
              ...query,
              step: newStep,
            };
          }),
        });
      }
    });
  }
}
