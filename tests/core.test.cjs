const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, globals = {}) {
  const result = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports: result.exports,
    module: result,
    require: (name) => {
      if (!(name in imports)) {
        const target =
          path.resolve(path.dirname(path.join(__dirname, "..", file)), name) +
          ".ts";
        if (name.startsWith(".") && fs.existsSync(target))
          return load(
            path.relative(path.join(__dirname, ".."), target),
            imports,
            globals,
          );
        throw Error(`Unexpected import: ${name}`);
      }
      return imports[name];
    },
    ...globals,
  });
  return result.exports;
}
const dates = load("src/utils/dates.ts");
test("monthly recurrence clamps to the last day of a shorter month", () => {
  assert.equal(
    dates.nextOccurrence({ dueDate: "2026-01-31", recurrence: "Monthly" }),
    "2026-02-28",
  );
  assert.equal(
    dates.nextOccurrence({ dueDate: "2028-01-31", recurrence: "Monthly" }),
    "2028-02-29",
  );
});
test("yearly recurrence handles leap day", () =>
  assert.equal(
    dates.nextOccurrence({ dueDate: "2028-02-29", recurrence: "Yearly" }),
    "2029-02-28",
  ));
test("weekdays skip weekends and custom weeks cross year boundaries", () => {
  assert.equal(
    dates.nextOccurrence({ dueDate: "2026-09-18", recurrence: "Weekdays" }),
    "2026-09-21",
  );
  assert.equal(
    dates.nextOccurrence({
      dueDate: "2026-12-25",
      recurrence: "Custom",
      interval: 2,
    }),
    "2027-01-08",
  );
});
test("date validation rejects impossible dates", () => {
  assert.equal(dates.validDate("2026-02-30"), false);
  assert.equal(dates.validDate("2028-02-29"), true);
  assert.equal(dates.validDate("2026-13-01"), false);
  assert.equal(dates.validDate(""), true);
});
test("browser repository persists, updates, and deletes independent records", async () => {
  const storage = new Map();
  const globals = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  const repo = load("src/db/repository.web.ts", {}, globals);
  assert.equal(await repo.initialize(), true);
  await repo.saveTask({ id: "t1", title: "Original" });
  await repo.saveTask({ id: "t2", title: "Keep me" });
  await repo.saveTask({ id: "t1", title: "Updated" });
  await repo.saveNote({ id: "n1", content: "Remember this", pinned: true });
  const restarted = load("src/db/repository.web.ts", {}, globals);
  assert.equal(await restarted.initialize(), false);
  assert.equal((await restarted.readData()).tasks.length, 2);
  assert.equal(
    (await restarted.readData()).tasks.find((t) => t.id === "t1").title,
    "Updated",
  );
  await restarted.remove("tasks", "t1");
  assert.equal((await restarted.readData()).tasks[0].id, "t2");
  assert.equal((await restarted.readData()).notes[0].pinned, true);
});
test("native SQLite migrations are repeatable and CRUD queries persist data", async () => {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");
  const adapter = {
    execAsync: async (sql) => db.exec(sql),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    withTransactionAsync: async (fn) => {
      db.exec("BEGIN");
      try {
        await fn();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const repo = load("src/db/repository.ts", {
    "expo-sqlite": { openDatabaseAsync: async () => adapter },
  });
  assert.equal(await repo.initialize(), true);
  assert.equal(await repo.initialize(), false);
  await repo.saveTask({
    id: "sql1",
    title: "Call O'Brien",
    status: "active",
    dueDate: "2026-09-16",
    listId: "",
    updatedAt: "",
  });
  await repo.saveNote({
    id: "note1",
    title: "",
    content: "Persistent content",
    pinned: true,
    listId: "",
    updatedAt: "",
  });
  assert.equal((await repo.readData()).tasks[0].title, "Call O'Brien");
  assert.equal((await repo.readData()).notes[0].content, "Persistent content");
  await repo.setting("theme", "Dark");
  assert.equal(await repo.setting("theme"), "Dark");
  await repo.remove("tasks", "sql1");
  assert.equal((await repo.readData()).tasks.length, 0);
  for (let i = 0; i < 2005; i++)
    await repo.saveTask({
      id: `bulk${i}`,
      title: `Task ${i}`,
      description: i === 2004 ? "hidden-needle" : "",
      tags: [],
      status: "active",
      dueDate: "2026-09-16",
      listId: "bulk",
      updatedAt: "",
    });
  const scope = {
    view: "Tasks",
    filter: "All tasks",
    text: "",
    kind: "All",
    date: "",
    limit: 100,
  };
  const page = await repo.readData(scope);
  assert.equal(page.tasks.length, 100);
  assert.equal(page.hasMore, true);
  assert.equal(page.counts.lists.bulk, 2005);
  const found = await repo.readData({
    ...scope,
    view: "Search",
    text: "hidden-needle",
  });
  assert.equal(found.tasks.length, 1);
  assert.equal(found.tasks[0].id, "bulk2004");
  assert.equal((await repo.itemsInList("bulk")).tasks.length, 2005);
  db.close();
});
test("monthly recurrence retains the original day after a short month", () => {
  assert.equal(
    dates.nextOccurrence({
      dueDate: "2026-02-28",
      recurrence: "Monthly",
      recurrenceDay: 31,
    }),
    "2026-03-31",
  );
});
test("reminders replace schedules, apply offsets, cancel completed tasks, and open the task", async () => {
  const calls = [];
  let listener;
  let granted = true;
  const notifications = {
    setNotificationHandler: () => {},
    AndroidImportance: { HIGH: "high" },
    SchedulableTriggerInputTypes: { DATE: "date" },
    setNotificationChannelAsync: async () => calls.push("channel"),
    requestPermissionsAsync: async () => ({ granted }),
    cancelScheduledNotificationAsync: async (id) => calls.push(["cancel", id]),
    scheduleNotificationAsync: async (request) => calls.push(request),
    addNotificationResponseReceivedListener: (handler) => {
      listener = handler;
      return { remove: () => calls.push("removed") };
    },
    getLastNotificationResponse: () => null,
    clearLastNotificationResponse: () => {},
  };
  const service = load("src/services/reminders.ts", {
    "react-native": { Platform: { OS: "android" } },
    ...Object.fromEntries(
      [
        "NotificationsHandler",
        "NotificationsEmitter",
        "NotificationPermissions",
        "setNotificationChannelAsync",
        "scheduleNotificationAsync",
        "cancelScheduledNotificationAsync",
        "NotificationChannelManager.types",
        "Notifications.types",
      ].map((name) => [`expo-notifications/build/${name}`, notifications]),
    ),
  });
  const task = {
    id: "reminder1",
    title: "Remember",
    dueDate: "2099-09-16",
    dueTime: "10:00",
    reminder: "15",
    status: "active",
  };
  await service.updateReminder(task);
  const scheduled = calls.find((call) => call.identifier === task.id);
  assert.equal(scheduled.trigger.date.getHours(), 9);
  assert.equal(scheduled.trigger.date.getMinutes(), 45);
  assert.equal(scheduled.content.data.taskId, task.id);
  await service.updateReminder({ ...task, status: "completed" });
  assert.deepEqual(calls.at(-1), ["cancel", task.id]);
  const before = calls.filter(
    (call) => Array.isArray(call) && call[0] === "cancel",
  ).length;
  granted = false;
  await assert.rejects(service.updateReminder(task), /Enable notifications/);
  assert.equal(
    calls.filter((call) => Array.isArray(call) && call[0] === "cancel").length,
    before,
  );
  await assert.rejects(
    service.updateReminder({ ...task, dueDate: "2000-01-01" }),
    /future/,
  );
  let opened;
  const unsubscribe = service.listenForReminder((id) => {
    opened = id;
  });
  listener({
    notification: { request: { content: { data: { taskId: task.id } } } },
  });
  assert.equal(opened, task.id);
  unsubscribe();
  assert.equal(calls.at(-1), "removed");
});

test("local reminder runtime imports never load remote push registration on native", () => {
  const root = path.join(__dirname, "..");
  const packageRoot = path.dirname(
    require.resolve("expo-notifications/package.json"),
  );
  for (const platform of ["android", "ios"]) {
    const visited = new Set();
    function resolveNative(base) {
      const stem = base.replace(/\.js$/, "");
      const candidates = [
        `${stem}.${platform}.js`,
        `${stem}.native.js`,
        `${stem}.js`,
        `${stem}.ts`,
      ];
      const found = candidates.find((candidate) => fs.existsSync(candidate));
      assert(found, `Missing notification module: ${base}`);
      return found;
    }
    function visit(file) {
      if (visited.has(file)) return;
      visited.add(file);
      assert(
        !/(?:DevicePushTokenAutoRegistration|TokenEmitter|PushTokenManager|ServerRegistrationModule|warnOfExpoGoPushUsage)/.test(
          file,
        ),
        `Remote-push import on ${platform}: ${file}`,
      );
      assert.notEqual(file, path.join(packageRoot, "build/index.js"));
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      for (const statement of source.statements) {
        if (
          !(
            ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement)
          ) ||
          !statement.moduleSpecifier
        )
          continue;
        if (statement.isTypeOnly || statement.importClause?.isTypeOnly)
          continue;
        const specifier = statement.moduleSpecifier.text;
        if (specifier === "expo-notifications")
          assert.fail("Runtime root-barrel import reintroduced");
        if (specifier.startsWith("expo-notifications/"))
          visit(
            resolveNative(
              path.join(
                packageRoot,
                specifier.slice("expo-notifications/".length),
              ),
            ),
          );
        else if (specifier.startsWith("."))
          visit(resolveNative(path.resolve(path.dirname(file), specifier)));
      }
    }
    visit(path.join(root, "src/services/reminders.ts"));
    assert(
      [...visited].some((file) =>
        file.endsWith("scheduleNotificationAsync.js"),
      ),
    );
    assert(
      [...visited].some((file) => file.endsWith("NotificationsEmitter.js")),
    );
  }
});
