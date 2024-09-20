---
cascade:
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
hero:
  title: Explore Traces
  level: 1
  width: 100
  height: 100
  description: Use Explore Traces to investigate and identify issues using tracing data.
cards:
  title_class: pt-0 lh-1
  items:
    - title: Concepts
      href: ./concepts/
      description: Learn the concepts you need to use tracing.
      height: 24
    - title: Get started
      href: ./get-started/
      description: How do you use tracing data to investigate an issue? Start here.
      height: 24
    - title: Access or install
      href: ./access/
      description: Access or install Explore Traces.
      height: 24
    - title: Investigate trends and spikes
      href: ./investigate/
      description: Use your tracing data to identify issues and determine the root cause.
      height: 24
    - title: Changelog
      href: https://github.com/grafana/explore-traces/blob/main/CHANGELOG.md
      description: Learn about the updates, new features, and bugfixes in this version.
      height: 24
---

# Explore Traces
<!-- Use this for the product name {{< param "PRODUCT_NAME" >}} -->

{{< docs/public-preview product="Explore Traces" >}}

Distributed traces provide a way to monitor applications by tracking requests across services.
Traces record the details of a request to help understand why an issue is or was happening.

Explore Traces helps you visualize insights from your Tempo traces data.
Using the app, you can:

* Use Rate, Errors, and Duration (RED) metrics derived from traces to investigate issues
* Uncover related issues and monitor changes over time
* Browse automatic visualizations of your data based on its characteristics
* Do all of this without writing TraceQL queries

<!-- need new video {{< youtube id="Yqx8yCMCvgQ" >}} -->

![The Explore Traces app](explore-traces-homescreen.png)



## Explore

{{< card-grid key="cards" type="simple" >}}