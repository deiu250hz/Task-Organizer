use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// The window has the default label "main" (the capability file targets the same label).
const MAIN_WINDOW: &str = "main";

// Shared by the tray menu, the tray click and the second-launch callback. Each step returns a
// Result we deliberately ignore: if the window is already gone there is nothing useful to do.
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// A left-click on the tray icon: hide the window if it is on screen, otherwise bring it back.
fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let on_screen = window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false);
        if on_screen {
            let _ = window.hide();
        } else {
            show_main_window(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Never edit a migration that has already run; add a new numbered one instead.
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_settings_table",
            sql: include_str!("../migrations/002_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "shop_items_and_purchase_link",
            sql: include_str!("../migrations/003_shop.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "more_shop_items",
            sql: include_str!("../migrations/004_more_items.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        // Must be registered first. A second launch hands over to this running process and exits;
        // the callback runs HERE, in the first process, and just brings its window forward. This also
        // keeps two processes from ever opening the same SQLite file.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(
            tauri_plugin_sql::Builder::new()
                // Must match the string passed to Database.load() in db.ts.
                .add_migrations("sqlite:tasks.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        // Backups: the Save/Open dialogs, and reading/writing the file the user picked.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // The tray lives in Rust: the menu, the icon and the clicks never touch the webview, so
            // none of this needs a capability entry.
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .tooltip("Tasks Organizer")
                .menu(&menu)
                // Left-click toggles the window (below); the menu opens on right-click.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0), // the only way to really exit, since the X button hides
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Click fires for both press and release; act on the release of the left button only.
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        // The X button in the title bar calls window.close(), which raises CloseRequested here.
        // Cancel it and hide the window instead, so the app keeps running in the tray.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
