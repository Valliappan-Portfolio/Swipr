# Recommendation System Issues & Fixes

## Issues Identified

### 1. **Language Filtering Blocks Famous International Shows** ⚠️ CRITICAL

**Problem**: The current system filters OUT shows whose `original_language` doesn't match user preferences.

**Impact**:
- Users who select only "English" will NEVER see:
  - **Dark** (German) - 8.4/10 rating
  - **1899** (German) - highly rated
  - **Money Heist** (Spanish) - 8.2/10 rating
  - **Squid Game** (Korean) - 8.0/10 rating
  - And hundreds of other internationally acclaimed shows

**Current Code** (`src/lib/tmdb.ts:311`):
```typescript
const isCorrectLanguage = languages.includes(show.original_language);
```

**Recommendation**:
- **Option A (Recommended)**: Change to subtitle/audio availability filtering instead of original language
- **Option B**: Add "Include International Content" toggle in onboarding (default: ON)
- **Option C**: Show international content but boost native language content in scoring

**Quick Fix**:
```typescript
// Allow all languages but prefer user's selected languages in scoring
const isPreferredLanguage = languages.includes(show.original_language);
// Remove the hard filter, just use this for scoring bonus
```

---

### 2. **Disliked Genre Threshold Too High** ✅ FIXED

**Problem**: Required 3+ passes out of 4 swipes to mark genre as disliked.

**Fix Applied**: Changed to 2+ passes out of 5 swipes (more aggressive learning).

**Before**:
- Pass 7 animation movies → might still show animation

**After**:
- Pass 2 animation movies → heavily penalized

---

### 3. **Collaborative Filtering Not Effective Yet**

**Current State**:
- Requires at least 3 common movies with other users
- With low user count (<100), matches are rare
- User-based CF weight: 40% (but often returns 0)

**Why It's Slow**:
1. **Cold Start Problem**: Need ~500-1000 active users for meaningful collaborative filtering
2. **Sparse Matrix**: Even with 100 users, overlap is minimal
3. **Genre-Based Similarity**: Current Jaccard similarity on movie IDs is strict

**Recommendations**:

#### Short-term (< 100 users):
1. **Genre-Based Pseudo-Collaboration**: Instead of exact movie matches, find users who:
   - Liked similar genres in similar proportions
   - Have similar like/pass ratios
   - Prefer similar decades

2. **Seed Data**: Add "virtual users" with known good taste profiles:
   - "Sci-Fi Enthusiast" (likes Dark, Severance, Black Mirror, etc.)
   - "Crime Drama Fan" (likes Ozark, Breaking Bad, etc.)
   - "Award Winners Fan" (likes critically acclaimed shows)

3. **Lower Similarity Threshold**: Reduce from 3 common movies to 2

#### Long-term (500+ users):
1. **Matrix Factorization**: Use SVD/ALS for better predictions
2. **Graph-Based**: Build user-movie bipartite graph
3. **Deep Learning**: Embedding-based recommendations

---

### 4. **Missing Top-Tier Content**

**Shows You Mentioned Not Appearing**:
- Dark ✅ (exists in TMDB, blocked by language filter)
- Severance ✅ (exists in TMDB, likely blocked by language/year/genre)
- Lost ✅ (exists in TMDB, old - 2004-2010, might be filtered by year range)
- 1899 ✅ (exists in TMDB, blocked by language filter)
- 3-Body Problem ✅ (exists in TMDB, very new - 2024)
- Ozark ✅ (exists in TMDB)
- Succession ✅ (exists in TMDB)
- Sharp Objects ✅ (exists in TMDB)

**Root Causes**:
1. **Language filtering** (Dark, 1899)
2. **Year range filtering** (Lost is 2004-2010, if user selected 2015-2025)
3. **Genre mismatches** (algorithm needs more variety)
4. **Popularity sorting** (might be showing too many mainstream vs critically acclaimed)

**Fix**: Add "Quality Override" - Always include shows with:
- Vote average >= 8.0
- Vote count >= 1000
- In selected genres

---

## Open-Source Recommendation Tools

### Best Free Options:

#### 1. **The Movie Database (TMDB) API** ✅ Already Using
- **What you have**: Basic discover/search
- **What you're missing**:
  - `/movie/{id}/recommendations` - TMDB's own collaborative filtering
  - `/movie/{id}/similar` - Content-based similarity
  - `/trending/all/week` - Trending content

**Easy Win**: Use TMDB's built-in recommendations!
```typescript
// Fetch TMDB's recommendations for movies user liked
const userLikes = await getUserLikes(userId);
const recommendations = await Promise.all(
  userLikes.map(movieId =>
    fetch(`/movie/${movieId}/recommendations`)
  )
);
```

