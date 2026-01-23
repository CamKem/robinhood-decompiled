# Structure

This document is a deeper map of the repository contents.

## Top-level

- `app/`
  - Purpose: single canonical \"full fidelity\" decompile output.
  - Shape: `app/sources/` (Java) + `app/resources/` (Android res, manifest, META-INF, etc.).
  - Notable: may contain native libs under `app/resources/lib/*.so`.

- `audit/`
  - Purpose: audit-oriented bundle for review and analysis.
  - Notable folders:
    - `audit/reports/`: generated summaries (package list, URL hosts, manifest components, file index)
    - `audit/protos/`: collected protobuf definitions
    - `audit/manifest/`: AndroidManifest.xml extracted for quick review
    - `audit/meta/`: META-INF artifacts
    - `audit/sources/` + `audit/resources/`: curated subset of code/resources

## Entry points for common tasks

- Search code:
  - `app/sources/`
- Find Android manifest:
  - `app/resources/AndroidManifest.xml`
  - `audit/manifest/AndroidManifest.xml`
- Skim permissions/components quickly:
  - `audit/reports/manifest_components.txt`
- Identify major feature areas (packages):
  - `audit/reports/top_packages.txt`
- Find network endpoints / hosts:
  - `audit/reports/url_hosts.txt`

## `audit/sources/com/robinhood` map

`audit/sources/` is a curated subset of decompiled Java sources. It is mostly Robinhood-owned code
under `audit/sources/com/robinhood/` (rather than third-party libraries).

High-level breakdown (approximate, by file count):

- `audit/sources/com/robinhood/android/`: main Android app code (UI, features, wiring); largest area.
- `audit/sources/com/robinhood/shared/`: shared/business logic and common primitives used across features.
- `audit/sources/com/robinhood/librobinhood/`: core Robinhood client libs (networking/data/model plumbing).
- `audit/sources/com/robinhood/rosetta/`: schema/DTO/event logging related code (many generated-looking types).
- `audit/sources/com/robinhood/store/`: data stores/repositories and related modules.
- `audit/sources/com/robinhood/api/`: API layer helpers, auth/token handling abstractions.
- `audit/sources/com/robinhood/compose/`: Jetpack Compose UI components and themes.
- `audit/sources/com/robinhood/networking/`: networking utilities/interceptors/annotations.
- `audit/sources/com/robinhood/websocket/`: websocket clients and message handling.

Smaller but notable modules you may care about:

- `audit/sources/com/robinhood/crypto/`, `audit/sources/com/robinhood/futures/`, `audit/sources/com/robinhood/options/`,
  `audit/sources/com/robinhood/transfers/`, `audit/sources/com/robinhood/wiretransfers/`: domain/feature areas.
- `audit/sources/com/robinhood/experiments/`: experimentation/feature-flag style code.
- `audit/sources/com/robinhood/security/`: security-related features (screen protect, prompts, prefs).
- `audit/sources/com/robinhood/chatbot/`, `audit/sources/com/robinhood/contentful/`, `audit/sources/com/robinhood/staticcontent/`:
  support/content delivery related integrations.

Note: names here are inferred from package paths; decompiled code is not always cleanly separated into modules.
