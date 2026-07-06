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
    pub fn register(&self, id: String) -> Option<oneshot::Receiver<()>> {
        let mut g = self.inner.lock().unwrap();
        if g.contains_key(&id) {
            return None;
        }
        let (tx, rx) = oneshot::channel();
        g.insert(id, tx);
        Some(rx)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duplicate_register_returns_none_and_keeps_first_alive() {
        let reg = ProcessRegistry::default();
        let mut first = reg.register("a".into()).expect("first registers");
        assert!(reg.register("a".into()).is_none());
        assert!(matches!(
            first.try_recv(),
            Err(oneshot::error::TryRecvError::Empty)
        ));
        reg.cancel("a");
        assert!(first.try_recv().is_ok());
    }
}
