# robinhood-decompiled

This repo is a consolidated view of a decompiled Robinhood Android app plus an audit bundle.

## 🆕 Monorepo Structure

This repository now includes a **TypeScript monorepo** for building automated trading tools based on the decompiled Robinhood API:

- **[MONOREPO.md](./MONOREPO.md)** - Complete monorepo development guide
- **[Agent Tasks](./.github/agent-tasks/README.md)** - Task definitions for parallel agent development
- **[Trading Bot Plans](./trading-bot-plans/README.md)** - Implementation documentation
- **[Packages](./packages/)** - TypeScript packages (API client, trading service, bots, etc.)

Multiple agents can work in parallel on different packages. See [MONOREPO.md](./MONOREPO.md) for details.

## Quick map (start here)

- Decompiled app tree:
  - Code: `app/sources/`
  - Resources: `app/resources/` (includes `AndroidManifest.xml` and `META-INF/`)
- Audit bundle:
  - Reports: `audit/reports/`
  - Manifest/meta: `audit/manifest/`, `audit/meta/`
  - Protos: `audit/protos/`
  - Curated subset: `audit/sources/`, `audit/resources/`

## Why the repo is structured this way

Decompilation output is not a normal Android Studio project. The goal here is navigation and review:

- `app/` is the single canonical \"full fidelity\" decompile output (includes native libs under `app/resources/lib/*.so` when present).
- `audit/` is review-oriented material (indices, extracted manifest/meta, collected protos, and a curated subset of sources/resources).

## Structure

### Top-level

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

### Entry points for common tasks

- Search code: `app/sources/`
- Find Android manifest:
  - `app/resources/AndroidManifest.xml`
  - `audit/manifest/AndroidManifest.xml`
- Skim permissions/components quickly: `audit/reports/manifest_components.txt`
- Identify major feature areas (packages): `audit/reports/top_packages.txt`
- Find network endpoints / hosts: `audit/reports/url_hosts.txt`

### `audit/sources/com/robinhood` map

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

More detail on the biggest areas (names inferred from package paths; decompiler sometimes inserts
numeric package segments like `p271ui`):

- `audit/sources/com/robinhood/android/` (app/feature surface)
  - `.../transfers/*` (money movement flows; subpackages often end in `.../ui`).
  - `.../creditcard/*`, `.../equitydetail/*`, `.../crypto/*`, `.../futures/*`, `.../options/*` (major product areas).
  - `.../deeplink/targets/*` (deep link routing targets).
  - `.../navigation/app/*` (navigation shell / app-level routing).
  - `.../idl/*` (a very large set of generated proto/IDL models and service contracts; useful for API surfaces).

- `audit/sources/com/robinhood/shared/` (shared domain + UI primitives)
  - `.../trade/crypto/*` and `.../crypto/transfer/*` (crypto trading + transfer flows show up heavily here).
  - `.../tradeladder/*` (trade ladder UI + related helpers).
  - `.../order/type/*` (order type models/utilities).
  - `.../support/*`, `.../security/*`, `.../documents/*` (shared support/security/document flows).

- `audit/sources/com/robinhood/librobinhood/` (core libraries, especially data/store)
  - `.../data/store/*` (dominant subtree): \"store\" pattern for fetching/caching backend data.
  - `.../data/prefs/*` (preference-backed storage).
  - `.../logging/*`, `.../experiments/*` (cross-cutting concerns).

- `audit/sources/com/robinhood/rosetta/` (schemas + event logging)
  - `.../eventlogging/*` (event DTOs/schemas; many generated-looking classes).
  - `.../cashier/*` (cashier/payment related DTOs).
  - `.../converters/*` (type conversion glue between domains).
  - `.../midas/*`, `.../blockchain/*` (service-versioned model trees).

- `audit/sources/com/robinhood/store/` (feature-scoped stores)
  - `.../futures/*` (futures stores + marketdata + DI).
  - `.../supportchat/*` (support chat store/integration).
  - `.../paymentinstrument/*` (payment instrument/debit card).
  - `.../stripe/*` (Stripe-related resource/store wiring).

- `audit/sources/com/robinhood/compose/` (Compose UI)
  - `.../bento/component/*` (largest Compose component subtree).
  - `.../theme/*` (styles/themes).

- `audit/sources/com/robinhood/utils/` (shared utilities)
  - `.../moshi/jsonadapter/*` (JSON adapters).
  - `.../retrofit/*`, `.../room/*`, `.../datetime/*` (common infra helpers).

- `audit/sources/com/robinhood/networking/` and `audit/sources/com/robinhood/websocket/`
  - `.../networking/annotation/*` + `.../networking/interceptor/*` + `.../networking/util/*` (wiring and helpers).
  - `.../websocket/gateway/*` and versioned impls (e.g. `p410dx`, `p413md`) for different websocket feeds.

Smaller but notable modules you may care about:

- `audit/sources/com/robinhood/crypto/`, `audit/sources/com/robinhood/futures/`, `audit/sources/com/robinhood/options/`,
  `audit/sources/com/robinhood/transfers/`, `audit/sources/com/robinhood/wiretransfers/`: domain/feature areas.
- `audit/sources/com/robinhood/experiments/`: experimentation/feature-flag style code.
- `audit/sources/com/robinhood/security/`: security-related features (screen protect, prompts, prefs).
- `audit/sources/com/robinhood/chatbot/`, `audit/sources/com/robinhood/contentful/`, `audit/sources/com/robinhood/staticcontent/`:
  support/content delivery related integrations.

Note: names here are inferred from package paths; decompiled code is not always cleanly separated into modules.

## Notes / caveats

- Decompiled sources are not buildable as-is.
- Decompilers are not fully deterministic; naming/numbering differences can exist across runs even when behavior is unchanged.

"Codex, extract the trading api from the java code, only the trading api and write it in [whatever language]."

HINT: If you don't want to implement auth, grab an `Authorization: Bearer ...` header from the Robinhood Chrome web app (DevTools -> Network), paste it into a local `.env` as something like `ROBINHOOD_AUTH_TOKEN=Bearer ...`, and have your generated fetch client read and reuse that header for requests.
