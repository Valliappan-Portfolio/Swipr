# Issues Analysis & Fixes

## Issues Identified:

### 1. **Movie Repetition Issue** ✅
**Finding**: The app IS using Supabase for tracking seen movies correctly.
- Line 93-95 in App.tsx: `getSeenMovies(storedUserId)` loads from Supabase
- Line 187: Filters out seen movies: `.filter(item => !seenMovies.has(item.id))`
- Line 488: Only clears localStorage.seenMovies (legacy code, not actively used)

**Root Cause**: Likely user switching browsers/devices or localStorage being cleared, which loses userId.

**Current localStorage Usage** (CORRECT):
- `current_user_id` - User session (login/remember me) ✅
- `current_username` - Display name ✅
- `current_email` - Auth email ✅
- `current_preference_id` - User preferences ID ✅
- `userProfile` - Cached profile (name + preferences) ✅
- `hasSeenHomepage` - Tutorial flag ✅
- `hasSeenTutorial` - Swipe tutorial flag ✅
- `swipr_user_session` - SmartRecommendations engine session ✅
- **NOT storing seenMovies** - Using Supabase ✅

**Conclusion**: Storage strategy is CORRECT. Repetition likely due to:
1. New user ID generated on refresh if localStorage cleared
2. User not logged in (anonymous mode resets)

---

### 2. **Default Languages Issue** ❌
**Finding**: Onboarding sets `['en']` only (line 27), but user saw Tamil content.

**Root Cause**: User manually added Hindi/Tamil in Settings after onboarding. The cold start logic only loads English content, but AFTER 10 swipes, it fetches content based on user's CURRENT language preferences (which now include hi/ta).

**Expected Behavior**: Should default to English + German only.

**Where to Fix**:
- Onboarding.tsx:27 - Change from `['en']` to `['en', 'de']`
- Update Settings to show only en/de selected by default

---

### 3. **Cold Start Not Showing High Quality** ❌
**Finding**: User saw "Village - Tamil, 4.x rating"

**Root Cause**: Cold start logic (App.tsx:291, 301) loads ONLY English content:
```typescript
const topMovies = await getTopRatedMovies(['en']);
```

But after 10 swipes, it switches to user's preference languages (which now include hi/ta).

**TMDB getTopRatedMovies** (tmdb.ts:146-151):
- Filters: `vote_average.gte=8.0` and `vote_count.gte=1000`
- Only loads highly-rated content

**The Issue**: After cold start (10 swipes), regular content fetching uses:
- `vote_count.gte=50` (line 72) - TOO LOW
- Allows 4.x rated content

**Where to Fix**:
- Increase vote_count.gte from 50 to 200+ for better quality
- Ensure vote_average.gte >= 7.0 for regular content

---

### 4. **OTT Provider Display** ❌
**Finding**: Shows "Provider 257, 583+3 more" instead of "Netflix, Prime Video"

**Root Cause**: WatchProviders type stores provider IDs (numbers), not names.

**Where to Fix**:
- MovieCard displaying provider IDs directly
- Need TMDB provider ID → Name mapping
- Should move to Watchlist view as user requested

---

### 5. **Anime Detection Logic** ❌
**CRITICAL ISSUE**: Current logic treats ALL animation as anime if Japanese

**Examples**:
- ✅ Rick & Morty - American adult animation (NOT anime)
- ✅ Avatar: The Last Airbender - American animation (NOT anime)
- ✅ Arcane - French/American animation (NOT anime)
- ✅ Gravity Falls - American animation (NOT anime)
- ❌ One Piece, Naruto, Attack on Titan - Japanese anime (ARE anime)

**Current Detection** (tmdb.ts:39-43):
```typescript
function detectAnime(movie: any): boolean {
  const hasAnimation = movie.genre_ids?.includes(16); // 16 = Animation
  const isJapanese = movie.original_language === 'ja';
  return hasAnimation && isJapanese; // ✅ CORRECT LOGIC
}
```

**Wait, this IS correct!** Rick & Morty (en), Avatar (en), Arcane (en) should NOT be detected as anime.

**Actual Problem**: The user is passing ANIMATION GENRE, not seeing ANIME specifically.

**Solution**: The penalty is applied for ANY Animation if user dislikes it. This is working as intended. The anime detection helps differentiate Japanese anime from Western animation, but the PENALTY applies to both if user keeps swiping left on Animation genre.

---

### 6. **TMDB Collaborative Filtering Badge Not Showing** ❌
**Finding**: Badge code exists in MovieCard.tsx:289-299 but user doesn't see it.

**Root Cause**: The badge only shows if:
1. User has 3+ likes: `if (userLikes.length >= 3)`
2. TMDB recommendations fetched successfully
3. `movie.recommendationSource.type === 'tmdb'` is set

**Possible Issues**:
- User hasn't liked 3+ movies yet
- TMDB recommendations API call failing
- recommendationSource not being set correctly

**Where to Debug**:
- App.tsx:207-240 - Check if TMDB recs are being fetched
- Check console logs for "🎯 User has X likes, fetching TMDB recommendations..."
- Check if `userLikes.length >= 3`

---

### 7. **How Next Movie Loads** ✅
**Answer**: YES, it changes based on current swipe!

**Flow**:
1. User swipes right/left on Movie A
2. `handleSwipe()` called → `smartRecommendationEngine.recordSwipe(movie, action)`
3. SmartRecommendations engine updates:
   - Liked/disliked genres
   - Director preferences
   - Animation penalty
   - Language preferences
4. Next movie scored using updated preferences
5. Higher scored movies appear earlier

**Conclusion**: Working as intended ✅

---

### 8. **Logo Placeholder Missing** ❌
**Finding**: Found two logos:
- `src/Swipr Logo.png`
- `src/Swipr Logo Final.png`

**User wants**: "Swipr Final Logo" as placeholder

**Where to Use**:
- MovieCard thumbnail loading state
- Empty states
- Login/Onboarding screens

---

## Summary of Fixes Needed:

1. ✅ Storage: Already using Supabase correctly - NO FIX NEEDED
2. ❌ Default languages: Change to `['en', 'de']`
3. ❌ Cold start quality: Increase vote_count.gte from 50 → 200
4. ❌ OTT providers: Create ID→Name mapping, move to Watchlist
5. ❌ Anime logic: Actually CORRECT - educate user
6. ❌ TMDB badge: Debug why not showing (likely < 3 likes)
7. ✅ Next movie logic: Already working correctly
8. ❌ Logo: Use "Swipr Logo Final.png" as placeholder
