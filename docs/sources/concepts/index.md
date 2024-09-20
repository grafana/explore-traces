---
description: Learn about concepts basic to tracing.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/concepts/
keywords:
  - Explore Traces
  - Concepts
title: Concepts
menuTitle: Concepts
weight: 200
---

# Concepts

Distributed traces provide a way to monitor applications by tracking requests across services.
Traces record the details of a request to help understand why an issue is or was happening.

Tracing is best used for analyzing the performance of your system, identifying bottlenecks, monitoring latency, and providing a complete picture of how requests are processed.

To use the Explore Traces app, you should understand these concepts:

- Rate, error, and duration (RED) metrics
- Traces and spans
- Trace structure

{{< docs/public-preview product="Explore Traces" >}}

## Rate, error, and duration metrics

The Explore Traces app lets you explore rate, error, and duration (RED) metrics generated from your traces by Tempo.

| Metric | Meaning | Useful for investigating |
|---|---|---|
| Rate | Number of requests per second | Unusual spikes in activity |
| Error | Number of those requests that are failing | Overall issues in your tracing ecosystem |
| Duration | Amount of time those requests take, represented as a histogram | Response times and latency issues |

For more information about the RED method, refer to [The RED Method: how to instrument your services](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/).

## Traces and spans

A trace represents the whole journey of a request or an action as it moves through all the nodes of a distributed system, especially containerized applications or microservices architectures.
This makes them the ideal observability signal for discovering bottlenecks and interconnection issues.

Traces are composed of one or more spans.
A span is a unit of work within a trace that has a start time relative to the beginning of the trace, a duration, and an operation name for the unit of work.
It usually has a reference to a parent span, unless it’s the first span, the root span, in a trace.
It frequently includes key/value attributes that are relevant to the span itself, for example, the HTTP method used in the request, as well as other metadata such as the service name, sub-span events, or links to other spans.

For more information, refer to [Use traces to find solutions](https://grafana.com/docs/tempo/<TEMPO_VERSION>/introduction/solutions-with-traces/) in the Tempo documentation.

## Trace structure

Traces are telemetry data structured as trees.
Traces are made of spans (for example, a span tree); there is a root span that can have zero to multiple branches that are called child spans.
Each child span can itself be a parent span of one or multiple child spans, and so on so forth.

![Trace_and_spans_in_tree_structure](/media/docs/tempo/traceql/trace-tree-structures-and-spans.png)

In the specific context of TraceQL, a span has the following associated fields:

- **name**: the span name
- **duration**: difference between the end time and start time of the span
- **status**: enum: `{ok, error, unset}`. For details, refer to [OTel span status](https://opentelemetry.io/docs/concepts/signals/traces/#span-status) documentation.
- **kind**: enum: `{server, client, producer, consumer, internal, unspecified}`. For more details, refer to [OTel span kind ](https://opentelemetry.io/docs/concepts/signals/traces/#span-kind) documentation.
- Attributes: custom span metadata in the form of key-value pair values. For details, refer to [Attribute fields](https://grafana.com/docs/tempo/<TEMPO_VERSION>/traceql/#attribute-fields).

For more information, refer to [Trace structure and TraceQL](https://grafana.com/docs/tempo/<TEMPO_VERSION>/traceql/trace-structure/) in the Tempo documentation.