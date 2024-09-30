use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    postgres::{PgHasArrayType, PgTypeInfo},
    Postgres, QueryBuilder,
};
use std::str::FromStr;
use uuid::Uuid;

use crate::ops::meta::set_helper;

pub type Bytes = Vec<u8>;

#[derive(Debug, Deserialize, Serialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "JobState", rename_all = "lowercase")]
pub enum JobState {
    Available,
    Running,
    Completed,
    Failed,
    Paused,
}

impl FromStr for JobState {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "available" => Ok(JobState::Available),
            "running" => Ok(JobState::Running),
            "completed" => Ok(JobState::Completed),
            "failed" => Ok(JobState::Failed),
            _ => Err(()),
        }
    }
}

impl PgHasArrayType for JobState {
    fn array_type_info() -> sqlx::postgres::PgTypeInfo {
        // Postgres default naming convention for array types is "_typename"
        PgTypeInfo::with_name("_JobState")
    }
}

// The chunk of data needed to enqueue a job
#[derive(Debug, Deserialize, Serialize, Clone, Eq, PartialEq)]
pub struct JobInit {
    pub team_id: i32,
    pub queue_name: String,
    pub priority: i16,
    pub scheduled: DateTime<Utc>,
    pub function_id: Option<Uuid>,
    pub vm_state: Option<Bytes>,
    pub parameters: Option<Bytes>,
    pub blob: Option<Bytes>,
    pub metadata: Option<Bytes>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct Job {
    // Job metadata
    pub id: Uuid,
    pub team_id: i32,
    pub function_id: Option<Uuid>, // Some jobs might not come from hog, and it doesn't /kill/ use to support that
    pub created: DateTime<Utc>,

    // Queue bookkeeping
    // This will be set for any worker that ever has a job in the "running" state (so any worker that dequeues a job)
    // but I don't want to do the work to encode that in the type system right now - later it should be
    pub lock_id: Option<Uuid>,
    pub last_heartbeat: Option<DateTime<Utc>>,
    pub janitor_touch_count: i16,
    pub transition_count: i16,
    pub last_transition: DateTime<Utc>,

    // Virtual queue components
    pub queue_name: String, // We can have multiple "virtual queues" workers pull from

    // Job availability
    pub state: JobState,
    pub priority: i16, // For sorting "available" jobs. Lower is higher priority
    pub scheduled: DateTime<Utc>,

    // Job data
    pub vm_state: Option<Bytes>, // The state of the VM this job is running on (if it exists)
    // Additional fields a worker can tack onto a job, for e.g. tracking some state across retries
    pub metadata: Option<Bytes>,
    // The actual parameters of the job (function args for a hog function, http request for a fetch function)
    pub parameters: Option<Bytes>,
    pub blob: Option<Bytes>, // An additional, binary, parameter field (for things like fetch request body)
}

// A struct representing a set of updates for a job. Outer none values mean "don't update this field",
// with nested none values meaning "set this field to null" for nullable fields
#[derive(Debug, Deserialize, Serialize)]
pub struct JobUpdate {
    pub lock_id: Uuid, // The ID of the lock acquired when this worker dequeued the job, required for any update to be valid
    pub state: Option<JobState>,
    pub queue_name: Option<String>,
    pub priority: Option<i16>,
    pub scheduled: Option<DateTime<Utc>>,
    pub vm_state: Option<Option<Bytes>>,
    pub metadata: Option<Option<Bytes>>,
    pub parameters: Option<Option<Bytes>>,
    pub blob: Option<Option<Bytes>>,
    #[serde(skip)]
    pub last_heartbeat: Option<DateTime<Utc>>,
}

impl JobUpdate {
    pub fn new(lock_id: Uuid) -> Self {
        Self {
            lock_id,
            state: None,
            queue_name: None,
            priority: None,
            scheduled: None,
            vm_state: None,
            metadata: None,
            parameters: None,
            blob: None,
            last_heartbeat: Some(Utc::now()), // Dequeueing a job always touches the heartbeat
        }
    }
}

// Result of janitor's `delete_completed_and_failed_jobs`
#[derive(sqlx::FromRow, Debug, Serialize, Clone)]
pub struct AggregatedDelete {
    // `last_transition` column truncated to the hour.
    pub hour: DateTime<Utc>,
    pub team_id: i64,
    pub function_id: Option<String>,
    pub state: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct DeleteSet {
    pub deletes: Vec<AggregatedDelete>,
}

impl DeleteSet {
    pub fn new(deletes: Vec<AggregatedDelete>) -> Self {
        Self { deletes }
    }

    pub fn total_completed(&self) -> i64 {
        self.deletes
            .iter()
            .filter(|delete| delete.state == "completed")
            .map(|delete| delete.count)
            .sum()
    }

    pub fn total_failed(&self) -> i64 {
        self.deletes
            .iter()
            .filter(|delete| delete.state == "failed")
            .map(|delete| delete.count)
            .sum()
    }
}

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct JobQuery {
    pub team_id: Option<i32>,
    pub function_id: Option<Uuid>,
    pub state: Option<JobState>,
    pub queue_name: Option<String>,
    pub scheduled_by: Option<DateTime<Utc>>,
    pub limit: Option<u16>,
}

impl JobQuery {
    pub fn builder(&self) -> QueryBuilder<'_, Postgres> {
        const AND: &str = " AND ";
        let mut builder = QueryBuilder::new("SELECT * FROM cyclotron_jobs WHERE ");
        let mut needs_and = false;

        if let Some(team_id) = &self.team_id {
            set_helper(&mut builder, "team_id", AND, team_id, needs_and);
            needs_and = true;
        }

        if let Some(function_id) = &self.function_id {
            set_helper(&mut builder, "function_id", AND, function_id, needs_and);
            needs_and = true;
        }

        if let Some(queue_name) = &self.queue_name {
            set_helper(&mut builder, "queue_name", AND, queue_name, needs_and);
            needs_and = true;
        }

        if let Some(state) = &self.state {
            set_helper(&mut builder, "state", AND, state, needs_and);
            needs_and = true;
        }

        set_helper(
            &mut builder,
            "scheduled",
            AND,
            self.scheduled_by.unwrap_or(Utc::now()),
            needs_and,
        );

        builder.push(format!(" LIMIT {}", self.limit.unwrap_or(100)));

        builder
    }
}
