use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::process::Child;

#[derive(Default)]
pub struct ProcessRegistry {
    inner: Mutex<HashMap<String, Child>>,
}

pub static DOWNLOADS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static CONVERSIONS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static MERGES: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);

impl ProcessRegistry {
    pub fn insert(&self, id: String, child: Child) {
        let mut g = self.inner.lock().unwrap();
        g.insert(id, child);
    }

    pub fn take(&self, id: &str) -> Option<Child> {
        let mut g = self.inner.lock().unwrap();
        g.remove(id)
    }

    pub async fn kill(&self, id: &str) {
        if let Some(mut child) = self.take(id) {
            let _ = child.kill().await;
        }
    }

    pub async fn kill_all(&self) {
        let ids: Vec<String> = {
            let g = self.inner.lock().unwrap();
            g.keys().cloned().collect()
        };
        for id in ids {
            self.kill(&id).await;
        }
    }
}
