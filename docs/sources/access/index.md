---
description: Access or install Explore Traces.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/tempo/access/
keywords:
  - Install
  - Configure
  - Explore Traces
menuTitle: Access or install
weight: 150
refs:
  tempo-data-source:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/datasources/tempo/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/
---

# Access or install Explore Traces

{{< docs/public-preview product="Explore Traces" >}}

You can access Explore Traces using any of these:

 - [Grafana Cloud](access-in-grafana-cloud): The easiest method, since no setup or installation is required.
 -  Self-managed [Grafana](#access-in-self-managed-grafana) open source or Enterprise: You must install the Explore Traces plugin.

Explore Traces requires Tempo 2.6 or newer.

## Set up in Grafana Cloud

To use Explore Traces with Grafana Cloud, you need:

- A Grafana Cloud account
- A Grafana stack in Grafana Cloud with a configured [Tempo data source](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/configure-tempo-data-source/) receiving tracing data

## Set up in self-managed Grafana

To use Explore Traces with self-managed Grafana open source or Grafana Enterprise, you need:

- Your own Grafana instance running 11.2 or newer
- Tempo 2.6 or newer
- A configured [Tempo data source](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/) receiving tracing data

Next, [access Explore Traces](#access-explore-traces).

### Install the Explore Traces plugin

Explore Traces is distributed as a Grafana Plugin.
You can find it in the official [Grafana Plugin Directory](https://grafana.com/grafana/plugins/grafana-exploretraces-app/).


### Install in your Grafana instance

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

### Install for a Docker container

If you want to install the app in a Docker container, configure the following environment variable:

```shell
GF_INSTALL_PLUGINS=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip;grafana-traces-app
```

## Access Explore Traces

To access Explore Traces:

1. Open your Grafana stack in a web browser.
1. In the main menu, select **Explore** > **Traces**.