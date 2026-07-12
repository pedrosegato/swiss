use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use tokio::sync::oneshot;

#[derive(Default)]
pub struct ProcessRegistry {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    senders: HashMap<String, oneshot::Sender<()>>,
    pending_cancel: HashSet<String>,
}

pub static DOWNLOADS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static CONVERSIONS: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);
pub static MERGES: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::default);

impl ProcessRegistry {
    pub fn register(&self, id: String) -> Option<oneshot::Receiver<()>> {
        let mut g = self.inner.lock().unwrap();
        if g.senders.contains_key(&id) {
            return None;
        }
        if g.pending_cancel.remove(&id) {
            let (tx, rx) = oneshot::channel();
            let _ = tx.send(());
            return Some(rx);
        }
        let (tx, rx) = oneshot::channel();
        g.senders.insert(id, tx);
        Some(rx)
    }

    pub fn cancel(&self, id: &str) {
        let mut g = self.inner.lock().unwrap();
        if let Some(tx) = g.senders.remove(id) {
            let _ = tx.send(());
        } else {
            g.pending_cancel.insert(id.to_string());
        }
    }

    pub fn cancel_all(&self) {
        let mut g = self.inner.lock().unwrap();
        for (_, tx) in g.senders.drain() {
            let _ = tx.send(());
        }
        g.pending_cancel.clear();
    }

    pub fn remove(&self, id: &str) {
        let mut g = self.inner.lock().unwrap();
        g.senders.remove(id);
        g.pending_cancel.remove(id);
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

    #[test]
    fn cancel_before_register_fires_immediately_on_register() {
        let reg = ProcessRegistry::default();
        reg.cancel("a");
        let mut rx = reg.register("a".into()).expect("registers with fired receiver");
        assert!(rx.try_recv().is_ok());
    }

    #[test]
    fn remove_clears_tombstone() {
        let reg = ProcessRegistry::default();
        reg.cancel("a");
        reg.remove("a");
        let mut rx = reg.register("a".into()).expect("registers fresh");
        assert!(matches!(
            rx.try_recv(),
            Err(oneshot::error::TryRecvError::Empty)
        ));
    }
}
