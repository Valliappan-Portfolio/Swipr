/*
  # Initial Schema Setup for MovieMatch

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users id
      - `name` (text) - user's display name
      - `avatar_url` (text) - user's profile picture
      - `bio` (text) - user's bio
      - `favorite_genres` (text[]) - array of favorite movie genres
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `movie_actions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references profiles.id
      - `movie_id` (integer) - TMDB movie ID
      - `action` (text) - 'like' or 'pass'
      - `created_at` (timestamp)
    
    - `friendships`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references profiles.id
      - `friend_id` (uuid) - references profiles.id
      - `status` (text) - 'pending' or 'accepted'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  avatar_url text,
  bio text,
  favorite_genres text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create movie_actions table
CREATE TABLE movie_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  movie_id integer NOT NULL,
  action text NOT NULL CHECK (action IN ('like', 'pass')),
  created_at timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  friend_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Movie actions policies
CREATE POLICY "Users can view their own movie actions"
  ON movie_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movie actions"
  ON movie_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() IN (user_id, friend_id));

CREATE POLICY "Users can insert friendship requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendship status"
  ON friendships FOR UPDATE
  USING (auth.uid() IN (user_id, friend_id));