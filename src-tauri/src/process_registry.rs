use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::oneshot;

#[derive(Default)]
pub struct ProcessRegistry {
    inner: Mutex<HashMap<String, oneshot::Sender<()>>>,
}

pub static DOWNLOADS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static CONVERSIONS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static MERGES: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);

impl ProcessRegistry {
    pub fn register(&self, id: String) -> oneshot::Receiver<()> {
        let (tx, rx) = oneshot::channel();
        let mut g = self.inner.lock().unwrap();
        g.insert(id, tx);
        rx
    }

    pub fn cancel(&self, id: &str) {
        let mut g = self.inner.lock().unwrap();
        if let Some(tx) = g.remove(id) {
            let _ = tx.send(());
        }
    }

    pub fn cancel_all(&self) {
        let mut g = self.inner.lock().unwrap();
        for (_, tx) in g.drain() {
            let _ = tx.send(());
        }
    }

    pub fn remove(&self, id: &str) {
        let mut g = self.inner.lock().unwrap();
        g.remove(id);
    }
}
