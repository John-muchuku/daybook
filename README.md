# Daybook

A local-first task and notes app built with Expo SDK 57, React Native, TypeScript, and Expo Router. Warm neutrals, quiet orange accents, a responsive desktop sidebar, and four mobile tabs: Today, Tasks, Notes, and Search.

## Run

```sh
bun install
bun start
# Or: bun run web / bun run ios / bun run android
```

Development builds seed editable example tasks, notes, and lists on the first launch. Set `EXPO_PUBLIC_DEMO=0` to start with an empty workspace. Production builds start empty unless `EXPO_PUBLIC_DEMO=1` is explicitly set. Seed data is written through the same repositories as user data and never replaces an existing workspace.

## Features

- Quick task capture; date shortcuts and calendar picker; due times, priorities, lists, and shared tags.
- Today, overdue, Inbox, Upcoming grouped by date, and Completed with restore.
- Subtasks and daily, weekday, weekly, monthly, yearly, or custom weekly recurrence. Month-end and leap-year handling retain the original date anchor.
- Swipe right to complete; swipe left or use the row menu for task details and actions.
- Task deletion with a five-second undo opportunity.
- Notes with headings, bold, italic, bullets, numbered lists, checklists, preview, pinning, colors, and optional task/list links.
- Create, rename, reorder, archive, and delete lists. List deletion explicitly offers moving tasks to Inbox or deleting them; notes are retained.
- Search task titles/descriptions, note content, tags, and lists with type, completion, tag, and date filters.
- Native local reminders with offset choices, cancellation on completion/deletion, rescheduling on changes, and task opening from a notification.
- Light, dark, and system appearance, persisted locally.
- Web keyboard shortcuts: Cmd/Ctrl+K for search; Cmd/Ctrl+N for capture.

## Structure

- `src/app/`: Expo Router entry and root providers.
- `src/components/`: shared controls, task rows, note cards, Markdown preview, and calendar picker.
- `src/features/`: workspace screens and task/note/list editors.
- `src/hooks/useDaybook.tsx`: application state and coordinated operations.
- `src/db/`: versioned SQLite initialization, repositories, and optional seed data.
- `src/services/`: platform-specific notification scheduling and responses.
- `src/utils/`: local date handling, validation, and recurrence calculations.
- `src/types/`: shared data contracts.

SQLite is used on iOS and Android. Indexed columns support task status, dates, lists, and note ordering; complete versionable records are stored as JSON payloads. All SQL stays in the repository and user values use bound parameters. The browser has a separate localStorage adapter, avoiding the cross-origin isolation requirements of Expo SQLite's experimental web support. Browser data does not sync with native data.

No backend, account system, analytics, or network data storage is added. Expo SQLite supplies native persistence, expo-notifications supplies local reminders, expo-haptics supplies completion feedback, and Expo vector icons supply consistent icons. The existing Expo-compatible React Native stack handles the UI without an additional component framework.

## Validation

```sh
bun run typecheck
bun run test
npx expo export --platform all
```

The Node tests use TypeScript transpilation and a real in-memory SQLite engine (Node 22.13+). They cover migrations, bound-parameter CRUD, browser persistence, date validation, month-end/leap-year recurrence, reminder offsets/cancellation, denied permissions, and notification task routing. Device APIs are mocked in the notification unit test.

Browser journeys verified at desktop and 390px mobile widths: task capture, tomorrow scheduling, completion/restore, recurrence, subtasks, list creation/moving, note creation/pinning, note-content search, persistence after reload, and dark mode. Browser checks also assert no runtime console errors or horizontal overflow.

### Device release checks

Use an iOS and Android development build to verify actual notification delivery, tap-to-open after a cold start, permissions, keyboard behavior, and swipe/haptic feedback. Web cannot schedule device reminders and clearly explains this when one is requested.

### Data volume

Native screens load pages of 100 records from SQLite; Today queries its groups separately and Notes loads recent records first. Search filters stored task descriptions, note content, tags, and list names before applying the page limit, so older records remain searchable. Global counts are calculated in SQL. Load more fetches the next page. The browser adapter applies equivalent paging to localStorage records. A regression test covers paging and finding a description outside the first page with 2,005 tasks. Large-device performance has not been benchmarked.
