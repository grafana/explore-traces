# Changelog

## [0.2.0](https://github.com/grafana/explore-traces/compare/v0.1.3...v0.2.0) (2025-01-10)

### Features

* **Support for exemplars:** Quickly jump to the relevant data points or logs for deeper troubleshooting with newly added support for exemplars, directly on your metrics graph. By clicking on a point of interest on the graph—like a spike or anomaly—you can quickly jump to the relevant traces for deeper troubleshooting and dramatically reduce the time it takes to root cause an issue. ([#278](https://github.com/grafana/explore-traces/pull/278)) Requires Grafana >= 11.5.0
* **Open traces in Explore:** When viewing trace spans, now you can easily open the full trace in Explore. This provides a streamlined way to pivot between trace analysis and the broader Grafana Explore experience without losing context. ([#267](https://github.com/grafana/explore-traces/pull/267))

### Enhancements

* **Trace breakdown adjusts better to smaller screens:** The **Breakdown** tab now automatically adjusts its attribute selector display based on available screen width, improving usability on smaller viewports. ([#267](https://github.com/grafana/explore-traces/pull/267))
* **Search is now case-insensitive:** Search in the **Breakdown** and **Comparison** tabs now ignores capitalization, ensuring you see all matching results. ([#252](https://github.com/grafana/explore-traces/pull/252))
* **Performance boost and reduced bundle size**: Code-splitting and lazy loading for faster loading times. Only the modules you need are fetched on demand, cutting down on initial JavaScript payload and improving app performance. ([#275](https://github.com/grafana/explore-traces/pull/275))
* **Various fixes and improvements:** Fixed loading and empty states. Fixed broken documentation link. Refined styles above filters for a more polished look. Added descriptive text to the Span List tab for added clarity. Enhanced tooltip design for RED metrics. Standardized error messages and titles, plus added helpful hints when an empty state appears. ([#263](https://github.com/grafana/explore-traces/pull/263))

## 0.1.2

Release public preview version.