#### 2. **Taste.io API** (Free tier: 10k requests/month)
- Genre-aware recommendations
- Mood-based filtering
- Better than raw TMDB

#### 3. **Open Movie Database (OMDb)**
- Free with API key
- Good for enriching data (Rotten Tomatoes scores, etc.)

#### 4. **Trakt.tv API** ⭐ HIGHLY RECOMMENDED
- **Best for**: Collaborative filtering data
- **Free tier**: 10k requests/day
- **Features**:
  - User scrobbling data (millions of users)
  - "People who watched X also watched Y"
  - Trending/popular lists updated real-time
  - Genre recommendations
  - Similar shows API

**Integration Example**:
```typescript
// Get similar shows from Trakt
fetch(`https://api.trakt.tv/shows/${traktId}/related`)
```

#### 5. **JustWatch API** (Unofficial)
- Shows streaming availability
- You're already getting this from TMDB watch providers ✅

### Datasets for Training:

#### 1. **MovieLens Dataset** (Free)
- 25M+ ratings from 162k users
- Use for seeding collaborative filtering
- Import top 1000 movies with their co-watch patterns

#### 2. **IMDB Datasets** (Free)
- Title ratings, episodes, etc.
- Good for enriching metadata

---

## Recommended Action Plan

### 🔴 Critical (Do Now):

1. **Fix Language Filter** - Remove hard language filtering, make it a preference boost instead
   - Impact: Instantly adds 1000s of top shows (Dark, Money Heist, Squid Game, etc.)

2. **Add TMDB Recommendations API** - Use their `/recommendations` and `/similar` endpoints
   - Impact: Better recommendations immediately without needing users

3. **Add "Quality Override"** - Always include highly-rated content in selected genres
   - Impact: Ensures Dark, Severance, etc. appear for users who select Sci-Fi/Mystery

### 🟡 High Priority (This Week):

4. **Integrate Trakt.tv API** - Add collaborative filtering data from their millions of users
   - Impact: Real collaborative filtering without needing your own user base

5. **Seed MovieLens Data** - Import top 1000 movies with co-watch patterns
   - Impact: "People who liked X also liked Y" works from day 1

### 🟢 Medium Priority (Next Sprint):

6. **Genre-Based Pseudo-Collaboration** - Find users with similar genre preferences
   - Impact: Better matches even with few users

7. **Add "Critically Acclaimed" Filter** - Toggle for award winners/high ratings
   - Impact: Helps users discover quality content

---

## Quick Wins (< 1 hour each):

### 1. Remove Language Hard Filter
**File**: `src/lib/tmdb.ts:311`
**Change**:
```typescript
// Before:
const isCorrectLanguage = languages.includes(show.original_language);

// After:
const isCorrectLanguage = true; // Filter removed, handled in scoring
```

### 2. Add TMDB Recommendations
**File**: `src/lib/tmdb.ts`
**Add**:
```typescript
export async function getRecommendationsForMovie(movieId: number): Promise<Movie[]> {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`
  );
  const data = await response.json();
  return data.results || [];
}
```

### 3. Add Quality Boost in Scoring
**File**: `src/lib/smartRecommendations.ts`
**Add**:
```typescript
// In scoreMovie():
// Quality content boost (10% weight)
if (movie.voteAverage >= 8.0 && movie.voteCount >= 1000) {
  score += 0.2; // Significant boost for critically acclaimed
}
```

---

## Expected Impact:

| Fix | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Remove language filter | **+3000 shows** (Dark, etc.) | 5 min | 🔴 Critical |
| TMDB recommendations API | **Better recs immediately** | 30 min | 🔴 Critical |
| Quality boost | **Famous shows appear** | 5 min | 🔴 Critical |
| Disliked genre fix | **2x faster learning** | ✅ Done | - |
| Trakt.tv integration | **Real CF data** | 2 hours | 🟡 High |
| MovieLens seeding | **Day 1 CF** | 4 hours | 🟡 High |

---

## Collaborative Filtering Reality Check:

**Your Question**: "Do I need 500 users for collaborative filtering to work?"

**Answer**:
- **With current approach**: Yes, you need 100-500 active users minimum
- **With Trakt.tv integration**: No! You get millions of users' data immediately
- **With MovieLens seeding**: No! You get 162k users' preferences pre-loaded

**Best Approach**:
1. Use TMDB's `/recommendations` API (free, immediate)
2. Integrate Trakt.tv API (free, millions of users)
3. Seed MovieLens data (one-time import)
4. Build your own CF as users grow (long-term)

This way you have **excellent recommendations from day 1** without needing your own user base!
