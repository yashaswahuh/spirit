-- ============================================================================
-- Spirit: Attendance + Semester Dashboard
-- Supabase PostgreSQL Migration Script
--
-- Tables: profile, grading_scheme, program, term, course, timetable_slot,
--         calendar_event, attendance_record, assessment_component, mark,
--         grade_result, task
--
-- Security & Performance:
-- - UUID Primary Keys (client-generated v4)
-- - Row-Level Security (RLS) enabled on EVERY table
-- - Policies strictly enforce user_id = auth.uid() (No public access)
-- - Composite indexes on (user_id, updated_at) on EVERY table for delta sync
-- - Soft deletes supported via nullable deleted_at
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILE
-- ----------------------------------------------------------------------------
create table if not exists public.profile (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null default '',
    region text not null default 'IN',
    theme text not null default 'system',
    accent text not null default 'indigo',
    default_attendance_threshold numeric not null default 75.0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_profile_user_updated on public.profile (user_id, updated_at);

alter table public.profile enable row level security;

create policy "Users can view their own profile"
    on public.profile for select
    using (auth.uid() = user_id);

create policy "Users can insert their own profile"
    on public.profile for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own profile"
    on public.profile for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own profile"
    on public.profile for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. GRADING SCHEME
-- ----------------------------------------------------------------------------
create table if not exists public.grading_scheme (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    is_preset boolean not null default false,
    scheme_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_grading_scheme_user_updated on public.grading_scheme (user_id, updated_at);

alter table public.grading_scheme enable row level security;

create policy "Users can view their own grading schemes"
    on public.grading_scheme for select
    using (auth.uid() = user_id);

create policy "Users can insert their own grading schemes"
    on public.grading_scheme for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own grading schemes"
    on public.grading_scheme for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own grading schemes"
    on public.grading_scheme for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. PROGRAM
-- ----------------------------------------------------------------------------
create table if not exists public.program (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    degree_type text not null,
    branch_department text not null,
    start_year integer not null,
    duration_years integer not null,
    entry_type text not null default 'regular',
    term_system text not null default 'semester',
    grading_scheme_id uuid references public.grading_scheme(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_program_user_updated on public.program (user_id, updated_at);
create index if not exists idx_program_grading_scheme_id on public.program (grading_scheme_id);

alter table public.program enable row level security;

create policy "Users can view their own programs"
    on public.program for select
    using (auth.uid() = user_id);

create policy "Users can insert their own programs"
    on public.program for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own programs"
    on public.program for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own programs"
    on public.program for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. TERM
-- ----------------------------------------------------------------------------
create table if not exists public.term (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    program_id uuid not null references public.program(id) on delete cascade,
    number integer not null,
    name text not null,
    start_date date not null,
    end_date date not null,
    sgpa numeric,
    status text not null default 'upcoming',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_term_user_updated on public.term (user_id, updated_at);
create index if not exists idx_term_program_id on public.term (program_id);

alter table public.term enable row level security;

create policy "Users can view their own terms"
    on public.term for select
    using (auth.uid() = user_id);

create policy "Users can insert their own terms"
    on public.term for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own terms"
    on public.term for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own terms"
    on public.term for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. COURSE
-- ----------------------------------------------------------------------------
create table if not exists public.course (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    term_id uuid not null references public.term(id) on delete cascade,
    name text not null,
    code text not null default '',
    credits numeric not null default 3.0,
    type text not null default 'theory',
    counts_toward_gpa boolean not null default true,
    attendance_threshold_override numeric,
    color text not null default '#3b82f6',
    medical_counts_as_present boolean not null default false,
    duty_leave_counts_as_present boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_course_user_updated on public.course (user_id, updated_at);
create index if not exists idx_course_term_id on public.course (term_id);

alter table public.course enable row level security;

create policy "Users can view their own courses"
    on public.course for select
    using (auth.uid() = user_id);

create policy "Users can insert their own courses"
    on public.course for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own courses"
    on public.course for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own courses"
    on public.course for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. TIMETABLE SLOT
-- ----------------------------------------------------------------------------
create table if not exists public.timetable_slot (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid not null references public.course(id) on delete cascade,
    weekday smallint not null,
    start_time time not null,
    end_time time not null,
    room text,
    component_type text not null default 'theory',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_timetable_slot_user_updated on public.timetable_slot (user_id, updated_at);
create index if not exists idx_timetable_slot_course_id on public.timetable_slot (course_id);

alter table public.timetable_slot enable row level security;

create policy "Users can view their own timetable slots"
    on public.timetable_slot for select
    using (auth.uid() = user_id);

create policy "Users can insert their own timetable slots"
    on public.timetable_slot for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own timetable slots"
    on public.timetable_slot for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own timetable slots"
    on public.timetable_slot for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. CALENDAR EVENT
-- ----------------------------------------------------------------------------
create table if not exists public.calendar_event (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    type text not null,
    swap_target_weekday smallint,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_calendar_event_user_updated on public.calendar_event (user_id, updated_at);
create index if not exists idx_calendar_event_date on public.calendar_event (date);

alter table public.calendar_event enable row level security;

create policy "Users can view their own calendar events"
    on public.calendar_event for select
    using (auth.uid() = user_id);

create policy "Users can insert their own calendar events"
    on public.calendar_event for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own calendar events"
    on public.calendar_event for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own calendar events"
    on public.calendar_event for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8. ATTENDANCE RECORD
-- ----------------------------------------------------------------------------
create table if not exists public.attendance_record (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid not null references public.course(id) on delete cascade,
    date date not null,
    slot_id uuid references public.timetable_slot(id) on delete set null,
    status text not null,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_attendance_record_user_updated on public.attendance_record (user_id, updated_at);
create index if not exists idx_attendance_record_course_date on public.attendance_record (course_id, date);

alter table public.attendance_record enable row level security;

create policy "Users can view their own attendance records"
    on public.attendance_record for select
    using (auth.uid() = user_id);

create policy "Users can insert their own attendance records"
    on public.attendance_record for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own attendance records"
    on public.attendance_record for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own attendance records"
    on public.attendance_record for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 9. ASSESSMENT COMPONENT
-- ----------------------------------------------------------------------------
create table if not exists public.assessment_component (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid not null references public.course(id) on delete cascade,
    name text not null,
    max_marks numeric not null,
    weightage numeric not null default 0,
    rule text not null default 'normal',
    rule_group text,
    rule_params jsonb,
    is_end_sem boolean not null default false,
    min_pass_marks numeric,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_assessment_component_user_updated on public.assessment_component (user_id, updated_at);
create index if not exists idx_assessment_component_course_id on public.assessment_component (course_id);

alter table public.assessment_component enable row level security;

create policy "Users can view their own assessment components"
    on public.assessment_component for select
    using (auth.uid() = user_id);

create policy "Users can insert their own assessment components"
    on public.assessment_component for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own assessment components"
    on public.assessment_component for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own assessment components"
    on public.assessment_component for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 10. MARK
-- ----------------------------------------------------------------------------
create table if not exists public.mark (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    component_id uuid not null references public.assessment_component(id) on delete cascade,
    obtained_marks numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_mark_user_updated on public.mark (user_id, updated_at);
create index if not exists idx_mark_component_id on public.mark (component_id);

alter table public.mark enable row level security;

create policy "Users can view their own marks"
    on public.mark for select
    using (auth.uid() = user_id);

create policy "Users can insert their own marks"
    on public.mark for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own marks"
    on public.mark for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own marks"
    on public.mark for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 11. GRADE RESULT
-- ----------------------------------------------------------------------------
create table if not exists public.grade_result (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid not null references public.course(id) on delete cascade,
    letter_grade text,
    grade_points numeric,
    attempt_number integer not null default 1,
    is_passing boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_grade_result_user_updated on public.grade_result (user_id, updated_at);
create index if not exists idx_grade_result_course_id on public.grade_result (course_id);

alter table public.grade_result enable row level security;

create policy "Users can view their own grade results"
    on public.grade_result for select
    using (auth.uid() = user_id);

create policy "Users can insert their own grade results"
    on public.grade_result for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own grade results"
    on public.grade_result for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own grade results"
    on public.grade_result for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 12. TASK
-- ----------------------------------------------------------------------------
create table if not exists public.task (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    type text not null default 'other',
    due_at timestamptz,
    course_id uuid references public.course(id) on delete set null,
    done boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_task_user_updated on public.task (user_id, updated_at);
create index if not exists idx_task_course_id on public.task (course_id);

alter table public.task enable row level security;

create policy "Users can view their own tasks"
    on public.task for select
    using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
    on public.task for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
    on public.task for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
    on public.task for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 13. TIMETABLE VERSION (Phase 3)
-- ----------------------------------------------------------------------------
create table if not exists public.timetable_version (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    term_id uuid not null references public.term(id) on delete cascade,
    name text not null,
    effective_from date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_timetable_version_user_updated on public.timetable_version (user_id, updated_at);
create index if not exists idx_timetable_version_term_id on public.timetable_version (term_id);

alter table public.timetable_version enable row level security;

create policy "Users can view their own timetable versions"
    on public.timetable_version for select
    using (auth.uid() = user_id);

create policy "Users can insert their own timetable versions"
    on public.timetable_version for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own timetable versions"
    on public.timetable_version for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own timetable versions"
    on public.timetable_version for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 14. TIMETABLE OVERRIDE (Phase 3)
-- ----------------------------------------------------------------------------
create table if not exists public.timetable_override (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    term_id uuid not null references public.term(id) on delete cascade,
    date date not null,
    action text not null check (action in ('cancel', 'substitute', 'extra', 'reschedule')),
    original_slot_id uuid references public.timetable_slot(id) on delete set null,
    course_id uuid not null references public.course(id) on delete cascade,
    start_time text not null,
    end_time text not null,
    room text,
    faculty text,
    component_type text not null default 'theory',
    weight integer not null default 1,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists idx_timetable_override_user_updated on public.timetable_override (user_id, updated_at);
create index if not exists idx_timetable_override_date on public.timetable_override (date);

alter table public.timetable_override enable row level security;

create policy "Users can view their own timetable overrides"
    on public.timetable_override for select
    using (auth.uid() = user_id);

create policy "Users can insert their own timetable overrides"
    on public.timetable_override for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own timetable overrides"
    on public.timetable_override for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own timetable overrides"
    on public.timetable_override for delete
    using (auth.uid() = user_id);

