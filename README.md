# Grafana Traces app

Grafana app plugin that allows users for a query-less way to navigate and visualize trace data stored in Tempo.

## Access or install Explore Traces

You can access Explore Traces using Grafana Cloud or a self-managed OSS Grafana or Grafana Enterprise.

The easiest way to access Explore Traces is in Grafana Cloud. No setup or installation is required.

To use Explore Traces with self-managed Grafana, you need to install the Explore Traces plugin.

### Grafana Cloud

To use Explore Traces, you need:

* A Grafana Cloud account
* A Grafana stack in Grafana Cloud with a configured Tempo data source receiving tracing data

To access Explore Traces:

1. Open your Grafana stack in a web browser.
1. In the main menu, select **Explore** > **Traces**.

### Grafana

To use Explore Traces with Grafana open source or Grafana Enterprise, you need:

- Your own Grafana instance
- A configured [Tempo data source](ref:tempo-data-source)
- The [Explore Traces plugin](https://grafana.com/grafana/plugins/explore-traces-app/)

#### Install the Explore Traces plugin

Explore Traces is distributed as a Grafana Plugin.
You can find it in the official [Grafana Plugin Directory](https://grafana.com/grafana/plugins/grafana-exploretraces-app/).

>**NOTE:** All Grafana Cloud instances come with the Explore Traces plugin preinstalled.

#### Install in your Grafana instance

You can install Explore Traces in your own Grafana instance using `grafana cli`:

```shell
grafana cli --pluginUrl=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip plugins install grafana-traces-app
```

Alternatively, follow these steps to install Explore Traces in Grafana:

1. In Grafana, go to **Administration** > **Plugins and data** > **Plugins**.
2. Search for "Explore Traces".
3. Select Explore Traces.
4. Click **Install**.

The plugin is automatically activated after installation.

#### Install for a Docker container

If you want to install the app in a Docker container, you need to configure the following environment variable:

```shell
GF_INSTALL_PLUGINS=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip;grafana-traces-app
```

## Learn more 

To learn more about Explore Traces, refer to our documentation in [the repository](docs/sources/_index.md) or published in the [Grafana open source](https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces) documentation. 

## Contribute 

Want to help with the project? Consider contributing to the project. 
