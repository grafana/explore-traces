---
cascade:
  _build:
    list: false
  noindex: true
  FULL_PRODUCT_NAME: Grafana Explore Traces
  PRODUCT_NAME: Explore Traces
description: Learn about traces and how you can use them to understand and troubleshoot
  your application and services.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/
keywords:
  - Explore Traces
  - Traces
title: Explore Traces
menuTitle: Explore Traces
weight: 100
refs:
  tempo-data-source:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/datasources/tempo/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/
---

# Explore Traces
<!-- Use this for the product name {{< param "PRODUCT_NAME" >}} -->

{{< docs/public-preview product="Explore Traces" >}}

Distributed traces provide a way to monitor applications by tracking requests across services.
Traces record the details of a request to help understand why an issue is or was happening.

Tracing is best used for analyzing the performance of your system, identifying bottlenecks, monitoring latency, and providing a complete picture of how requests are processed.

Explore Traces helps you easily get started and make sense of your tracing data so you can automatically visualize insights from your Tempo and Hosted traces data.
Before this app, you would use [TraceQL](https://grafana.com/docs/tempo/<TEMPO_VERSION>/traceql/), the query language for tracing, to [construct a query](https://grafana.com/docs/grafana-cloud/send-data/traces/traces-query-editor/) in Grafana.

<!-- need new video {{< youtube id="Yqx8yCMCvgQ" >}} -->

<!-- ![The Explore Traces app](explore-traces-homescreen.png) -->

Using the app, you can:

* Use Rate, Errors, and Duration (RED) metrics derived from traces to investigate issues
* Uncover related issues and monitor changes over time
* Browse automatic visualizations of your data based on its characteristics
* Do all of this without writing TraceQL queries

## Concepts

To use the Explore Traces app, you should understand traces, spans, RED metrics, and other concepts related to tracing.

This section provides an overview of some of these concepts and links to additional resources.

### Rate, error, and duration metrics

The Explore Traces app lets you explore rate, errors, and duration (RED) metrics generated from your traces by Tempo.

| Metric | Meaning | Useful for investigating |
|---|---|---|
| Rate | Number of requests per second | Unusual spikes in activity |
| Error | Number of those requests that are failing | Overall issues in your tracing ecosystem |
| Duration | Amount of time those requests take, represented as a histogram | Response times and latency issues |

For more information about the RED method, refer to [The RED Method: how to instrument your services](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/).

### Traces and spans

A trace represents the whole journey of a request or an action as it moves through all the nodes of a distributed system, especially containerized applications or microservices architectures.
This makes them the ideal observability signal for discovering bottlenecks and interconnection issues.

Traces are composed of one or more spans.
A span is a unit of work within a trace that has a start time relative to the beginning of the trace, a duration, and an operation name for the unit of work.
It usually has a reference to a parent span, unless it’s the first span, the root span, in a trace.
It frequently includes key/value attributes that are relevant to the span itself, for example, the HTTP method used in the request, as well as other metadata such as the service name, sub-span events, or links to other spans.

For more information, refer to [Use traces to find solutions](https://grafana.com/docs/tempo/latest/introduction/solutions-with-traces/) in the Tempo documentation.

## Access or install Explore Traces

You can access Explore Traces using Grafana Cloud, Grafana, and Grafana Enterprise.

The easiest way to access Explore Traces is in Grafana Cloud.
If you have a Tempo data source or Cloud Traces data source configured, then you have access to Explore Traces.

To use Explore Traces with self-managed Grafana, you need to install the Explore Traces plugin.

### Grafana Cloud

To use Explore Traces, you need:

* A Grafana Cloud account
* A Grafana stack in Grafana Cloud with a configured Hosted Traces or Tempo data source

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
You can find it in the official [Grafana Plugin Directory](https://grafana.com/grafana/plugins/grafana-pyroscope-app/).

<!-- This is true for the other plugins. Will this be true for Explore Traces?
{{< admonition type="note" >}}
All Grafana Cloud instances come with the Explore Traces plugin preinstalled.
{{< /admonition >}}
-->

#### Install in your Grafana instance

You can install Explore Traces in your own Grafana instance using `grafana-cli`:

```shell
grafana-cli --pluginUrl=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip plugins install grafana-traces-app
```

https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip;grafana-traces-app

Alternatively, follow these steps to install Explore Traces in Grafana:

1. In Grafana, go to **Administration** > **Plugins and data** > **Plugins**.
2. Search for "Explore Traces".
3. Select Explore Traces.
4. Click **Install**

The plugin is automatically activated after installation.

#### Install for a Docker container

If you want to install the app in a Docker container, you need to configure the following environment variable:

```shell
GF_INSTALL_PLUGINS=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip;grafana-traces-app
```

## Investigate tracing data

When investigating tracing data, you first narrow down the process level that's having the issue.
This includes filters like cluster, namespace, environment, region, or process.

After you’ve identified the problem process, you can filter and explore using process internals.
This includes filters like `http.path`, `db.statement`, or span name.
This identifies activities conducted by the resource.

Your investigations follow these general steps:

1. Determine the metric you want to use: rates, errors, or duration.
1. Define filters to refine the view of your data.
1. Investigate the data to compare a baseline and selected data.
1. Inspect data to drill down to view a breakdown, structure of the span tree, or individual spans.

### Determine which RED metric

Explore Traces uses RED metrics generated from your tracing data to guide your investigation.
In this context, RED metrics mean:
* **Rates** show the spans per second that match your filter.
* **Errors** show spans that are failing.
* **Duration** displays the amount of time those spans take; represented as a heat map that shows response time and latency.

1. Select a metric type a graph to select a **Rate**, **Error**, or **Duration** metric type. Notice that your selection adds to the filter bar.
1. Optional: Select the signal you want to observe. **Full traces** are the default selection.
1. Look for spikes or trends in the data to help identify issues.

{{< admonition type="tip" >}}
If no data or limited data appears, refresh the page. Verify that you have selected the correct data source in the Data source drop-down.
{{< /admonition >}}

### Change the signal type to observe

Tracing data is highly structured and annotated and reflects events that happen in your services.
You can choose the type of services you want to observe and think about.

You can use the full trace (trace roots), or you can select a more specific type, such as service or database calls.

By default, Explore Traces displays information about full traces. You can change this by using the selector in the Filter bar.

![Selecting a signal type](explore-traces-select-signal.png)

### Define filters

Next, refine your investigation by adding filters.

Each time you add a filter, the condition appears in the list of filters.
The list of filters expands as you investigate and explore your tracing data using Explore Traces.

1. Refine your investigation by adding filters or select **Analyze the current selection**.
1. Optional: Choose one of the attributes to group by or use **Search** to locate the service.
1. Optional: Select **Add to filters** or **Analyze Traces** to drill-down into the data.
1. Select **Analyze Traces** to focus the displayed data into your filtered view.
1. Select filters to hone in on the problem areas. Each filter that select adds to the Filter statement at the top of the page. You can select filters in the following ways:
    1. Select **Inspect**.
    1. Use the **Search** field.

![Change filters for your investigation](explore-traces-filters.png)

#### Group by attributes

Using the Group by filter, you can group the selected metric by different attributes.
For example, if you have selected **Errors** as a metric type and then choose the `service.name` attribute, then the displayed results show the number of errors sorted by the `service.name` with the most matches.

The app defaults to `service.name` and displays other commonly used resource level attributes such as `cluster`, `environment`, and `namespace`.
However, in the drop-down, you can choose any resource level attribute to group by.

You can use **Other** attributes to select a different attribute.

#### Modify a filter

Selecting an option for a filter automatically updates the displayed data. If there are no matches, the app displays a “No data for selected query” message.

To modify an applied filter:

1. Select the filter to modify in the Filter bar.
1. Select a filter from the drop-down menu.

#### Remove one or more filters

You can remove all or individual filters.

To remove a filter, select **Remove filter** (**X**) at the end of the filter you want to remove.

To remove all filters, select **Clear filters** from the right side of the Filter bar.

Selecting **Clear filters** resets your investigation back to the first metric you selected.
For example, if you selected Errors metrics and **Group by** the `host` service.name, selecting **Clear filters** resets the search back to just **Errors** selected as the metric type.

### Compare tracing data



After you select **Analyze Traces**, you can compare the tracing data you’ve filtered with additional selections. Your original selection becomes the baseline data.
You can make additional selections to compare with the baseline.

The behavior of the comparison is different depending upon the RED metric you've chosen.

The **Breakdown** view shows the comparison results.

To compare tracing data after selecting Analyze Traces, select Investigate errors.

1. For Rate and Error investigations, select **Comparison**. For Duration investigations, select an area of the histogram to start an investigation.
1. Optional: Click and drag on the top graph or histogram to focus on a specific time frame or data range.
1. Optional: Add additional filters or change how the data displays by selecting a different attribute to search by.
1. Use **Breakdown**, **Structure**, and **Spans** tabs to view a summary, trace structure, or a list of spans matching your filter criteria.
1. Optional: Add, remove, or modify filters.

If you use the Structure or Spans view, you can return to the comparison by selecting **Comparison**.

Use the **Structure** view to see a list of the traces and spans that match the filters.
You can modify the structure to show available attributes, for example, errors, services, and databases.

![Using the Duration histogram and Structure view](explore-traces-histogram-structure.png)

Use the **Spans** view to see a list of all spans that match the filter criteria. You can expand the details contained in a span to locate specific errors.

![Identifying the error in the span](explore-traces-error-spans.png)

<!-- Notes >
Comparison - Nadine may have something on this. It's always showing you four every comparison of the exceptional events and the normal events for errors. That means the error vs the non errors. Duration - longest running span. Highligh which attributes are present on the longest running spans and the errors that are present on the longest running spans.

Service structure - Lot of functionality built into them. It's another high value. Shows the structure based on the traces and aggregate set up traces. STructure of what you're currently interested in. For Rate, it shows you how your applications work with each other. Errors shows the structure of the errors. Duration shows the structure of the longest running spans.

Example flow - I know a service has some errors and now I want to understand why.

Server spans > rate of service span errors- off service is failing. select those. comparison is the path of I want to see what i'sc orrelating at the level of the service. The root cause serriors what it's beneath the service using the structure of the spans.

Root cause latency - shows the structure of the metrics we're observing. Observing rate, then shows the services. -->

## Change selected time range

Use the time picker at the top right to modify the data shown in Explore Traces.

You can view data for up to the last three hours. This is a limitation of TraceQL metrics.

For more information about the time range picker, refer to [Use dashboards](https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/#set-dashboard-time-range).