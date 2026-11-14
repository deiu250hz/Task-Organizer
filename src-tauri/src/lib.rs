use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                // Must match the string passed to Database.load() in db.ts.
                .add_migrations("sqlite:tasks.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
