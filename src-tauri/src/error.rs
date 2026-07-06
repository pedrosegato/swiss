use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_serializes_as_string_message() {
        let e = AppError::Other("disk full".into());
        let json = serde_json::to_string(&e).unwrap();
        assert_eq!(json, "\"disk full\"");
    }

    #[test]
    fn io_error_is_convertible() {
        let io: std::io::Error = std::io::Error::new(std::io::ErrorKind::NotFound, "x");
        let _ae: AppError = io.into();
    }
}
