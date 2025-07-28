// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    avatar_url TEXT,
                    status TEXT DEFAULT 'offline',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER NOT NULL,
                    receiver_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_read BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (sender_id) REFERENCES users (id),
                    FOREIGN KEY (receiver_id) REFERENCES users (id)
                );
                
                CREATE TABLE IF NOT EXISTS contacts (
                    user_id INTEGER NOT NULL,
                    contact_id INTEGER NOT NULL,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, contact_id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (contact_id) REFERENCES users (id)
                );
                
                CREATE TABLE IF NOT EXISTS auth_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_group_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    avatar_url TEXT,
                    member_count INTEGER DEFAULT 0,
                    created_by INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users (id)
                );
                
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT DEFAULT 'member',
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (group_id, user_id),
                    FOREIGN KEY (group_id) REFERENCES groups (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
                
                CREATE TABLE IF NOT EXISTS group_contacts (
                    user_id INTEGER NOT NULL,
                    group_id TEXT NOT NULL,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, group_id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (group_id) REFERENCES groups (id)
                );
                
                CREATE TABLE IF NOT EXISTS group_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id TEXT NOT NULL,
                    sender_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (group_id) REFERENCES groups (id),
                    FOREIGN KEY (sender_id) REFERENCES users (id)
                );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cereals.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
