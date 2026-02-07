-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Teachers Table
create table teachers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique not null,
  subscription_plan text check (subscription_plan in ('Entry', 'Standard', 'Premium')) default 'Entry',
  created_at timestamp with time zone default now()
);

-- 2. Lessons Table (Scenarios/Templates)
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  title text not null,
  skybox_url text not null, -- URL to 360 image
  system_prompt text not null, -- The "Brain" of the AI for this lesson
  initial_message text, -- What the AI says first
  created_at timestamp with time zone default now()
);

-- 3. Students Table
create table students (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  name text not null,
  access_code text unique not null, -- Simple 4-digit code for VR entry
  created_at timestamp with time zone default now()
);

-- 4. Sessions Table (Analytics)
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  transcript jsonb default '[]'::jsonb, -- Array of message objects {role, text}
  ai_feedback text, -- Generated summary/feedback at end of session
  created_at timestamp with time zone default now()
);
