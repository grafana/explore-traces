---
description: Learn how to get started with Explore Traces
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/get-started/
keywords:
  - Explore Traces
  - Get started
title: Get started with Explore Traces
menuTitle: Get started
weight: 300
---

# Get started with Explore Traces

{{< docs/public-preview product="Explore Traces" >}}

Traces can help you identify errors in your apps and services.
Using this information, you can optimize and streamline your apps.

Your investigation begins with the big picture and then drills down using primary signals, RED metrics, filters, and structural or trace list tabs to explore your data. To learn more, refer to [Concepts](../concepts/).

<!--Update with Explore Traces blog post - To learn more about Explore Traces, read [The new, queryless UI for Grafana Pyroscope: Introducing Explore Profiles](https://grafana.com/blog/2024/07/18/the-new-queryless-ui-for-grafana-pyroscope-introducing-explore-profiles/). -->

<!-- Needs to be updated - {{< youtube id="_8SbNN5DRmQ" >}} -->

{{< admonition type="note" >}}
Expand your observability journey and learn about [Explore Traces](https://grafana.com/docs/grafana-cloud/visualizations/simplified-exploration/traces/).
{{< /admonition >}}

## Before you begin

To use Explore Traces with Grafana Cloud, you need:

- A Grafana Cloud account
- A Grafana stack in Grafana Cloud with a configured Tempo data source

To use Explore Traces with self-managed Grafana, you need:

- Your own Grafana v11.2 or newer instance with a configured Tempo data source
- Installed Explore Traces plugin

For more details, refer to [Access Explore Traces](../access/).

## Explore your tracing data

Most investigations follow these steps:

1. Select the primary signal.
1. Choose the metric you want to use: rates, errors, or duration.
1. Define filters to refine the view of your data.
1. Use the structural or trace list to drill down into the issue.

{{< docs/play title="the Grafana Play site" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}

## Example: Investigate source of errors

For example, say that you want to figure out the source of errors in your spans.

You'll need to compare the errors in the traces to locate the problem trace.
Here's how this works.

### Choose a signal type and metric

First, you select **Full traces** as the signal type and then choose the **Errors** metric.
Using **Full traces** provides insights into the errors in the root of your traces or at the edge of your application.
For other investigations, you could use **Server spans** signal type if you're interested in any entrypoint to any service or **Database calls** if you're concerned about databases.

![Select the signal type and metric type](../images/explore-traces-select-signal-errors.gif)

### Correlate attributes

To correlate attribute values with errors, you can use the **Breakdown** tab.
This tab surfaces attributes values that heavily correlate with erroring spans.
The results are ordered by the difference in those attributes by the highest ones first which helps
you see what's causing the errors immediately.
You can see here that 99.34% of the time the span name was equal to `HTTP GET /api/datasources/proxy/uid/:uid/*` the span was also erroring.

![Errors are immediately visible by the large red bars](images/explore-traces-errors-metric-flow.png)

### Inspect the problem

To dig deeper into this issue, select **Inspect** to focus in on the problem.
It's easy to spot the problem: the tall, red bar indicates that the problems are happening with  `HTTP GET /api/datasources/proxy/uid/:uid/*`.
Next, use **Add to filters** to focus just on the erroring API call.

![Add to filters to focus on the API call](images/explore-traces-errors-add-filters-flow.png)

### Use Root cause errors

Selecting the **Root cause errors** tab shows an aggregated view of all of the traces that have errors in them.
To view additional details, you right-click on a line and select **HTTP Outgoing Request**.

![Contextual menu available in the Root cause errors tab](images/explore-traces-errors-rcause-menu.png)

Clicking on an entry opens up one of the individual traces used to construct that aggregate view so you can deep dive into a single example transaction.

![Link to span data from Root cause errors](images/explore-traces-errors-root-cause.png)
