use crate::error::{DomainError, DomainResult};
use crate::models::note::{Mood, NoteId};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

/// Journal Date representation in YYYY-MM-DD format
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct JournalDate(pub String);

impl JournalDate {
    pub fn new(date_str: impl Into<String>) -> DomainResult<Self> {
        let s = date_str.into();
        match NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
            Ok(_) => Ok(Self(s)),
            Err(_) => Err(DomainError::InvalidJournalDate(s)),
        }
    }

    pub fn today() -> Self {
        Self(Utc::now().format("%Y-%m-%d").to_string())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Journal Entry domain model
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct JournalEntry {
    pub date: JournalDate,
    pub note_id: NoteId,
    pub mood: Mood,
    pub title: String,
    pub word_count: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl JournalEntry {
    pub fn new(
        date: JournalDate,
        note_id: NoteId,
        title: String,
        mood: Mood,
        word_count: usize,
    ) -> Self {
        let now = Utc::now();
        Self {
            date,
            note_id,
            mood,
            title,
            word_count,
            created_at: now,
            updated_at: now,
        }
    }
}

/// Helper for calculating continuous writing streak
pub struct StreakCalculator;

impl StreakCalculator {
    pub fn calculate_streak(sorted_dates: &[JournalDate]) -> usize {
        if sorted_dates.is_empty() {
            return 0;
        }

        let mut parsed_dates: Vec<NaiveDate> = sorted_dates
            .iter()
            .filter_map(|d| NaiveDate::parse_from_str(d.as_str(), "%Y-%m-%d").ok())
            .collect();
        parsed_dates.sort();
        parsed_dates.dedup();

        if parsed_dates.is_empty() {
            return 0;
        }

        let today = Utc::now().date_naive();
        let yesterday = today.pred_opt().unwrap_or(today);

        let last_date = *parsed_dates.last().unwrap();
        // If the user hasn't written today or yesterday, streak is broken
        if last_date != today && last_date != yesterday {
            return 0;
        }

        let mut streak = 1;
        for i in (0..parsed_dates.len() - 1).rev() {
            let current = parsed_dates[i + 1];
            let prev = parsed_dates[i];
            if current.signed_duration_since(prev).num_days() == 1 {
                streak += 1;
            } else {
                break;
            }
        }

        streak
    }
}
